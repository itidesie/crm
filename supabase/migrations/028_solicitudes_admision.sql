-- Solicitudes de admisión (/landing y las 4 páginas de máster), gestionadas
-- desde /admin/admisiones. Nuevo flujo EN PARALELO a la tabla `applications`
-- heredada (/application, scripts/015) — decisión explícita del cliente de
-- no tocar esa página/tabla en esta pieza (deuda a resolver más adelante).
--
-- Cómo ejecutar: pégalo en Supabase → SQL Editor → Run.

create table if not exists public.solicitudes_admision (
  id uuid primary key default gen_random_uuid(),

  -- Datos personales
  nombre_completo text not null,
  email text not null,
  telefono text not null,
  pais text,
  ciudad text,
  fecha_nacimiento date,

  -- Datos académicos
  titulacion_previa text,
  universidad_origen text,

  -- Preseleccionado según la página de origen, pero editable por el
  -- usuario en el propio formulario — de ahí que sea `not null` (siempre
  -- llega con un valor) en vez de nullable.
  programa_solicitado text not null
    check (programa_solicitado in ('MBIM', 'MBBE', 'EMBIM', 'Online')),

  -- Desde qué página se envió — mismo propósito que `origen` en `leads`.
  origen text not null
    check (origen in ('landing', 'mbim', 'mbbe', 'embim', 'online')),

  -- URL real en Vercel Blob, mismo patrón que candidaturas_empleo.cv_url.
  -- Obligatorio en el formulario (decisión explícita del cliente), la
  -- columna se deja nullable por si algún día se acepta sin CV.
  cv_url text,

  mensaje text,

  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'revisado', 'aceptado', 'rechazado')),

  rgpd_aceptado boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_solicitudes_admision_estado on public.solicitudes_admision (estado);
create index if not exists idx_solicitudes_admision_programa on public.solicitudes_admision (programa_solicitado);
create index if not exists idx_solicitudes_admision_created_at on public.solicitudes_admision (created_at desc);

comment on table public.solicitudes_admision is
  'Solicitudes de admisión desde /landing y las 4 páginas de máster. Acceso exclusivo vía service_role — datos personales, sin ninguna policy pública.';

alter table public.solicitudes_admision enable row level security;

-- Sin ninguna policy para anon/authenticated: son datos personales (nombre,
-- email, teléfono, fecha de nacimiento, CV). La inserción y lectura las hace
-- siempre el backend (Route Handler / Server Action con service_role), nunca
-- el navegador directamente contra Supabase — mismo patrón que leads y
-- candidaturas_empleo.

-- Reutiliza la función ya creada en scripts/020_create_leads_table.sql —
-- no se redefine aquí.
drop trigger if exists set_solicitudes_admision_updated_at on public.solicitudes_admision;
create trigger set_solicitudes_admision_updated_at
  before update on public.solicitudes_admision
  for each row
  execute function public.set_updated_at();
