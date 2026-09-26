-- Puerto a Supabase del resto de tablas que hoy viven en Neon
-- (`blog_posts`, `admin_users`, `applications`, `orders`, `order_items`,
-- `coupons`). Esquema calcado de los scripts originales de Neon
-- (001, 002, 015, lib/db-helpers.ts, 010) más RLS, que Neon no tenía.
--
-- 🔴 IMPORTANTE — esto crea el ESQUEMA, no migra los DATOS ni el CÓDIGO.
-- `lib/sql.ts`, `lib/applications-db.ts` y `lib/db-helpers.ts` siguen
-- consultando Neon (vía `@neondatabase/serverless`) tal cual estaban; nada
-- del código de la aplicación apunta todavía a estas tablas de Supabase.
-- Migrar ese código (cambiar `neon()` por el cliente de Supabase o por `pg`
-- contra la cadena de conexión de Supabase, y volcar los datos reales de
-- Neon) es un trabajo aparte, no incluido en este encargo — ver CLAUDE.md.
-- Se crea el esquema ahora para no bloquear ese trabajo futuro y para tener
-- ya en Supabase el resto de tablas del proyecto, tal como se pidió.

-- --- blog_posts --------------------------------------------------------------
create table if not exists public.blog_posts (
  id serial primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  content text not null,
  author text not null,
  published boolean not null default false,
  tags jsonb,
  featured_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_blog_posts_slug on public.blog_posts (slug);
create index if not exists idx_blog_posts_published on public.blog_posts (published);
create index if not exists idx_blog_posts_created_at on public.blog_posts (created_at desc);

alter table public.blog_posts enable row level security;
-- El blog es público, pero solo los posts publicados.
create policy "blog_posts_select_published"
  on public.blog_posts for select to anon, authenticated
  using (published = true);

drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- --- admin_users --------------------------------------------------------------
-- ⚠️ Deuda de seguridad ya documentada (CLAUDE.md §4): en Neon
-- `password_hash` se compara en texto plano, sin hashing real. Se conserva
-- el mismo nombre de columna para no romper `app/api/admin/auth/route.ts`,
-- pero migrar a Supabase es "buena ocasión para arreglarlo" (bcrypt, o
-- Supabase Auth directamente) — deliberadamente NO se resuelve en este
-- script: es un cambio de lógica de autenticación, no de esquema, y no
-- estaba entre lo pedido.
create table if not exists public.admin_users (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz
);
create index if not exists idx_admin_users_username on public.admin_users (username);

alter table public.admin_users enable row level security;
-- Sin ninguna policy: ni anon ni authenticated pueden leer esta tabla bajo
-- ningún concepto. Solo service_role, exactamente como pidió el encargo.

drop trigger if exists set_admin_users_updated_at on public.admin_users;
create trigger set_admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- --- applications --------------------------------------------------------------
create table if not exists public.applications (
  id serial primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  mobile_phone text,
  address text,
  postal_code text,
  city text,
  nationality text,
  id_passport text,
  date_of_birth date,
  place_of_birth text,
  university_history text,
  degree text,
  year_of_study text,
  average_grade text,
  additional_education text,
  certifications text,
  work_usage_languages text,
  language_spoken text,
  language_spoken_level text,
  language_written_level text,
  professional_experience text,
  declaration_agreed boolean not null default false,
  signature_name text,
  signature_place text,
  signature_date date,
  gdpr_agreed boolean not null default false,
  full_form_json jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_applications_email on public.applications (email);
create index if not exists idx_applications_created_at on public.applications (created_at desc);

alter table public.applications enable row level security;
-- Datos personales sensibles (DNI, fecha de nacimiento...): sin ninguna
-- policy pública, exactamente como `leads`.

drop trigger if exists set_applications_updated_at on public.applications;
create trigger set_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- --- orders / order_items -----------------------------------------------------
-- Esquema mínimo que refleja lo que `lib/db-helpers.ts` inserta hoy de
-- verdad (customer_email, customer_name, status, total_amount) — no lo que
-- sus tipos TypeScript aceptan como parámetro. Los campos de envío
-- (shipping_*) que `createOrder()` recibe pero nunca persiste se añaden
-- aquí como columnas nullable, listas para cuando ese hueco se cierre; no es
-- parte de este encargo arreglarlo, solo se deja constancia.
create table if not exists public.orders (
  id serial primary key,
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  payment_id text,
  status text not null default 'pending',
  total_amount numeric(10, 2) not null,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_postal_code text,
  shipping_country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_payment_id on public.orders (payment_id);
create index if not exists idx_orders_customer_email on public.orders (customer_email);

create table if not exists public.order_items (
  id serial primary key,
  order_id integer not null references public.orders (id) on delete cascade,
  product_id integer,
  product_name text not null,
  quantity integer not null default 1,
  price numeric(10, 2) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order_id on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
-- Datos de pago: sin ninguna policy pública, solo service_role.

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- --- coupons --------------------------------------------------------------
-- Nota: hoy `/api/coupons/validate` valida contra una lista hardcodeada en el
-- propio código (`COUPONS_FALLBACK`), no contra esta tabla — la tabla existía
-- en Neon pero no está conectada a ningún endpoint real. Se migra el esquema
-- por completitud; conectar la validación a esta tabla es un cambio aparte.
create table if not exists public.coupons (
  id serial primary key,
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10, 2) not null,
  is_active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  max_uses integer,
  current_uses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coupons enable row level security;
-- Sin policy pública: la validación pasa por un endpoint de backend, no por
-- una consulta directa del navegador a esta tabla.

drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();
