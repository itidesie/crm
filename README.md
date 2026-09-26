# IDESIE CRM

CRM interno de IDESIE. App **independiente** de la web (`WebIdesie`): comparte base de datos con ella, pero vive en su propio repositorio. La web usa el esquema `public`; el CRM usa el esquema `crm` y lee las tablas de formularios de la web.

> **Todo lo de este README es LOCAL.** No hay claves de producción ni despliegue. La base es un Supabase local en Docker con datos falsos.

## Requisitos

- Node 20+ y pnpm (`npm i -g pnpm`)
- Docker Desktop arrancado
- Supabase CLI (`brew install supabase/tap/supabase`)

## Arrancar de cero

```bash
pnpm install
pnpm dev
```

`pnpm dev` hace todo: arranca Supabase local si no lo está (aplica migraciones y datos de ejemplo la primera vez), escribe `.env.local` con la URL y la clave anónima locales y lanza Next.js.

- CRM: **http://localhost:3001** (si el puerto está ocupado: `PORT=3011 pnpm dev`)
- Studio (BD): http://127.0.0.1:55323
- Mailpit (correos locales): http://127.0.0.1:55324
- API Supabase: http://127.0.0.1:55321 (los puertos son 55xxx para no chocar con otros Supabase locales)

## Usuarios de prueba (solo local)

| Rol | Email | Contraseña | Puede |
|---|---|---|---|
| Administrador | `admin@idesie.test` | `Crm-Admin-2026` | Todo |
| Comercial | `comercial@idesie.test` | `Crm-Comercial-2026` | Ver todo; editar solo lo suyo o lo que no tiene responsable |
| Lectura | `lectura@idesie.test` | `Crm-Lectura-2026` | Solo ver |

Los permisos se aplican en la base de datos (RLS + GRANTs por columna), no solo en la interfaz. El registro abierto de usuarios está desactivado.

## Resetear la base con datos de ejemplo

```bash
pnpm db:reset
```

Reconstruye la base desde cero: aplica `supabase/migrations/*` y `supabase/seed.sql` (≈60 personas ficticias, formularios de los últimos 6 meses, el mismo email escrito de varias formas, unificación ya ejecutada, trabajo simulado del equipo). Hazlo tras cualquier prueba que ensucie datos (por ejemplo, `pnpm smoke`).

Para regenerar el seed (determinista): `pnpm seed:generar`, y luego `pnpm db:reset`.

Otros: `pnpm db:stop` (para Supabase), `pnpm typecheck`, `pnpm build`.

## Prueba de humo end-to-end

Con la app arrancada:

```bash
CRM_URL=http://localhost:3001 pnpm smoke
```

Usa Chrome (puppeteer-core): protección de rutas, login con cada rol, todas las pantallas, permisos por rol (UI y API), registro de actividad, arrastre en el kanban, marcar baja, y Realtime (inserta una fila en una tabla de formulario por SQL y comprueba que aparece en la bandeja sin recargar). **Modifica datos** → después `pnpm db:reset`.

## Cómo funciona

- **Migraciones** (`supabase/migrations`): `020…036` son copias literales de los `scripts/` de la web (esquema `public`); `037…041` son del CRM:
  - `037` roles y esquemas · `038` núcleo (contactos, entradas, pipelines, oportunidades, notas, tareas…) · `039` RLS y permisos · `040` registro automático de actividades (triggers) · `041` unificación y cron.
- **Unificación**: la identidad es el email normalizado (`lower(btrim(email))`). `crm.procesar_entradas()` lee la vista `crm.v_entradas_web` (formularios de la web), crea/une contactos, entradas y oportunidades. Es idempotente. Se ejecuta con pg_cron cada 30 s y cuando la bandeja abierta hace latido (15 s).
- **Realtime**: `entradas`, `oportunidades` y `tareas`.
- **`actividades`**: solo la escriben triggers de la BD; ningún rol de usuario puede insertar directamente.

## Pantallas

Inicio (contadores) · Bandeja (filtros, leído/no leído, búsqueda, tiempo real) · Contactos (ficha con línea de tiempo, notas, tareas, no contactar) · Admisión (kanban + lista) · Empleo · Pedidos · Bajas · Tareas.

## Fuera del MVP

Módulos de catálogo/cupones/ofertas de empleo, webhook de pago Flywire, sustitución de Calendly, función de supresión RGPD, MFA, diseño móvil, envío de emails desde el CRM, permisos de escritura del rol `web_app`.

## Problemas típicos

- `supabase start` falla por puertos: los del CRM son 55320–55329; cambia `supabase/config.toml` si los usas.
- Login falla tras un reset con la app abierta: recarga la página (la sesión antigua ya no existe).
- "Email logins are disabled": no pongas `[auth.email] enable_signup=false`; el registro abierto se cierra con `[auth] enable_signup=false`.
