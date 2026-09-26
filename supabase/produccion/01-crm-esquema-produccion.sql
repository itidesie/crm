-- ════════════════════════════════════════════════════════════════════════════════════
--  IDESIE CRM · esquema `crm` para PRODUCCIÓN  (migraciones 037 → 041 en un solo script)
--
--  Cómo usarlo:  Supabase → SQL Editor → pega TODO este archivo → Run.
--  · Es aditivo: solo CREA el esquema `crm`, dos roles internos y permisos de LECTURA sobre
--    algunas tablas de la web. No modifica ni borra datos ni tablas de `public`.
--  · Si falta algo previo (tablas de la web / migraciones 034–036) se detiene al principio con
--    un mensaje claro y no cambia nada.
--  · No lo ejecutes dos veces: la segunda vez fallará con «already exists» (no rompe nada).
--  · Después: 1) Settings → API → Exposed schemas → añade `crm`; 2) ejecuta 02-alta-admin.sql.
-- ════════════════════════════════════════════════════════════════════════════════════

-- ── 0) Comprobación de requisitos previos ────────────────────────────────────────────
do $$
declare faltan text := '';
        t text;
begin
  foreach t in array array['leads','solicitudes_admision','mensajes_contacto','descargas_catalogo',
                           'candidaturas_empleo','orders','order_items','solicitudes_baja'] loop
    if to_regclass('public.' || t) is null then faltan := faltan || ' · tabla public.' || t || E'\n'; end if;
  end loop;
  if to_regclass('public.mensajes_contacto') is not null and not exists (
       select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mensajes_contacto' and column_name = 'telefono') then
    faltan := faltan || E' · columna public.mensajes_contacto.telefono (migración 034)\n';
  end if;
  if faltan <> '' then
    raise exception E'Faltan requisitos de la web (aplica antes las migraciones 034, 035 y 036 de WebIdesie/scripts):\n%', faltan;
  end if;
  if to_regnamespace('crm') is not null then
    raise exception 'El esquema crm ya existe: este script ya se ejecutó (o se ejecutó a medias). Revísalo antes de repetirlo.';
  end if;
end $$;


-- ══════════════ 037_db_roles_y_esquemas.sql ══════════════

-- 037 · Esquemas y roles (docs/diseno-crm.md §2, §3)
--
-- · `crm`     : esquema propio del CRM (dueño: crm_owner).
-- · `api_web` : contrato de funciones/vistas que usará la web (fases posteriores).
-- · public    : sigue siendo de la web. Aquí solo se le QUITAN los permisos por defecto
--               de Supabase a anon/authenticated (la web usa service_role, que no se ve afectada).
--
-- Los roles login (web_app, crm_worker) se crean SIN contraseña: no pueden autenticarse
-- hasta que se les asigne una explícitamente (nunca se versionan contraseñas).

create schema if not exists crm;
create schema if not exists api_web;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'crm_owner') then
    create role crm_owner nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'web_app') then
    create role web_app login noinherit connection limit 30;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'crm_worker') then
    create role crm_worker login noinherit connection limit 10;
  end if;
end $$;

grant crm_owner to postgres;
alter schema crm owner to crm_owner;
alter schema api_web owner to crm_owner;
alter role web_app set statement_timeout = '5s';
alter role crm_worker set statement_timeout = '60s';

-- 1) (OMITIDO EN PRODUCCIÓN) Endurecimiento de `public` para anon/authenticated.
--    Cambia permisos de las tablas de la WEB y no hace falta para el CRM. Se puede aplicar más
--    adelante, por separado y con la web probada. Contenido original:
-- -- 1) public: quitar los permisos por defecto de Supabase a anon/authenticated
-- revoke all on all tables    in schema public from anon, authenticated;
-- revoke all on all sequences in schema public from anon, authenticated;
-- revoke execute on all functions in schema public from public, anon, authenticated;
-- alter default privileges in schema public revoke all on tables    from anon, authenticated;
-- alter default privileges in schema public revoke all on sequences from anon, authenticated;
-- alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
--
-- -- (los objetos de public que crea supabase_admin siguen su propia regla; se intenta igual)
-- do $$
-- begin
--   execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated';
--   execute 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated';
--   execute 'alter default privileges for role supabase_admin in schema public revoke execute on functions from public, anon, authenticated';
-- exception when others then
--   raise notice 'alter default privileges for supabase_admin omitido: %', sqlerrm;
-- end $$;

-- 2) crm y api_web: nada para anon; las funciones nuevas no son ejecutables por PUBLIC
revoke all on schema crm     from public, anon;
revoke all on schema api_web from public, anon, authenticated;
alter default privileges in schema crm     revoke execute on functions from public;
alter default privileges in schema api_web revoke execute on functions from public;

-- 3) Uso del esquema crm por el CRM (los permisos por tabla se dan en 039)
grant usage on schema crm to authenticated, crm_worker;
grant usage on schema crm to authenticator;   -- PostgREST cambia de rol desde authenticator

-- 4) crm_owner (dueño de las funciones "security definer") lee las tablas de la web
grant usage on schema public to crm_owner;
grant select on public.leads, public.solicitudes_admision, public.mensajes_contacto,
                public.descargas_catalogo, public.candidaturas_empleo,
                public.orders, public.order_items, public.solicitudes_baja to crm_owner;

-- ══════════════ 038_crm_nucleo.sql ══════════════

-- 038 · Núcleo del CRM (docs/diseno-crm.md §4, §5)

create function crm.normalizar_email(t text) returns text
language sql immutable as $$ select lower(btrim(t)) $$;

-- Usuario de la sesión actual. Equivale a auth.uid() (mismo claim JWT) pero SIN depender del esquema
-- `auth`, al que el rol crm_owner (dueño de las funciones "security definer") no tiene acceso.
create function crm.uid() returns uuid
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;

create function crm.tg_actualizado_at() returns trigger language plpgsql as $$
begin new.actualizado_at = now(); return new; end $$;

-- ── Usuarios del CRM (ligados a Supabase Auth) ───────────────────────────────
create table crm.usuarios (
  id        uuid primary key references auth.users(id) on delete cascade,
  nombre    text not null,
  email     text,
  rol       text not null check (rol in ('admin', 'comercial', 'lectura')),
  activo    boolean not null default true,
  creado_at timestamptz not null default now()
);

-- ── Contactos: identidad = email normalizado (crm.contacto_emails) ───────────
create table crm.contactos (
  id                 uuid primary key default gen_random_uuid(),
  email_principal    text not null,
  nombre             text,
  telefono           text,
  telefono_digitos   text generated always as (nullif(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), '')) stored,
  pais               text,
  ciudad             text,
  propietario_id     uuid references crm.usuarios(id) on delete set null,
  origen_primero     text,
  no_contactar       boolean not null default false,
  baja_solicitada_at timestamptz,
  suprimido_at       timestamptz,
  fusionado_en       uuid references crm.contactos(id),
  creado_at          timestamptz not null default now(),
  actualizado_at     timestamptz not null default now()
);
create index on crm.contactos (propietario_id);
create index on crm.contactos (telefono_digitos);
create trigger contactos_actualizado_at before update on crm.contactos
  for each row execute function crm.tg_actualizado_at();

create table crm.contacto_emails (
  email_normalizado text primary key,
  contacto_id       uuid not null references crm.contactos(id) on delete cascade,
  principal         boolean not null default false
);
create unique index on crm.contacto_emails (contacto_id) where principal;

-- ── Entradas: todo lo que llega por la web + su estado de gestión ────────────
create table crm.entradas (
  id           uuid primary key default gen_random_uuid(),
  contacto_id  uuid not null references crm.contactos(id) on delete cascade,
  fuente_tabla text not null check (fuente_tabla in ('leads', 'solicitudes_admision', 'mensajes_contacto',
                     'descargas_catalogo', 'candidaturas_empleo', 'orders', 'solicitudes_baja')),
  fuente_id    text not null,          -- text: orders.id es integer, el resto uuid
  tipo         text not null check (tipo in ('lead_legacy', 'solicitud_admision', 'mensaje_contacto',
                     'descarga_catalogo', 'candidatura', 'pedido', 'baja', 'cita')),
  programa     text,
  recibido_at  timestamptz not null,
  estado       text not null default 'nueva' check (estado in ('nueva', 'en_gestion', 'gestionada', 'descartada')),
  asignado_a   uuid references crm.usuarios(id) on delete set null,
  leida_at     timestamptz,
  leida_por    uuid references crm.usuarios(id) on delete set null,
  payload      jsonb not null default '{}'::jsonb,
  creado_at    timestamptz not null default now(),
  unique (fuente_tabla, fuente_id)
);
create index on crm.entradas (recibido_at desc);
create index on crm.entradas (estado);
create index on crm.entradas (contacto_id);
create index on crm.entradas (tipo);

-- ── Pipelines y etapas (configurables) ───────────────────────────────────────
create table crm.pipelines (
  id     uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  activo boolean not null default true
);
create table crm.etapas (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references crm.pipelines(id) on delete cascade,
  nombre      text not null,
  orden       integer not null,
  tipo        text not null default 'abierta' check (tipo in ('abierta', 'ganada', 'perdida')),
  unique (pipeline_id, orden),
  unique (pipeline_id, nombre)
);

insert into crm.pipelines (codigo, nombre) values ('admision', 'Admisión'), ('empleo', 'Empleo');
insert into crm.etapas (pipeline_id, nombre, orden, tipo)
select p.id, e.nombre, e.orden, e.tipo
from crm.pipelines p
join (values
  ('admision', 'Nuevo',                        1, 'abierta'),
  ('admision', 'Contactado',                   2, 'abierta'),
  ('admision', 'Sesión informativa agendada',  3, 'abierta'),
  ('admision', 'Sesión realizada',             4, 'abierta'),
  ('admision', 'Solicitud recibida',           5, 'abierta'),
  ('admision', 'Entrevista/Revisión',          6, 'abierta'),
  ('admision', 'Admitido',                     7, 'abierta'),
  ('admision', 'Matriculado',                  8, 'ganada'),
  ('admision', 'Perdido',                      9, 'perdida'),
  ('admision', 'Descartado',                  10, 'perdida'),
  ('empleo',   'Recibida',                     1, 'abierta'),
  ('empleo',   'En revisión',                  2, 'abierta'),
  ('empleo',   'Contactada',                   3, 'abierta'),
  ('empleo',   'Archivada',                    4, 'perdida')
) as e(codigo, nombre, orden, tipo) on e.codigo = p.codigo;

-- ── Oportunidades ────────────────────────────────────────────────────────────
create table crm.oportunidades (
  id                uuid primary key default gen_random_uuid(),
  contacto_id       uuid not null references crm.contactos(id) on delete cascade,
  pipeline_id       uuid not null references crm.pipelines(id),
  etapa_id          uuid not null references crm.etapas(id),
  programa          text,
  titulo            text not null,
  propietario_id    uuid references crm.usuarios(id) on delete set null,
  valor             numeric(10, 2),
  entrada_origen_id uuid unique references crm.entradas(id) on delete set null,
  cerrada_at        timestamptz,
  motivo_perdida    text,
  creado_at         timestamptz not null default now(),
  actualizado_at    timestamptz not null default now()
);
create index on crm.oportunidades (contacto_id);
create index on crm.oportunidades (pipeline_id, etapa_id);
create trigger oportunidades_actualizado_at before update on crm.oportunidades
  for each row execute function crm.tg_actualizado_at();

-- ── Notas, actividades (historial INMUTABLE), tareas, etiquetas, consentimientos ─
create table crm.notas (
  id             uuid primary key default gen_random_uuid(),
  contacto_id    uuid not null references crm.contactos(id) on delete cascade,
  oportunidad_id uuid references crm.oportunidades(id) on delete set null,
  autor_id       uuid references crm.usuarios(id) on delete set null,
  texto          text not null check (length(btrim(texto)) > 0),
  creado_at      timestamptz not null default now()
);
create index on crm.notas (contacto_id, creado_at desc);

create table crm.actividades (
  id             uuid primary key default gen_random_uuid(),
  contacto_id    uuid references crm.contactos(id) on delete cascade,
  oportunidad_id uuid references crm.oportunidades(id) on delete set null,
  entrada_id     uuid references crm.entradas(id) on delete set null,
  usuario_id     uuid references crm.usuarios(id) on delete set null,   -- NULL = sistema / proceso automático
  tipo           text not null check (tipo in ('entrada_web', 'nota', 'llamada', 'email', 'cita', 'cambio_etapa',
                    'cambio_estado', 'asignacion', 'tarea', 'contacto', 'baja', 'sistema')),
  titulo         text not null,
  datos          jsonb not null default '{}'::jsonb,
  ocurrio_at     timestamptz not null default now()
);
create index on crm.actividades (contacto_id, ocurrio_at desc);
create index on crm.actividades (ocurrio_at desc);

create table crm.tareas (
  id             uuid primary key default gen_random_uuid(),
  contacto_id    uuid references crm.contactos(id) on delete cascade,
  oportunidad_id uuid references crm.oportunidades(id) on delete set null,
  entrada_id     uuid references crm.entradas(id) on delete set null,
  asignado_a     uuid references crm.usuarios(id) on delete set null,
  titulo         text not null,
  descripcion    text,
  vence_at       timestamptz,
  completada_at  timestamptz,
  creado_por     uuid references crm.usuarios(id) on delete set null,
  creado_at      timestamptz not null default now()
);
create index on crm.tareas (asignado_a) where completada_at is null;
create index on crm.tareas (vence_at) where completada_at is null;

create table crm.etiquetas (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique
);
create table crm.contacto_etiquetas (
  contacto_id uuid not null references crm.contactos(id) on delete cascade,
  etiqueta_id uuid not null references crm.etiquetas(id) on delete cascade,
  primary key (contacto_id, etiqueta_id)
);

create table crm.consentimientos (
  id            uuid primary key default gen_random_uuid(),
  contacto_id   uuid not null references crm.contactos(id) on delete cascade,
  tipo          text not null check (tipo in ('privacidad', 'marketing')),
  concedido     boolean not null default true,
  otorgado_at   timestamptz not null,
  texto_version text,
  origen        text,
  fuente_tabla  text,
  fuente_id     text,
  revocado_at   timestamptz,
  unique (fuente_tabla, fuente_id, tipo)
);
create index on crm.consentimientos (contacto_id);

-- ── Vistas de lectura (security_invoker: respetan la RLS de quien consulta) ──
create view crm.v_bandeja with (security_invoker = true) as
select e.id, e.contacto_id, e.tipo, e.programa, e.recibido_at, e.estado, e.asignado_a, e.leida_at, e.payload,
       c.nombre as contacto_nombre, c.email_principal as contacto_email, c.telefono as contacto_telefono,
       c.no_contactar,
       lower(coalesce(c.nombre, '') || ' ' || c.email_principal || ' ' || coalesce(c.telefono, '')) as busqueda
from crm.entradas e
join crm.contactos c on c.id = e.contacto_id;

create view crm.v_contactos with (security_invoker = true) as
select c.*,
       (select count(*) from crm.entradas e where e.contacto_id = c.id)                 as n_entradas,
       (select max(e.recibido_at) from crm.entradas e where e.contacto_id = c.id)       as ultima_entrada_at,
       lower(coalesce(c.nombre, '') || ' ' || c.email_principal || ' ' || coalesce(c.telefono, '')) as busqueda
from crm.contactos c
where c.fusionado_en is null;

grant execute on function crm.uid() to authenticated, crm_owner;

-- ── Propiedad: todo lo de crm es de crm_owner ────────────────────────────────
do $$
declare r record;
begin
  -- crm.usuarios se queda como propiedad de postgres a propósito: su clave foránea hacia auth.users
  -- se comprueba con los permisos del dueño de la tabla, y crm_owner no puede acceder al esquema auth.
  for r in select tablename from pg_tables where schemaname = 'crm' and tablename <> 'usuarios' loop
    execute format('alter table crm.%I owner to crm_owner', r.tablename);
  end loop;
  grant select, references on crm.usuarios to crm_owner;
  for r in select viewname from pg_views where schemaname = 'crm' loop
    execute format('alter view crm.%I owner to crm_owner', r.viewname);
  end loop;
  for r in select p.oid::regprocedure::text as sig from pg_proc p where p.pronamespace = 'crm'::regnamespace loop
    execute format('alter function %s owner to crm_owner', r.sig);
  end loop;
end $$;

-- ══════════════ 039_crm_rls.sql ══════════════

-- 039 · Permisos y RLS del CRM (docs/diseno-crm.md §3.5, §6, decisión #7)
--
-- Los permisos se aplican EN LA BASE DE DATOS (RLS + GRANT por columna), no solo ocultando botones.
-- Roles: admin · comercial · lectura (crm.usuarios.rol).
--   · admin     → todo.
--   · comercial → ve todo; edita contactos/oportunidades/tareas/entradas SOLO si están sin asignar
--                 o asignados a él (decisión #7: «ve todo, edita solo lo asignado»).
--   · lectura   → solo SELECT.
-- Sin ningún permiso: DELETE (borrado de personas solo por función de supresión, fase posterior),
-- ni INSERT/UPDATE sobre actividades (el historial solo lo escriben los triggers).

create function crm.rol_actual() returns text
language sql stable security definer set search_path = ''
as $$ select u.rol from crm.usuarios u where u.id = (select crm.uid()) and u.activo $$;

create function crm.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select crm.rol_actual()) = 'admin', false) $$;

-- ¿Puede el usuario actual editar un registro cuyo propietario/asignado es p_dueno?
create function crm.puede_editar(p_dueno uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case (select crm.rol_actual())
           when 'admin'     then true
           when 'comercial' then p_dueno is null or p_dueno = (select crm.uid())
           else false
         end
$$;

revoke execute on function crm.rol_actual(), crm.es_admin(), crm.puede_editar(uuid) from public, anon;
grant  execute on function crm.rol_actual(), crm.es_admin(), crm.puede_editar(uuid) to authenticated;

-- ── RLS activada en TODAS las tablas ─────────────────────────────────────────
alter table crm.usuarios            enable row level security;
alter table crm.contactos           enable row level security;
alter table crm.contacto_emails     enable row level security;
alter table crm.entradas            enable row level security;
alter table crm.pipelines           enable row level security;
alter table crm.etapas              enable row level security;
alter table crm.oportunidades       enable row level security;
alter table crm.notas               enable row level security;
alter table crm.actividades         enable row level security;
alter table crm.tareas              enable row level security;
alter table crm.etiquetas           enable row level security;
alter table crm.contacto_etiquetas  enable row level security;
alter table crm.consentimientos     enable row level security;

-- ── GRANT: lectura general + escritura por COLUMNA ───────────────────────────
grant select on all tables in schema crm to authenticated;   -- (consentimientos: la policy la limita a admin)

grant insert on crm.contactos, crm.oportunidades, crm.notas, crm.tareas, crm.etiquetas, crm.contacto_etiquetas to authenticated;
grant update (nombre, telefono, pais, ciudad, propietario_id, no_contactar) on crm.contactos to authenticated;
grant update (asignado_a, estado)                                          on crm.entradas to authenticated;
grant update (etapa_id, propietario_id, titulo, valor, motivo_perdida, programa) on crm.oportunidades to authenticated;
grant update (titulo, descripcion, vence_at, completada_at, asignado_a)    on crm.tareas to authenticated;
grant update (nombre, rol, activo)                                         on crm.usuarios to authenticated;
grant update (nombre, orden, tipo) on crm.etapas to authenticated;
grant insert, delete               on crm.etapas to authenticated;
grant update (nombre, activo)                                              on crm.pipelines to authenticated;
grant delete on crm.notas, crm.contacto_etiquetas to authenticated;

-- ── Policies ─────────────────────────────────────────────────────────────────
-- usuarios
create policy usuarios_leer   on crm.usuarios for select to authenticated using (crm.rol_actual() is not null);
create policy usuarios_editar on crm.usuarios for update to authenticated using (crm.es_admin()) with check (crm.es_admin());
-- Las funciones "security definer" (dueño crm_owner) leen crm.usuarios para saber el rol del usuario actual.
-- (usuarios es propiedad de postgres, así que a crm_owner le aplica la RLS: necesita su propia policy.)
create policy usuarios_owner_leer on crm.usuarios for select to crm_owner using (true);

-- contactos
create policy contactos_leer   on crm.contactos for select to authenticated using (crm.rol_actual() is not null);
create policy contactos_crear  on crm.contactos for insert to authenticated
  with check (crm.rol_actual() in ('admin', 'comercial'));
create policy contactos_editar on crm.contactos for update to authenticated
  using (crm.puede_editar(propietario_id))
  with check (crm.es_admin() or propietario_id is null or propietario_id = (select crm.uid()));

create policy contacto_emails_leer on crm.contacto_emails for select to authenticated using (crm.rol_actual() is not null);

-- entradas (la marca de leído va por función, ver más abajo)
create policy entradas_leer   on crm.entradas for select to authenticated using (crm.rol_actual() is not null);
create policy entradas_editar on crm.entradas for update to authenticated
  using (crm.puede_editar(asignado_a))
  with check (crm.es_admin() or asignado_a is null or asignado_a = (select crm.uid()));

-- pipelines / etapas
create policy pipelines_leer   on crm.pipelines for select to authenticated using (crm.rol_actual() is not null);
create policy pipelines_editar on crm.pipelines for update to authenticated using (crm.es_admin()) with check (crm.es_admin());
create policy etapas_leer      on crm.etapas    for select to authenticated using (crm.rol_actual() is not null);
create policy etapas_admin     on crm.etapas    for all    to authenticated using (crm.es_admin()) with check (crm.es_admin());

-- oportunidades
create policy oportunidades_leer   on crm.oportunidades for select to authenticated using (crm.rol_actual() is not null);
create policy oportunidades_crear  on crm.oportunidades for insert to authenticated
  with check (crm.rol_actual() in ('admin', 'comercial') and (crm.es_admin() or propietario_id is null or propietario_id = (select crm.uid())));
create policy oportunidades_editar on crm.oportunidades for update to authenticated
  using (crm.puede_editar(propietario_id))
  with check (crm.es_admin() or propietario_id is null or propietario_id = (select crm.uid()));

-- notas: cualquiera con rol de escritura puede añadir (a su nombre); solo admin borra
create policy notas_leer   on crm.notas for select to authenticated using (crm.rol_actual() is not null);
create policy notas_crear  on crm.notas for insert to authenticated
  with check (crm.rol_actual() in ('admin', 'comercial') and autor_id = (select crm.uid()));
create policy notas_borrar on crm.notas for delete to authenticated using (crm.es_admin());

-- actividades: solo lectura para los usuarios (las escriben los triggers "security definer")
create policy actividades_leer on crm.actividades for select to authenticated using (crm.rol_actual() is not null);

-- tareas
create policy tareas_leer   on crm.tareas for select to authenticated using (crm.rol_actual() is not null);
create policy tareas_crear  on crm.tareas for insert to authenticated
  with check (crm.rol_actual() in ('admin', 'comercial') and creado_por = (select crm.uid())
              and (crm.es_admin() or asignado_a is null or asignado_a = (select crm.uid())));
create policy tareas_editar on crm.tareas for update to authenticated
  using (crm.es_admin() or (crm.rol_actual() = 'comercial'
         and (asignado_a is null or asignado_a = (select crm.uid()) or creado_por = (select crm.uid()))))
  with check (crm.es_admin() or asignado_a is null or asignado_a = (select crm.uid()));

-- etiquetas
create policy etiquetas_leer   on crm.etiquetas for select to authenticated using (crm.rol_actual() is not null);
create policy etiquetas_crear  on crm.etiquetas for insert to authenticated with check (crm.rol_actual() in ('admin', 'comercial'));
create policy ce_leer   on crm.contacto_etiquetas for select to authenticated using (crm.rol_actual() is not null);
create policy ce_crear  on crm.contacto_etiquetas for insert to authenticated with check (crm.rol_actual() in ('admin', 'comercial'));
create policy ce_borrar on crm.contacto_etiquetas for delete to authenticated using (crm.rol_actual() in ('admin', 'comercial'));

-- consentimientos: solo admin
create policy consentimientos_leer on crm.consentimientos for select to authenticated using (crm.es_admin());

-- ── Marcar leído / no leído (función: no es una cuestión de "propietario") ───
create function crm.marcar_leida(p_entrada uuid, p_leida boolean default true) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select crm.rol_actual()) not in ('admin', 'comercial') then
    raise exception 'No tienes permiso para marcar entradas' using errcode = '42501';
  end if;
  update crm.entradas
     set leida_at  = case when p_leida then coalesce(leida_at, now()) else null end,
         leida_por = case when p_leida then coalesce(leida_por, (select crm.uid())) else null end
   where id = p_entrada;
end $$;
revoke execute on function crm.marcar_leida(uuid, boolean) from public, anon;
grant  execute on function crm.marcar_leida(uuid, boolean) to authenticated;

alter function crm.rol_actual()                   owner to crm_owner;
alter function crm.es_admin()                     owner to crm_owner;
alter function crm.puede_editar(uuid)             owner to crm_owner;
alter function crm.marcar_leida(uuid, boolean)    owner to crm_owner;

-- ══════════════ 040_crm_actividad.sql ══════════════

-- 040 · Registro de actividad (docs/diseno-crm.md §5.2: «historial inmutable»)
--
-- Todo cambio relevante que haga un usuario (estado, etapa, asignación, notas, tareas,
-- "no contactar") queda escrito en crm.actividades POR TRIGGERS de base de datos, con el
-- usuario real (crm.uid()) — no depende de que la aplicación se acuerde de registrarlo.
-- Los usuarios NO tienen INSERT/UPDATE/DELETE sobre actividades (039).

create function crm.registrar_actividad(
  p_contacto uuid, p_oportunidad uuid, p_entrada uuid, p_tipo text, p_titulo text, p_datos jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = ''
as $$
  insert into crm.actividades (contacto_id, oportunidad_id, entrada_id, usuario_id, tipo, titulo, datos)
  values (p_contacto, p_oportunidad, p_entrada,
          (select u.id from crm.usuarios u where u.id = (select crm.uid())),
          p_tipo, p_titulo, coalesce(p_datos, '{}'::jsonb))
$$;
revoke execute on function crm.registrar_actividad(uuid, uuid, uuid, text, text, jsonb) from public, anon, authenticated;

-- Nombre legible de un usuario (para los títulos de las actividades)
create function crm.nombre_usuario(p_id uuid) returns text
language sql stable security definer set search_path = ''
as $$ select coalesce((select nombre from crm.usuarios where id = p_id), 'sin asignar') $$;
revoke execute on function crm.nombre_usuario(uuid) from public, anon, authenticated;

-- ── entradas: estado y asignación ────────────────────────────────────────────
create function crm.tg_entradas_actividad() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    perform crm.registrar_actividad(new.contacto_id, null, new.id, 'cambio_estado',
      format('Entrada «%s»: %s → %s', new.tipo, old.estado, new.estado),
      jsonb_build_object('de', old.estado, 'a', new.estado, 'tipo', new.tipo));
  end if;
  if new.asignado_a is distinct from old.asignado_a then
    perform crm.registrar_actividad(new.contacto_id, null, new.id, 'asignacion',
      format('Entrada «%s» asignada a %s', new.tipo, crm.nombre_usuario(new.asignado_a)),
      jsonb_build_object('asignado_a', new.asignado_a, 'antes', old.asignado_a));
  end if;
  return new;
end $$;
create trigger entradas_actividad after update of estado, asignado_a on crm.entradas
  for each row execute function crm.tg_entradas_actividad();

-- ── oportunidades: alta, cambio de etapa y de propietario; fecha de cierre ────
create function crm.tg_oportunidades_cierre() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_tipo text;
begin
  select tipo into v_tipo from crm.etapas where id = new.etapa_id;
  new.cerrada_at := case when v_tipo in ('ganada', 'perdida') then coalesce(new.cerrada_at, now()) else null end;
  return new;
end $$;
create trigger oportunidades_cierre before insert or update of etapa_id on crm.oportunidades
  for each row execute function crm.tg_oportunidades_cierre();

create function crm.tg_oportunidades_actividad() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_etapa text; v_etapa_ant text;
begin
  select nombre into v_etapa from crm.etapas where id = new.etapa_id;
  if tg_op = 'INSERT' then
    perform crm.registrar_actividad(new.contacto_id, new.id, new.entrada_origen_id, 'cambio_etapa',
      format('Oportunidad «%s» creada en «%s»', new.titulo, v_etapa),
      jsonb_build_object('etapa', v_etapa));
    return new;
  end if;
  if new.etapa_id is distinct from old.etapa_id then
    select nombre into v_etapa_ant from crm.etapas where id = old.etapa_id;
    perform crm.registrar_actividad(new.contacto_id, new.id, null, 'cambio_etapa',
      format('«%s»: %s → %s', new.titulo, v_etapa_ant, v_etapa),
      jsonb_build_object('de', v_etapa_ant, 'a', v_etapa));
  end if;
  if new.propietario_id is distinct from old.propietario_id then
    perform crm.registrar_actividad(new.contacto_id, new.id, null, 'asignacion',
      format('«%s» asignada a %s', new.titulo, crm.nombre_usuario(new.propietario_id)),
      jsonb_build_object('propietario_id', new.propietario_id));
  end if;
  return new;
end $$;
create trigger oportunidades_actividad after insert or update of etapa_id, propietario_id on crm.oportunidades
  for each row execute function crm.tg_oportunidades_actividad();

-- ── contactos ────────────────────────────────────────────────────────────────
create function crm.tg_contactos_actividad() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.no_contactar is distinct from old.no_contactar then
    perform crm.registrar_actividad(new.id, null, null, 'baja',
      case when new.no_contactar then 'Marcado como «no contactar»' else 'Retirada la marca «no contactar»' end,
      jsonb_build_object('no_contactar', new.no_contactar));
  end if;
  if new.propietario_id is distinct from old.propietario_id then
    perform crm.registrar_actividad(new.id, null, null, 'asignacion',
      format('Contacto asignado a %s', crm.nombre_usuario(new.propietario_id)),
      jsonb_build_object('propietario_id', new.propietario_id));
  end if;
  if new.nombre is distinct from old.nombre or new.telefono is distinct from old.telefono
     or new.pais is distinct from old.pais or new.ciudad is distinct from old.ciudad then
    perform crm.registrar_actividad(new.id, null, null, 'contacto', 'Datos del contacto actualizados',
      jsonb_build_object('nombre', new.nombre, 'telefono', new.telefono, 'pais', new.pais, 'ciudad', new.ciudad));
  end if;
  return new;
end $$;
create trigger contactos_actividad after update on crm.contactos
  for each row execute function crm.tg_contactos_actividad();

-- ── notas ────────────────────────────────────────────────────────────────────
create function crm.tg_notas_actividad() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform crm.registrar_actividad(new.contacto_id, new.oportunidad_id, null, 'nota', 'Nota añadida',
    jsonb_build_object('nota_id', new.id, 'texto', left(new.texto, 500)));
  return new;
end $$;
create trigger notas_actividad after insert on crm.notas
  for each row execute function crm.tg_notas_actividad();

-- ── tareas ───────────────────────────────────────────────────────────────────
create function crm.tg_tareas_actividad() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform crm.registrar_actividad(new.contacto_id, new.oportunidad_id, new.entrada_id, 'tarea',
      format('Tarea creada: %s', new.titulo),
      jsonb_build_object('tarea_id', new.id, 'asignado_a', new.asignado_a, 'vence_at', new.vence_at));
    return new;
  end if;
  if new.completada_at is distinct from old.completada_at then
    perform crm.registrar_actividad(new.contacto_id, new.oportunidad_id, new.entrada_id, 'tarea',
      case when new.completada_at is not null then format('Tarea completada: %s', new.titulo)
           else format('Tarea reabierta: %s', new.titulo) end,
      jsonb_build_object('tarea_id', new.id));
  end if;
  if new.asignado_a is distinct from old.asignado_a then
    perform crm.registrar_actividad(new.contacto_id, new.oportunidad_id, new.entrada_id, 'asignacion',
      format('Tarea «%s» asignada a %s', new.titulo, crm.nombre_usuario(new.asignado_a)),
      jsonb_build_object('tarea_id', new.id, 'asignado_a', new.asignado_a));
  end if;
  return new;
end $$;
create trigger tareas_actividad after insert or update of completada_at, asignado_a on crm.tareas
  for each row execute function crm.tg_tareas_actividad();

do $$
declare r record;
begin
  for r in select p.oid::regprocedure::text as sig from pg_proc p
           where p.pronamespace = 'crm'::regnamespace and pg_get_userbyid(p.proowner) <> 'crm_owner' loop
    execute format('alter function %s owner to crm_owner', r.sig);
  end loop;
end $$;

-- ══════════════ 041_crm_procesar_entradas.sql ══════════════

-- 041 · Vista-contrato de la web + proceso idempotente de unificación (docs/diseno-crm.md §4.2)
--
-- Recomendación del diseño (decisión #6): SIN triggers en las tablas de la web. Un proceso del CRM
-- (`crm.procesar_entradas`) lee la vista `crm.v_entradas_web` —el ÚNICO sitio que conoce las columnas
-- de la web— y, de forma idempotente:
--   · busca/crea el contacto por email normalizado (crm.contacto_emails),
--   · guarda la entrada (copia del payload) con su estado de gestión,
--   · aplica las reglas de alta del diseño (§5.1): oportunidades, tareas, etiquetas, "no contactar",
--   · registra los consentimientos que ya constan.
-- Se ejecuta por pg_cron cada 30 s y el CRM la invoca al abrir la bandeja.

-- Las tablas de la web tienen RLS activada SIN policies (solo service_role accede). La vista se ejecuta con los
-- permisos de crm_owner, así que necesita una policy de SOLO LECTURA por tabla. Es aditiva: no cambia nada
-- para la web (service_role ignora la RLS) ni abre las tablas a anon/authenticated.
do $$
declare t text;
begin
  foreach t in array array['leads', 'solicitudes_admision', 'mensajes_contacto', 'descargas_catalogo',
                           'candidaturas_empleo', 'orders', 'order_items', 'solicitudes_baja'] loop
    execute format('drop policy if exists crm_owner_leer on public.%I', t);
    execute format('create policy crm_owner_leer on public.%I for select to crm_owner using (true)', t);
  end loop;
end $$;

create view crm.v_entradas_web as
select 'leads'::text as fuente_tabla, t.id::text as fuente_id, 'lead_legacy'::text as tipo,
       crm.normalizar_email(t.email) as email_norm, t.email as email_orig,
       nullif(btrim(concat_ws(' ', t.first_name, t.last_name)), '') as nombre,
       nullif(btrim(t.phone), '') as telefono, t.master_interes as programa,
       t.created_at as recibido_at, null::boolean as rgpd, to_jsonb(t) as raw
from public.leads t
union all
select 'solicitudes_admision', t.id::text, 'solicitud_admision',
       crm.normalizar_email(t.email), t.email, nullif(btrim(t.nombre_completo), ''),
       nullif(btrim(t.telefono), ''), t.programa_solicitado, t.created_at, t.rgpd_aceptado, to_jsonb(t)
from public.solicitudes_admision t
union all
select 'mensajes_contacto', t.id::text, 'mensaje_contacto',
       crm.normalizar_email(t.email), t.email, nullif(btrim(t.nombre), ''),
       nullif(btrim(t.telefono), ''), t.programa, t.created_at, null, to_jsonb(t)
from public.mensajes_contacto t
union all
select 'descargas_catalogo', t.id::text, 'descarga_catalogo',
       crm.normalizar_email(t.email), t.email, nullif(btrim(t.nombre), ''),
       nullif(btrim(t.telefono), ''), t.programa, t.created_at, t.rgpd_aceptado, to_jsonb(t)
from public.descargas_catalogo t
union all
select 'candidaturas_empleo', t.id::text, 'candidatura',
       crm.normalizar_email(t.email), t.email, nullif(btrim(t.nombre), ''),
       nullif(btrim(t.telefono), ''), null, t.created_at, null, to_jsonb(t)
from public.candidaturas_empleo t
union all
select 'orders', t.id::text, 'pedido',
       crm.normalizar_email(t.customer_email), t.customer_email, nullif(btrim(t.customer_name), ''),
       nullif(btrim(t.customer_phone), ''), null, t.created_at, null,
       to_jsonb(t) || jsonb_build_object('items', coalesce(
         (select jsonb_agg(to_jsonb(oi) order by oi.id) from public.order_items oi where oi.order_id = t.id), '[]'::jsonb))
from public.orders t
union all
select 'solicitudes_baja', t.id::text, 'baja',
       crm.normalizar_email(t.email), t.email, null, null, null, t.created_at, null, to_jsonb(t)
from public.solicitudes_baja t;

alter view crm.v_entradas_web owner to crm_owner;
revoke all on crm.v_entradas_web from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
create function crm.procesar_entradas(p_gestionadas_antes_de timestamptz default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c_email_ok constant text := '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$';
  v_entradas int := 0; v_contactos int := 0; v_opps int := 0; v_tareas int := 0; v_sin_email int := 0;
begin
  -- Solo miembros activos del CRM (o el proceso automático, sin sesión de usuario)
  if (select crm.uid()) is not null and (select crm.rol_actual()) is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  -- Una sola ejecución a la vez (cron + varias bandejas abiertas)
  if not pg_try_advisory_xact_lock(hashtext('crm.procesar_entradas')) then
    return jsonb_build_object('omitido', true);
  end if;

  drop table if exists pg_temp._nuevas;
  create temp table _nuevas on commit drop as
    select v.* from crm.v_entradas_web v
    where v.email_norm ~ c_email_ok
      and not exists (select 1 from crm.entradas e where e.fuente_tabla = v.fuente_tabla and e.fuente_id = v.fuente_id);

  select count(*) into v_sin_email from crm.v_entradas_web v where v.email_norm is null or v.email_norm !~ c_email_ok;

  -- 1) Contactos nuevos (uno por email normalizado; datos más completos / recientes)
  with ult as (select distinct on (email_norm) email_norm, email_orig from pg_temp._nuevas order by email_norm, recibido_at desc),
       nom as (select distinct on (email_norm) email_norm, nombre from pg_temp._nuevas where nombre is not null
                 order by email_norm, length(nombre) desc, recibido_at desc),
       tel as (select distinct on (email_norm) email_norm, telefono from pg_temp._nuevas where telefono is not null
                 order by email_norm, recibido_at desc),
       prim as (select email_norm, min(recibido_at) as primera, (array_agg(tipo order by recibido_at))[1] as origen_primero
                  from pg_temp._nuevas group by email_norm),
       nuevos as (
         select gen_random_uuid() as id, u.email_norm, u.email_orig, n.nombre, t.telefono, p.primera, p.origen_primero
         from ult u join prim p using (email_norm) left join nom n using (email_norm) left join tel t using (email_norm)
         where not exists (select 1 from crm.contacto_emails ce where ce.email_normalizado = u.email_norm)
       ),
       ins_c as (
         insert into crm.contactos (id, email_principal, nombre, telefono, origen_primero, creado_at)
         select id, btrim(email_orig), nombre, telefono, origen_primero, primera from nuevos returning id
       )
  insert into crm.contacto_emails (email_normalizado, contacto_id, principal)
  select email_norm, id, true from nuevos;
  get diagnostics v_contactos = row_count;

  -- 2) Contactos existentes: rellenar solo lo que estaba vacío (COALESCE real)
  update crm.contactos c
     set nombre = coalesce(c.nombre, x.nombre), telefono = coalesce(c.telefono, x.telefono)
    from (select distinct on (n.email_norm) n.email_norm, n.nombre, n.telefono
            from pg_temp._nuevas n order by n.email_norm, (n.nombre is null), n.recibido_at desc) x
    join crm.contacto_emails ce on ce.email_normalizado = x.email_norm
   where c.id = ce.contacto_id
     and ((c.nombre is null and x.nombre is not null) or (c.telefono is null and x.telefono is not null));

  -- 3) Entradas (con su estado inicial)
  insert into crm.entradas (contacto_id, fuente_tabla, fuente_id, tipo, programa, recibido_at, estado, payload)
  select ce.contacto_id, n.fuente_tabla, n.fuente_id, n.tipo, n.programa, n.recibido_at,
         case when p_gestionadas_antes_de is not null and n.recibido_at < p_gestionadas_antes_de
              then 'gestionada' else 'nueva' end,
         n.raw
    from pg_temp._nuevas n
    join crm.contacto_emails ce on ce.email_normalizado = n.email_norm
  on conflict (fuente_tabla, fuente_id) do nothing;
  get diagnostics v_entradas = row_count;

  -- 4) Consentimientos que ya constaban (casilla RGPD marcada)
  insert into crm.consentimientos (contacto_id, tipo, concedido, otorgado_at, texto_version, origen, fuente_tabla, fuente_id)
  select e.contacto_id, 'privacidad', true, e.recibido_at, 'desconocida-anterior-al-crm', e.tipo, e.fuente_tabla, e.fuente_id
    from crm.entradas e join pg_temp._nuevas n on n.fuente_tabla = e.fuente_tabla and n.fuente_id = e.fuente_id
   where n.rgpd is true
  on conflict (fuente_tabla, fuente_id, tipo) do nothing;

  -- 5) Reglas de alta ─ oportunidades de admisión (etapa según el estado que ya tuviera en la web)
  insert into crm.oportunidades (contacto_id, pipeline_id, etapa_id, programa, titulo, entrada_origen_id, creado_at)
  select e.contacto_id, p.id, et.id, e.programa, 'Admisión ' || coalesce(e.programa, ''), e.id, e.recibido_at
    from crm.entradas e
    join pg_temp._nuevas n on n.fuente_tabla = e.fuente_tabla and n.fuente_id = e.fuente_id
    join crm.pipelines p on p.codigo = 'admision'
    join crm.etapas et on et.pipeline_id = p.id and et.nombre = case n.raw ->> 'estado'
           when 'revisado' then 'Entrevista/Revisión' when 'aceptado' then 'Admitido'
           when 'rechazado' then 'Perdido' else 'Solicitud recibida' end
   where e.tipo = 'solicitud_admision'
     and not exists (   -- no duplicar si ya hay una oportunidad ABIERTA del mismo programa
       select 1 from crm.oportunidades o join crm.etapas oe on oe.id = o.etapa_id
        where o.contacto_id = e.contacto_id and o.pipeline_id = p.id
          and o.programa is not distinct from e.programa and oe.tipo = 'abierta')
  on conflict (entrada_origen_id) do nothing;
  get diagnostics v_opps = row_count;

  -- 5b) Candidaturas → pipeline de empleo
  insert into crm.oportunidades (contacto_id, pipeline_id, etapa_id, programa, titulo, entrada_origen_id, creado_at)
  select e.contacto_id, p.id, et.id, null,
         coalesce('Candidatura: ' || nullif(e.payload ->> 'oferta_puesto', ''), 'Candidatura espontánea'), e.id, e.recibido_at
    from crm.entradas e
    join pg_temp._nuevas n on n.fuente_tabla = e.fuente_tabla and n.fuente_id = e.fuente_id
    join crm.pipelines p on p.codigo = 'empleo'
    join crm.etapas et on et.pipeline_id = p.id and et.nombre = 'Recibida'
   where e.tipo = 'candidatura'
  on conflict (entrada_origen_id) do nothing;

  -- 5c) Descarga de catálogo → etiqueta catalogo-<programa>
  insert into crm.etiquetas (nombre)
  select distinct 'catalogo-' || lower(e.programa) from crm.entradas e
    join pg_temp._nuevas n on n.fuente_tabla = e.fuente_tabla and n.fuente_id = e.fuente_id
   where e.tipo = 'descarga_catalogo' and e.programa is not null
  on conflict (nombre) do nothing;
  insert into crm.contacto_etiquetas (contacto_id, etiqueta_id)
  select distinct e.contacto_id, et.id from crm.entradas e
    join pg_temp._nuevas n on n.fuente_tabla = e.fuente_tabla and n.fuente_id = e.fuente_id
    join crm.etiquetas et on et.nombre = 'catalogo-' || lower(e.programa)
   where e.tipo = 'descarga_catalogo' and e.programa is not null
  on conflict do nothing;

  -- 5d) Bajas → "no contactar" (oposición inmediata) + tarea de supresión (25 días; la política promete 30)
  update crm.contactos c
     set no_contactar = true, baja_solicitada_at = coalesce(c.baja_solicitada_at, b.recibido_at)
    from (select e.contacto_id, min(e.recibido_at) as recibido_at from crm.entradas e
            join pg_temp._nuevas n on n.fuente_tabla = e.fuente_tabla and n.fuente_id = e.fuente_id
           where e.tipo = 'baja' group by e.contacto_id) b
   where c.id = b.contacto_id and not c.no_contactar;

  -- 5e) Tareas: solo para entradas NUEVAS (el histórico marcado 'gestionada' no genera tareas)
  insert into crm.tareas (contacto_id, entrada_id, titulo, vence_at)
  select e.contacto_id, e.id,
         case e.tipo when 'solicitud_admision' then 'Revisar solicitud de admisión ' || coalesce(e.programa, '')
                     when 'mensaje_contacto'   then 'Responder mensaje de contacto'
                     when 'baja'               then 'Gestionar solicitud de baja / supresión de datos' end,
         e.recibido_at + case e.tipo when 'solicitud_admision' then interval '2 days'
                                     when 'mensaje_contacto'   then interval '1 day'
                                     else interval '25 days' end
    from crm.entradas e
    join pg_temp._nuevas n on n.fuente_tabla = e.fuente_tabla and n.fuente_id = e.fuente_id
   where e.estado = 'nueva' and e.tipo in ('solicitud_admision', 'mensaje_contacto', 'baja');
  get diagnostics v_tareas = row_count;

  -- 6) Los pedidos pueden cambiar tras crearse (líneas que llegan después, estado de pago): refrescar 30 días
  update crm.entradas e set payload = v.raw
    from crm.v_entradas_web v
   where e.fuente_tabla = 'orders' and v.fuente_tabla = 'orders' and v.fuente_id = e.fuente_id
     and e.recibido_at > now() - interval '30 days' and e.payload is distinct from v.raw;

  return jsonb_build_object('entradas_nuevas', v_entradas, 'contactos_nuevos', v_contactos,
                            'oportunidades_admision', v_opps, 'tareas', v_tareas, 'filas_sin_email_valido', v_sin_email);
end $$;

alter function crm.procesar_entradas(timestamptz) owner to crm_owner;
revoke execute on function crm.procesar_entradas(timestamptz) from public, anon;
grant  execute on function crm.procesar_entradas(timestamptz) to authenticated;

-- ── Tiempo real: entradas, oportunidades y tareas (Realtime respeta la RLS de cada usuario) ──
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table crm.entradas, crm.oportunidades, crm.tareas;
  end if;
exception when others then
  raise notice 'publicación realtime: %', sqlerrm;
end $$;

-- ── Programación: cada 30 s (pg_cron ≥ 1.5). Si pg_cron no existe, el CRM invoca la función al abrir la bandeja. ──
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('crm-procesar-entradas', '30 seconds', 'select crm.procesar_entradas()');
  else
    raise notice 'pg_cron no disponible: sin proceso programado';
  end if;
exception when others then
  raise notice 'pg_cron: %', sqlerrm;
end $$;

-- ── Avisar a la API (PostgREST) de que hay un esquema nuevo ──
notify pgrst, 'reload schema';
