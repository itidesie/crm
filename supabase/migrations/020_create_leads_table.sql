-- Leads de sesiones informativas (formulario de /landing y, en el futuro,
-- cualquier otro formulario de captación del sitio).
--
-- Cómo ejecutar este script: pégalo en Supabase → SQL Editor → Run. No hace
-- falta ninguna dependencia adicional en el proyecto (@supabase/supabase-js
-- consume la tabla vía API REST, no vía conexión Postgres directa).

create extension if not exists pgcrypto; -- necesaria para gen_random_uuid()

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  first_name text not null,
  last_name text not null,
  phone text not null,
  email text not null,

  -- Máster concreto de interés (MBIM / MBBE / EMBIM / Online), o NULL si el
  -- botón que abrió el formulario no era de un máster en particular (p. ej.
  -- el CTA del hero o el cierre genérico de la landing).
  master_interes text,

  -- Fecha y hora de la sesión informativa que el propio lead eligió.
  -- session_time es siempre una franja en punto entre 10:00 y 19:00 (hora de
  -- España) — la regla de negocio la valida app/api/leads/route.ts antes de
  -- llegar aquí, no una constraint de base de datos, porque intervalos de
  -- negocio como este cambian más a menudo que el esquema.
  session_date date not null,
  session_time time not null,

  -- De qué página/sección vino ("Landing", "Landing · Hero", "Landing ·
  -- Cierre"...). Texto libre a propósito: nuevas páginas irán añadiendo sus
  -- propios valores sin necesitar una migración de esquema.
  origen text not null default 'landing',

  status text not null default 'nuevo'
    check (status in ('nuevo', 'contactado', 'cualificado', 'matriculado', 'descartado')),

  -- Notas internas del equipo de admisiones — nunca las rellena el propio lead.
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_email on public.leads (email);
create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_status on public.leads (status);
create index if not exists idx_leads_master_interes on public.leads (master_interes);

comment on table public.leads is
  'Leads de sesiones informativas. Acceso exclusivo vía service_role — ver política RLS más abajo.';

-- --- Row Level Security -----------------------------------------------------
-- RLS activado y SIN ninguna policy para "anon" ni "authenticated": eso
-- deniega todo acceso por defecto a esos dos roles, tanto lectura como
-- escritura. `service_role` (la clave que usa lib/supabase/server.ts, nunca
-- expuesta al navegador) bypassa RLS por diseño de Supabase — no necesita
-- ninguna policy para leer o insertar libremente. Es el patrón recomendado
-- por Supabase para tablas que solo debe tocar el backend.
alter table public.leads enable row level security;

-- Trigger para mantener updated_at al día en cada UPDATE (p. ej. al cambiar
-- `status` desde el futuro panel de administración).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
  before update on public.leads
  for each row
  execute function public.set_updated_at();
