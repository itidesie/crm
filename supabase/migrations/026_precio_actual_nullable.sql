-- Permite que productos.precio_actual sea NULL, para productos sin precio
-- público (p. ej. Executive Master BIM: "Precio no disponible, contactar").
-- Antes era NOT NULL, forzando a inventar un 0€ o un importe provisional.
-- Ver CLAUDE.md, migración del catálogo real (2026-09-03).

alter table public.productos
  alter column precio_actual drop not null;

comment on column public.productos.precio_actual is
  'Precio público del producto. NULL = sin precio publicado ("Precio no disponible, contactar" en listado y ficha) — distinto de 0, que significa gratuito (ver Curso de Revit).';
