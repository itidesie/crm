-- Solicitudes de descarga de catálogo (/api/send-catalog, CatalogDownloadDialog
-- y ClosingCta "descárgalo directamente") — pendiente dejado explícitamente sin
-- resolver en (46) al migrar de Brevo a Resend: el teléfono se recogía y se
-- usaba, pero no se persistía en ningún sitio. Mismo patrón que
-- `mensajes_contacto`/`candidaturas_empleo`/`solicitudes_admision`: persistir
-- primero, notificar por email después, para que un fallo de envío no se
-- lleve por delante el único registro de que alguien lo pidió.
--
-- Cómo ejecutar: pégalo en Supabase → SQL Editor → Run.

create table if not exists public.descargas_catalogo (
  id uuid primary key default gen_random_uuid(),

  nombre text not null,
  email text not null,
  telefono text not null,

  -- catalogo_id es el identificador interno que ya usa el frontend
  -- (mbim-fulltime / mbim-building-engineering / mbim-online /
  -- executive-master-bim, ver catalogMapping en app/api/send-catalog/route.ts).
  -- programa es la etiqueta homogénea (MBIM/MBBE/EMBIM/Online) para poder
  -- filtrar, mismo criterio que "origen" en solicitudes_admision.
  catalogo_id text not null,
  catalogo_nombre text,
  programa text not null check (programa in ('MBIM', 'MBBE', 'EMBIM', 'Online')),

  rgpd_aceptado boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists idx_descargas_catalogo_created_at on public.descargas_catalogo (created_at desc);
create index if not exists idx_descargas_catalogo_programa on public.descargas_catalogo (programa);

comment on table public.descargas_catalogo is
  'Solicitudes de descarga de catálogo por email. Acceso exclusivo vía service_role — datos personales, sin ninguna policy pública.';

alter table public.descargas_catalogo enable row level security;

-- Sin ninguna policy para anon/authenticated: son datos personales (nombre,
-- email, teléfono). La inserción la hace siempre el backend (Route Handler
-- con service_role), nunca el navegador directamente contra Supabase —
-- mismo patrón que leads/candidaturas_empleo/solicitudes_admision/mensajes_contacto.
