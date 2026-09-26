-- Mensajes del formulario de contacto (/contact-page, pestaña "Escribir
-- Mensaje") — antes el formulario no tenía `onSubmit` en absoluto (ver
-- CLAUDE.md, auditoría de formularios 2026-09-04). Mismo patrón que `leads`:
-- persistir primero, notificar por email después, para que un fallo de
-- envío no se lleve por delante el único registro de que alguien escribió.
--
-- Cómo ejecutar: pégalo en Supabase → SQL Editor → Run.

create table if not exists public.mensajes_contacto (
  id uuid primary key default gen_random_uuid(),

  nombre text not null,
  email text not null,
  asunto text,
  mensaje text not null,

  -- Contexto de origen si llegó desde un CTA de página de programa
  -- (?motivo=asesoria|clase&programa=MBIM...) — NULL en el caso normal de
  -- alguien que escribe directamente desde /contact-page.
  motivo text,
  programa text,

  created_at timestamptz not null default now()
);

create index if not exists idx_mensajes_contacto_created_at on public.mensajes_contacto (created_at desc);

comment on table public.mensajes_contacto is
  'Mensajes del formulario de contacto. Acceso exclusivo vía service_role — datos personales, sin ninguna policy pública.';

alter table public.mensajes_contacto enable row level security;

-- Sin ninguna policy para anon/authenticated: son datos personales (nombre,
-- email, mensaje). La inserción la hace siempre el backend (Route Handler
-- con service_role), nunca el navegador directamente contra Supabase —
-- mismo patrón que leads/candidaturas_empleo/solicitudes_admision.
