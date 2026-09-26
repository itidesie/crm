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
