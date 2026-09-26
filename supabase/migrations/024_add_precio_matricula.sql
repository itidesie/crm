-- Sustituye el hack de precio de matrícula hardcodeado por slug en
-- app/producto/[slug]/page.tsx (`slug === "master-bim-full-time" || ...`,
-- con un importe fijo de 3.000 € escrito en el código) por un campo real y
-- gestionable desde /admin/tienda. Ver CLAUDE.md §2 "SEO técnico" y el
-- diagnóstico del rediseño de tienda/blog (2026-09-03).

alter table public.productos
  add column if not exists precio_matricula numeric(10, 2);

comment on column public.productos.precio_matricula is
  'Precio de reserva de plaza ("matrícula") para másteres con pago fraccionado. NULL = el producto no ofrece esta opción, solo el precio_actual completo.';

-- Migración de los 4 productos que hoy dependen del hack de slug, por si ya
-- existen en la tabla real con esos slugs exactos. Con la tabla vacía en el
-- momento de escribir esto, es un UPDATE inerte (0 filas) — se deja listo
-- para cuando existan filas reales con estos slugs. Los slugs del formulario
-- nuevo se autogeneran del nombre y pueden no coincidir exactamente: si al
-- crear estos 4 productos reales el slug generado es distinto, hay que
-- rellenar `precio_matricula` a mano desde el formulario, esta migración no
-- lo hará por ellos.
update public.productos
set precio_matricula = 3000
where slug in (
  'master-bim-full-time',
  'master-bim-online',
  'master-bim-building-engineering',
  'executive-master-bim'
)
and precio_matricula is null;
