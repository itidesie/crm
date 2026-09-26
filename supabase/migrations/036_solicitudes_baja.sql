-- Solicitudes de baja / supresión de datos (/solicitud-baja-page).
--
-- ⚠️ NO APLICADO. Archivo nuevo, para pegar en Supabase → SQL Editor → Run,
-- DESPUÉS de 035_rate_limits.sql.
--
-- Hasta ahora el formulario de baja solo enviaba dos emails y no dejaba ningún
-- registro: no había forma de demostrar cuándo se recibió una petición de
-- supresión ni de saber si se había atendido. Esta tabla es ese registro.
--
-- Minimización de datos: solo se guarda lo necesario para identificar y
-- gestionar la solicitud (email normalizado + motivo). El nombre y los
-- comentarios libres siguen viajando únicamente en el email al equipo.
--
-- Si este script NO está aplicado, el formulario sigue funcionando (el aviso
-- por email al equipo sigue saliendo) y el error de guardado queda en el log
-- del servidor.

create extension if not exists pgcrypto; -- gen_random_uuid()

create table if not exists public.solicitudes_baja (
  id uuid primary key default gen_random_uuid(),

  -- Siempre en minúsculas y sin espacios: la aplicación lo normaliza y la BD lo
  -- exige, para poder buscar por email sin sorpresas de mayúsculas.
  email text not null check (email = lower(btrim(email))),

  -- Mismos valores que el <select> del formulario.
  motivo text not null
    check (motivo in ('no_interes', 'privacidad', 'spam', 'otro')),

  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_proceso', 'completada', 'rechazada')),

  created_at timestamptz not null default now()
);

create index if not exists idx_solicitudes_baja_email on public.solicitudes_baja (email);
create index if not exists idx_solicitudes_baja_estado on public.solicitudes_baja (estado);
create index if not exists idx_solicitudes_baja_created_at on public.solicitudes_baja (created_at desc);

comment on table public.solicitudes_baja is
  'Solicitudes de baja / supresión de datos personales (RGPD). Acceso exclusivo vía service_role — sin ninguna policy pública.';

alter table public.solicitudes_baja enable row level security;

-- Sin ninguna policy para anon/authenticated: contiene emails de personas que
-- piden que se borren sus datos. La inserción la hace siempre el backend
-- (Server Action con service_role), nunca el navegador contra Supabase.
