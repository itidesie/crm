-- Añade el canal de origen del contacto (Web/Instagram/Facebook/Otro) y la función que usa la pantalla
-- de Contactos para importar leads desde un Excel. Pega esto UNA VEZ en el SQL Editor de producción,
-- después de haber ejecutado 01-crm-esquema-produccion.sql.
-- (Equivale a las migraciones locales 042_crm_canal_origen.sql y 043_crm_importar_leads.sql.)

-- ── Canal de origen ──────────────────────────────────────────────────────────
alter table crm.contactos add column canal_origen text
  check (canal_origen in ('web', 'instagram', 'facebook', 'otro'));
grant update (canal_origen) on crm.contactos to authenticated;

-- crm.v_contactos hace "select c.*, ...": Postgres expande "c.*" a la lista de columnas que existían AL
-- CREAR la vista, así que canal_origen no llegaría a la vista sin recrearla (CREATE OR REPLACE no vale:
-- insertaría una columna en medio de la lista existente). Drop + create.
drop view crm.v_contactos;
create view crm.v_contactos with (security_invoker = true) as
select c.*,
       (select count(*) from crm.entradas e where e.contacto_id = c.id)                 as n_entradas,
       (select max(e.recibido_at) from crm.entradas e where e.contacto_id = c.id)       as ultima_entrada_at,
       lower(coalesce(c.nombre, '') || ' ' || c.email_principal || ' ' || coalesce(c.telefono, '')) as busqueda
from crm.contactos c
where c.fusionado_en is null;
alter view crm.v_contactos owner to crm_owner;
grant select on crm.v_contactos to authenticated;

-- ── Importación de leads desde Excel ─────────────────────────────────────────
create function crm.importar_leads_excel(p_filas jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_admision_id uuid;
  v_etapa_inicial_id uuid;
  v_fila jsonb;
  v_email text;
  v_contacto_id uuid;
  v_nuevos int := 0;
  v_actualizados int := 0;
  v_oportunidades int := 0;
  v_omitidos int := 0;
begin
  if (select crm.rol_actual()) not in ('admin', 'comercial') then
    raise exception 'No tienes permiso para importar contactos' using errcode = '42501';
  end if;

  select id into v_admision_id from crm.pipelines where codigo = 'admision';
  select id into v_etapa_inicial_id from crm.etapas where pipeline_id = v_admision_id order by orden limit 1;

  for v_fila in select * from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) loop
    v_email := crm.normalizar_email(v_fila->>'email');
    if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_omitidos := v_omitidos + 1;
      continue;
    end if;

    select contacto_id into v_contacto_id from crm.contacto_emails where email_normalizado = v_email;

    if v_contacto_id is null then
      v_contacto_id := gen_random_uuid();
      insert into crm.contactos (id, email_principal, nombre, telefono, canal_origen, propietario_id, creado_at)
        values (v_contacto_id, btrim(v_fila->>'email'), coalesce(nullif(btrim(v_fila->>'nombre'), ''), 'Sin nombre'),
                nullif(btrim(v_fila->>'telefono'), ''), coalesce(v_fila->>'canal_origen', 'web'), (select crm.uid()), now());
      insert into crm.contacto_emails (email_normalizado, contacto_id, principal) values (v_email, v_contacto_id, true);
      v_nuevos := v_nuevos + 1;
    else
      update crm.contactos set
        nombre = coalesce(nombre, nullif(btrim(v_fila->>'nombre'), '')),
        telefono = coalesce(telefono, nullif(btrim(v_fila->>'telefono'), '')),
        canal_origen = coalesce(canal_origen, v_fila->>'canal_origen')
      where id = v_contacto_id;
      v_actualizados := v_actualizados + 1;
    end if;

    if (v_fila->>'programa') is not null and v_admision_id is not null and v_etapa_inicial_id is not null
       and not exists (
         select 1 from crm.oportunidades o join crm.etapas e on e.id = o.etapa_id
         where o.contacto_id = v_contacto_id and o.pipeline_id = v_admision_id and e.tipo = 'abierta'
       ) then
      insert into crm.oportunidades (contacto_id, pipeline_id, etapa_id, programa, titulo, propietario_id)
        values (v_contacto_id, v_admision_id, v_etapa_inicial_id, v_fila->>'programa',
                'Lead importado' || coalesce(' · ' || (v_fila->>'programa'), ''), (select crm.uid()));
      v_oportunidades := v_oportunidades + 1;
    end if;
  end loop;

  return jsonb_build_object('nuevos', v_nuevos, 'actualizados', v_actualizados,
                             'oportunidades', v_oportunidades, 'omitidos', v_omitidos);
end $$;

revoke execute on function crm.importar_leads_excel(jsonb) from public, anon;
grant  execute on function crm.importar_leads_excel(jsonb) to authenticated;
alter function crm.importar_leads_excel(jsonb) owner to crm_owner;

-- Debe decir «Success. No rows returned» al final. Después, refresca la pantalla de Contactos.
notify pgrst, 'reload schema';
