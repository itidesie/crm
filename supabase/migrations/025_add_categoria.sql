-- Sustituye el filtro de categoría por substring en el nombre del producto
-- (duplicado en tienda-client.tsx y product-grid.tsx, buscando "bim",
-- "sql", "energía"... dentro de `nombre`) por un campo real y gestionable
-- desde /admin/tienda. Parte del rediseño de tienda "El Catálogo Técnico"
-- (2026-09-03).

alter table public.productos
  add column if not exists categoria text;

comment on column public.productos.categoria is
  'Categoría temática del producto (BIM, Programación, Energía...) para el filtro de /tienda. NULL = sin categoría asignada, solo aparece en "Todos".';

create index if not exists idx_productos_categoria on public.productos (categoria);
