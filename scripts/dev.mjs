#!/usr/bin/env node
/**
 * `pnpm dev`: arranca TODO en local con un solo comando.
 *  1) Si Supabase local no está en marcha, ejecuta `supabase start`.
 *  2) Escribe .env.local con la URL y la clave ANON locales (claves públicas de demostración del CLI).
 *  3) Arranca Next en http://localhost:3001 (o PORT=xxxx pnpm dev).
 */
import { spawn, spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const PORT = process.env.PORT || "3001"
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts })

function estado() {
  const r = sh("supabase", ["status", "-o", "env"])
  if (r.status !== 0) return null
  const env = Object.fromEntries(r.stdout.split("\n").filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")] }))
  return env.API_URL && env.ANON_KEY ? env : null
}

let env = estado()
if (!env) {
  console.log("▶ Supabase local no está en marcha: ejecutando `supabase start` (la primera vez tarda unos minutos)…")
  const r = spawnSync("supabase", ["start"], { stdio: "inherit" })
  if (r.status !== 0) { console.error("✖ `supabase start` falló. ¿Está Docker arrancado? (open -a Docker)"); process.exit(1) }
  env = estado()
}
if (!env) { console.error("✖ No se pudo leer el estado de Supabase."); process.exit(1) }

writeFileSync(".env.local", `# Generado por scripts/dev.mjs — SOLO LOCAL (claves públicas de demostración del CLI)\nNEXT_PUBLIC_SUPABASE_URL=${env.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${env.ANON_KEY}\n`)
console.log(`✔ Supabase: ${env.API_URL}   Studio: ${env.STUDIO_URL}`)
console.log(`▶ CRM en http://localhost:${PORT}`)
const next = spawn("npx", ["next", "dev", "-p", PORT], { stdio: "inherit" })
next.on("exit", (c) => process.exit(c ?? 0))
