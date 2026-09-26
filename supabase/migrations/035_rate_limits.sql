-- Rate limiting compartido por todos los endpoints públicos de formularios y
-- por el login de admin (ver lib/rate-limit.ts).
--
-- ⚠️ NO APLICADO. Es un archivo nuevo, pensado para pegarse en Supabase → SQL
-- Editor → Run, DESPUÉS de 034_mensajes_contacto_add_telefono.sql (que es de
-- otro cambio y sigue pendiente de aplicar). Mismo patrón que el resto de
-- scripts/*.sql del proyecto.
--
-- Si este script NO está aplicado, el código NO deja de funcionar: lib/rate-limit.ts
-- registra el error en el log del servidor y cae a un contador en memoria por
-- instancia (mucho más débil en serverless, pero mejor que nada). Aplicarlo es
-- lo que hace que el límite sea real y compartido entre todas las instancias.
--
-- Diseño: ventana fija. Cada petición hace un upsert atómico sobre
-- (bucket, key_hash, window_start) e incrementa el contador; la comparación
-- con el máximo la hace la propia función. La clave NO se guarda en claro: la
-- aplicación manda un HMAC-SHA256 de la IP o del email, así que esta tabla no
-- contiene datos personales legibles.
--
-- Limitación conocida de la ventana fija: en el borde entre dos ventanas puede
-- colarse hasta 2× el máximo en un intervalo corto. Aceptable para este uso.

create table if not exists public.rate_limits (
  bucket text not null,          -- p. ej. 'admin-login', 'contact-ip', 'send-catalog-email'
  key_hash text not null,        -- HMAC-SHA256 hex de la IP o el email (nunca el valor en claro)
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, key_hash, window_start)
);

create index if not exists idx_rate_limits_window_start on public.rate_limits (window_start);

comment on table public.rate_limits is
  'Contadores de rate limiting (ventana fija). Claves hasheadas. Acceso exclusivo vía service_role — sin ninguna policy pública.';

alter table public.rate_limits enable row level security;
-- Sin ninguna policy para anon/authenticated: solo la llama el backend con
-- service_role, igual que el resto de tablas internas del proyecto.

-- Incrementa el contador de la ventana actual y dice si la petición cabe.
-- Devuelve:
--   allowed             → true si current_hits <= p_max
--   current_hits        → nº de peticiones en la ventana actual, incluida esta
--   retry_after_seconds → segundos hasta que empieza la ventana siguiente
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_key_hash text,
  p_window_seconds integer,
  p_max integer
)
returns table (allowed boolean, current_hits integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_window_seconds < 1 or p_max < 1 then
    raise exception 'rate_limit_hit: parámetros inválidos';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (bucket, key_hash, window_start, hits)
  values (p_bucket, p_key_hash, v_window_start, 1)
  on conflict (bucket, key_hash, window_start)
  do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Limpieza oportunista (≈2 % de las llamadas) para no necesitar un cron.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return query
    select
      v_hits <= p_max,
      v_hits,
      greatest(1, ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - now())))::integer);
end;
$$;

-- Solo el backend (service_role) puede ejecutarla: si anon pudiera, cualquiera
-- podría llenar la tabla o agotar el límite de otra persona.
revoke all on function public.rate_limit_hit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, integer, integer) to service_role;
