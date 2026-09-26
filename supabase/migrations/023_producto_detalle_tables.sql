-- Tablas de detalle de producto que faltaban en scripts/021: la ficha de
-- `/producto/[slug]` no solo lee `productos`, también estas 6 tablas
-- (detectado al auditar app/producto/[slug]/page.tsx para la retirada de
-- Neon — no estaban en el primer paso de la migración a Supabase).
--
-- Todas cuelgan de `productos` por FK con `on delete cascade`, y su RLS de
-- lectura pública se ata al `activo` del producto padre (no tienen su propio
-- flag de activo/inactivo): visible si y solo si el producto al que
-- pertenecen lo es.

create table if not exists public.producto_modulos (
  id serial primary key,
  producto_id integer not null references public.productos (id) on delete cascade,
  titulo text not null,
  descripcion text,
  orden integer not null default 0
);
create index if not exists idx_producto_modulos_producto_id on public.producto_modulos (producto_id);

create table if not exists public.modulo_temas (
  id serial primary key,
  modulo_id integer not null references public.producto_modulos (id) on delete cascade,
  titulo text not null,
  orden integer not null default 0
);
create index if not exists idx_modulo_temas_modulo_id on public.modulo_temas (modulo_id);

create table if not exists public.producto_dirigido (
  id serial primary key,
  producto_id integer not null references public.productos (id) on delete cascade,
  perfil text not null,
  orden integer not null default 0
);
create index if not exists idx_producto_dirigido_producto_id on public.producto_dirigido (producto_id);

create table if not exists public.producto_objetivos (
  id serial primary key,
  producto_id integer not null references public.productos (id) on delete cascade,
  objetivo text not null,
  orden integer not null default 0
);
create index if not exists idx_producto_objetivos_producto_id on public.producto_objetivos (producto_id);

create table if not exists public.producto_faqs (
  id serial primary key,
  producto_id integer not null references public.productos (id) on delete cascade,
  pregunta text not null,
  respuesta text not null,
  orden integer not null default 0
);
create index if not exists idx_producto_faqs_producto_id on public.producto_faqs (producto_id);

create table if not exists public.producto_requisitos (
  id serial primary key,
  producto_id integer not null references public.productos (id) on delete cascade,
  requisito text not null,
  orden integer not null default 0
);
create index if not exists idx_producto_requisitos_producto_id on public.producto_requisitos (producto_id);

create table if not exists public.producto_testimonios (
  id serial primary key,
  producto_id integer not null references public.productos (id) on delete cascade,
  nombre text not null,
  cargo text,
  testimonio text not null,
  orden integer not null default 0
);
create index if not exists idx_producto_testimonios_producto_id on public.producto_testimonios (producto_id);

-- --- Row Level Security -----------------------------------------------------
-- Mismo criterio en las seis: lectura pública solo si el producto padre está
-- activo (subconsulta contra `productos`); escritura exclusiva de
-- service_role. `modulo_temas` cuelga de `producto_modulos`, así que su
-- policy atraviesa dos JOIN en vez de uno.

alter table public.producto_modulos enable row level security;
create policy "producto_modulos_select_si_activo" on public.producto_modulos
  for select to anon, authenticated
  using (exists (select 1 from public.productos p where p.id = producto_id and p.activo = true));

alter table public.modulo_temas enable row level security;
create policy "modulo_temas_select_si_activo" on public.modulo_temas
  for select to anon, authenticated
  using (exists (
    select 1 from public.producto_modulos pm
    join public.productos p on p.id = pm.producto_id
    where pm.id = modulo_id and p.activo = true
  ));

alter table public.producto_dirigido enable row level security;
create policy "producto_dirigido_select_si_activo" on public.producto_dirigido
  for select to anon, authenticated
  using (exists (select 1 from public.productos p where p.id = producto_id and p.activo = true));

alter table public.producto_objetivos enable row level security;
create policy "producto_objetivos_select_si_activo" on public.producto_objetivos
  for select to anon, authenticated
  using (exists (select 1 from public.productos p where p.id = producto_id and p.activo = true));

alter table public.producto_faqs enable row level security;
create policy "producto_faqs_select_si_activo" on public.producto_faqs
  for select to anon, authenticated
  using (exists (select 1 from public.productos p where p.id = producto_id and p.activo = true));

alter table public.producto_requisitos enable row level security;
create policy "producto_requisitos_select_si_activo" on public.producto_requisitos
  for select to anon, authenticated
  using (exists (select 1 from public.productos p where p.id = producto_id and p.activo = true));

alter table public.producto_testimonios enable row level security;
create policy "producto_testimonios_select_si_activo" on public.producto_testimonios
  for select to anon, authenticated
  using (exists (select 1 from public.productos p where p.id = producto_id and p.activo = true));
