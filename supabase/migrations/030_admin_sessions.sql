-- Sesiones reales de admin — sustituye la cookie de valor fijo "authenticated"
-- (hallazgo MEDIO de la auditoría de seguridad, ver CLAUDE.md §4) por un
-- token firmado (HMAC), con expiración y revocable individualmente sin
-- afectar a otras sesiones del mismo admin.
--
-- Cómo ejecutar: pégalo en Supabase → SQL Editor → Run.

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id integer not null references public.admin_users(id) on delete cascade,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- NULL = sesión activa. Se marca al hacer logout o al revocar una sesión
  -- concreta — nunca se borra la fila, para conservar el rastro de cuándo
  -- se cerró.
  revoked_at timestamptz,

  user_agent text,
  ip_address text
);

create index if not exists idx_admin_sessions_admin_id on public.admin_sessions (admin_id);
create index if not exists idx_admin_sessions_expires_at on public.admin_sessions (expires_at);

comment on table public.admin_sessions is
  'Sesiones de administrador — cada fila es una sesión individualmente revocable. Acceso exclusivo vía service_role, sin ninguna policy pública.';

alter table public.admin_sessions enable row level security;

-- Sin ninguna policy para anon/authenticated: la única forma legítima de
-- crear/leer/revocar una sesión es el backend (Route Handler o middleware
-- con service_role) — mismo patrón que admin_users.
