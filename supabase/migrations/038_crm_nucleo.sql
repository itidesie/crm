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
