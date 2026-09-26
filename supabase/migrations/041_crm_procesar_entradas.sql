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
