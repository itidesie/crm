-- Añade el teléfono al formulario de contacto (/contact-page, pestaña
-- "Escribir Mensaje") — hasta ahora ese formulario no lo pedía en ningún
-- sitio (ni el <form>, ni /api/contact, ni esta tabla): no es un campo que
-- se recogiera y se descartara, simplemente no existía. Se añade opcional
-- (no todos los que escriben un mensaje quieren dejar teléfono) y nullable,
-- coherente con el resto de columnas de esta tabla (asunto/motivo/programa
-- también son opcionales).
--
-- Nombrada `telefono`, no `phone`, para ser consistente con el resto de
-- columnas de esta misma tabla (nombre/email/asunto/mensaje/motivo/programa,
-- todas en español) y con las otras 3 tablas que ya tienen teléfono
-- (solicitudes_admision, candidaturas_empleo, descargas_catalogo — las tres
-- usan `telefono`, ninguna usa `phone`). `leads` es la única excepción
-- (`phone`, en inglés) por ser una tabla anterior a esa convención.
--
-- Cómo ejecutar: pégalo en Supabase → SQL Editor → Run.

alter table public.mensajes_contacto
  add column if not exists telefono text;
