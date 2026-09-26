-- /application (formulario de admisión antiguo) se retira por completo —
-- decisión definitiva del cliente, ya no se unifica con el flujo nuevo de
-- solicitudes de admisión (`solicitudes_admision`). La tabla `applications`
-- (scripts/015_create_applications_table.sql) confirmada vacía (0 filas)
-- antes de este script — no hay ningún dato real que perder.
--
-- scripts/015 se deja tal cual, como registro histórico de cuándo y cómo
-- se creó — mismo criterio que el resto de migraciones de este proyecto,
-- nunca se borran del historial aunque la tabla que crean deje de existir.
--
-- Cómo ejecutar: pégalo en Supabase → SQL Editor → Run.

drop table if exists public.applications;
