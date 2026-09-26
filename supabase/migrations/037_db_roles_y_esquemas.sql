-- 037 · Esquemas y roles (docs/diseno-crm.md §2, §3)
--
-- · `crm`     : esquema propio del CRM (dueño: crm_owner).
-- · `api_web` : contrato de funciones/vistas que usará la web (fases posteriores).
-- · public    : sigue siendo de la web. Aquí solo se le QUITAN los permisos por defecto
--               de Supabase a anon/authenticated (la web usa service_role, que no se ve afectada).
--
-- Los roles login (web_app, crm_worker) se crean SIN contraseña: no pueden autenticarse
-- hasta que se les asigne una explícitamente (nunca se versionan contraseñas).

create schema if not exists crm;
create schema if not exists api_web;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'crm_owner') then
    create role crm_owner nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'web_app') then
    create role web_app login noinherit connection limit 30;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'crm_worker') then
    create role crm_worker login noinherit connection limit 10;
  end if;
end $$;

grant crm_owner to postgres;
alter schema crm owner to crm_owner;
alter schema api_web owner to crm_owner;
alter role web_app set statement_timeout = '5s';
alter role crm_worker set statement_timeout = '60s';

-- 1) public: quitar los permisos por defecto de Supabase a anon/authenticated
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- (los objetos de public que crea supabase_admin siguen su propia regla; se intenta igual)
do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public revoke execute on functions from public, anon, authenticated';
exception when others then
  raise notice 'alter default privileges for supabase_admin omitido: %', sqlerrm;
end $$;

-- 2) crm y api_web: nada para anon; las funciones nuevas no son ejecutables por PUBLIC
revoke all on schema crm     from public, anon;
revoke all on schema api_web from public, anon, authenticated;
alter default privileges in schema crm     revoke execute on functions from public;
alter default privileges in schema api_web revoke execute on functions from public;

-- 3) Uso del esquema crm por el CRM (los permisos por tabla se dan en 039)
grant usage on schema crm to authenticated, crm_worker;
grant usage on schema crm to authenticator;   -- PostgREST cambia de rol desde authenticator

-- 4) crm_owner (dueño de las funciones "security definer") lee las tablas de la web
grant usage on schema public to crm_owner;
grant select on public.leads, public.solicitudes_admision, public.mensajes_contacto,
                public.descargas_catalogo, public.candidaturas_empleo,
                public.orders, public.order_items, public.solicitudes_baja to crm_owner;
