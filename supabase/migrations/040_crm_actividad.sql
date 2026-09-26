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
