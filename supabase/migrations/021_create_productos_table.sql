-- Catálogo de productos (tienda / fichas de producto), pendiente desde la
-- decisión de migrar de Neon a Supabase (CLAUDE.md §0, 2026-09-01). Nunca
-- llegó a existir como tabla real en Neon — hasta ahora `lib/sql.ts` solo la
-- servía en modo mock (`lib/mock-data.ts`).
--
-- Esquema calcado de `MockProduct` (lib/mock-data.ts) para que, cuando se
-- conecte de verdad `getProductsSql()` a Supabase, la forma de fila no
-- cambie y no haga falta tocar las páginas que ya consumen ese tipo.
--
-- ⚠️ Los slugs reales de los 4 másteres siguen sin verificar (ver CLAUDE.md
-- §2, "PENDIENTE" en mbim-page y mbbe-page) — esta tabla se crea vacía, sin
-- inventar filas de producto. Insertar los productos reales (con sus slugs
-- correctos) es un paso posterior, ya desbloqueado por este script pero no
-- resuelto por él.

create table if not exists public.productos (
  id serial primary key,
  slug text unique not null,
  tipo text not null,
  nombre text not null,
  descripcion_corta text,
  descripcion_larga text,
  precio_actual numeric(10, 2) not null,
  precio_original numeric(10, 2),
  duracion_meses integer,
  duracion_horas integer,
  modalidad text,
  certificacion text,
  destacado boolean not null default false,
  imagen text,
  imagen_alt text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_productos_slug on public.productos (slug);
create index if not exists idx_productos_activo on public.productos (activo);

comment on table public.productos is 'Catálogo de la tienda. Lectura pública de productos activos; escritura solo vía service_role.';

-- --- Row Level Security -----------------------------------------------------
alter table public.productos enable row level security;

-- La tienda es pública: cualquier visitante (rol "anon") debe poder listar
-- productos activos sin pasar por el backend. Los inactivos (de baja, en
-- borrador) no son visibles para nadie salvo service_role.
create policy "productos_select_activos"
  on public.productos
  for select
  to anon, authenticated
  using (activo = true);

-- Sin policy de insert/update/delete para anon/authenticated: solo
-- service_role puede escribir (bypassa RLS).

drop trigger if exists set_productos_updated_at on public.productos;
create trigger set_productos_updated_at
  before update on public.productos
  for each row
  execute function public.set_updated_at();
