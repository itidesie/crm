-- Copia literal de scripts/037_leads_agenda_opcional.sql de WebIdesie (mismo patrón que 020-036: los
-- scripts de la web se copian tal cual, numerados en la secuencia del CRM). Aplica solo a este
-- Supabase local — en producción lo ejecuta el cliente directamente en el proyecto de la web.

-- Agendar llamada pasa a ser OPCIONAL dentro del formulario de contacto/interés
-- (antes era obligatorio: el único flujo era el selector de horarios de
-- /landing). Cambios, todos aditivos — no se borra ni se renombra nada:
--
--  1) session_date / session_time dejan de ser NOT NULL: un lead que no
--     quiere agendar llamada guarda ambas como NULL. El índice único parcial
--     `leads_slot_unico` (scripts/033) no se ve afectado — Postgres nunca
--     considera dos NULL como iguales, así que dos leads sin franja elegida
--     nunca chocan entre sí.
--  2) `mensaje`: campo libre nuevo (el formulario nuevo lo pide, opcional).
--  3) `rgpd_aceptado`: mismo patrón que `solicitudes_admision`/
--     `descargas_catalogo` — el formulario nuevo lo exige, `not null default
--     false` para las filas históricas que no lo tenían.
--
-- Cómo ejecutar: Supabase → SQL Editor → pega este archivo → Run.

alter table public.leads
  alter column session_date drop not null,
  alter column session_time drop not null,
  add column if not exists mensaje text,
  add column if not exists rgpd_aceptado boolean not null default false;

comment on column public.leads.session_date is 'Fecha de la llamada elegida — NULL si la persona no quiso agendar (opcional desde 2026-09-28).';
comment on column public.leads.session_time is 'Hora de la llamada elegida — NULL si la persona no quiso agendar (opcional desde 2026-09-28).';
comment on column public.leads.mensaje is 'Mensaje libre opcional del formulario.';
comment on column public.leads.rgpd_aceptado is 'Checkbox de política de privacidad aceptado en el formulario.';
