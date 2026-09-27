-- 043 · Importación manual de leads (Excel) desde la ficha de Contactos
--
-- El cliente autenticado (admin/comercial) ya puede insertar en crm.contactos y crm.oportunidades
-- (grants de 039_crm_rls.sql), pero NO tiene permiso de insert sobre crm.contacto_emails —la tabla que
-- garantiza que no haya contactos duplicados por email—, así que la importación necesita una función
-- "security definer" (dueño crm_owner), igual que crm.procesar_entradas y crm.marcar_leida.
--
-- p_filas: array de objetos { email, nombre?, telefono?, canal_origen?, programa? }. Dedup por email
-- normalizado (crm.contacto_emails), igual que el resto del CRM. Si la fila trae "programa", se abre una
-- oportunidad en el pipeline de Admisión (etapa inicial) si el contacto no tiene ya una abierta.

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
