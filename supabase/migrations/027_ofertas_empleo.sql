-- Bolsa de empleo (/bolsa-de-empleo-page), gestionada desde /admin/empleo.
-- Antes de este script no existía ninguna tabla relacionada — a diferencia
-- de orders/coupons, que ya existían sin usar, aquí se parte de cero. Ver
-- CLAUDE.md, auditoría de la bolsa de empleo.
--
-- Cómo ejecutar: pégalo en Supabase → SQL Editor → Run.

create table if not exists public.ofertas_empleo (
  id serial primary key,

  puesto text not null,
  empresa text not null,
  ubicacion text,
  -- Texto libre, no numérico: los rangos reales varían y a veces es "a
  -- convenir" — forzar un numeric hubiera obligado a inventar un formato
  -- que el contenido real no sigue.
  salario text,
  tipo_contrato text,
  descripcion text,

  -- Si la empresa gestiona candidaturas fuera de IDESIE en vez del modal
  -- interno. NULL (el caso normal) usa el flujo interno de candidatura.
  enlace_externo text,

  destacada boolean not null default false,
  activa boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ofertas_empleo_activa on public.ofertas_empleo (activa);
create index if not exists idx_ofertas_empleo_created_at on public.ofertas_empleo (created_at desc);

comment on table public.ofertas_empleo is
  'Ofertas de la bolsa de empleo. Lectura pública de ofertas activas; escritura solo vía service_role.';

alter table public.ofertas_empleo enable row level security;

-- Mismo patrón que productos: cualquier visitante puede listar ofertas
-- activas sin pasar por el backend. Las despublicadas no son visibles para
-- nadie salvo service_role.
create policy "ofertas_empleo_select_activas"
  on public.ofertas_empleo
  for select
  to anon, authenticated
  using (activa = true);

drop trigger if exists set_ofertas_empleo_updated_at on public.ofertas_empleo;
create trigger set_ofertas_empleo_updated_at
  before update on public.ofertas_empleo
  for each row
  execute function public.set_updated_at();

-- --- Candidaturas -----------------------------------------------------------
-- Hoy una candidatura solo genera un email (POST /api/send-job-inquiry vía
-- Brevo) que se puede perder sin dejar rastro. Esta tabla persiste primero,
-- igual que ya hace `leads` — el email pasa a ser una notificación sobre un
-- dato que ya está guardado, no la única copia que existe.
create table if not exists public.candidaturas_empleo (
  id uuid primary key default gen_random_uuid(),

  -- NULL permite la candidatura espontánea ("envía tu CV", sin oferta
  -- concreta). ON DELETE SET NULL: si se borra la oferta, la candidatura ya
  -- recibida no debe desaparecer, solo perder la referencia.
  oferta_id integer references public.ofertas_empleo(id) on delete set null,
  -- Redundante con oferta_id a propósito: si la oferta se borra o cambia de
  -- título más adelante, la candidatura conserva el nombre del puesto tal
  -- como existía en el momento de aplicar.
  oferta_puesto text,

  nombre text not null,
  email text not null,
  telefono text not null,
  mensaje text,

  -- URL real en Vercel Blob — arregla el bug de la versión anterior, donde
  -- el CV se seleccionaba en el formulario pero nunca se subía de verdad
  -- (solo viajaba el nombre del fichero, no su contenido).
  cv_url text,

  created_at timestamptz not null default now()
);

create index if not exists idx_candidaturas_empleo_oferta_id on public.candidaturas_empleo (oferta_id);
create index if not exists idx_candidaturas_empleo_created_at on public.candidaturas_empleo (created_at desc);

comment on table public.candidaturas_empleo is
  'Candidaturas recibidas a través de la bolsa de empleo. Acceso exclusivo vía service_role — datos personales, sin ninguna policy pública.';

alter table public.candidaturas_empleo enable row level security;

-- Sin ninguna policy para anon/authenticated, ni de lectura ni de escritura:
-- son datos personales de candidatos (nombre, email, teléfono, CV). La
-- inserción la hace siempre el backend (Server Action con service_role),
-- nunca el navegador directamente contra Supabase.
