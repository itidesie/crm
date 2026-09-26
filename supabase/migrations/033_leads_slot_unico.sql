-- Restricción de unicidad para el selector de horarios con disponibilidad
-- real: capacidad confirmada de 1 sesión por franja (un asesor, una sesión
-- a la vez) — con más de un lead compartiendo fecha+hora hoy no hay nada
-- que lo impida.
--
-- Cómo ejecutar este script: pégalo en Supabase → SQL Editor → Run. Mismo
-- patrón que el resto de scripts/*.sql del proyecto (no hace falta ninguna
-- conexión Postgres directa).
--
-- Es un ÍNDICE ÚNICO PARCIAL, no una constraint a secas: el `where` excluye
-- los leads con status 'descartado' — si el equipo cancela/descarta un
-- lead, su franja vuelve a estar disponible para otra persona
-- automáticamente, sin liberarla a mano.
--
-- Esta es la pieza que de verdad evita la condición de carrera de dos
-- personas reservando la misma franja a la vez: si dos INSERT llegan casi
-- al mismo tiempo, Postgres acepta el primero y rechaza el segundo con el
-- error 23505 (unique_violation) — app/api/leads/route.ts lo traduce a un
-- 409 con un mensaje claro. La comprobación de disponibilidad que hace el
-- frontend antes de enviar el formulario es solo para la UX (no mostrar
-- franjas ya ocupadas): la única barrera real es este índice.
create unique index if not exists leads_slot_unico
  on public.leads (session_date, session_time)
  where status <> 'descartado';

comment on index public.leads_slot_unico is
  'Impide dos leads con la misma fecha+hora (excepto descartados) — capacidad de 1 sesión por franja.';
