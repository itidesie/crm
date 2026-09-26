#!/usr/bin/env node
/**
 * Prueba de humo del CRM (Chrome real + API). Uso:  pnpm smoke            (CRM en http://localhost:3001)
 *                                                    CRM_URL=http://localhost:3011 pnpm smoke
 * Necesita: Supabase local en marcha, el CRM en marcha y Google Chrome instalado.
 */
import puppeteer from "puppeteer-core"
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"

const BASE = process.env.CRM_URL || "http://localhost:3001"
const API = process.env.SUPABASE_API_URL || "http://127.0.0.1:55321"
const DB_CONTAINER = "supabase_db_idesie-crm"
const CHROME = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync)
const ANON = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" }).split("\n").find((l) => l.startsWith("ANON_KEY="))?.split("=")[1].replace(/"/g, "")

const USERS = {
  admin: { email: "admin@idesie.test", password: "Crm-Admin-2026" },
  comercial: { email: "comercial@idesie.test", password: "Crm-Comercial-2026" },
  lectura: { email: "lectura@idesie.test", password: "Crm-Lectura-2026" },
}

let fallos = 0
const ok = (cond, msg, extra = "") => { console.log(`  ${cond ? "✔" : "✖"} ${msg}${!cond && extra ? `  → ${extra}` : ""}`); if (!cond) fallos++ }
const sql = (q) => execFileSync("docker", ["exec", DB_CONTAINER, "psql", "-U", "postgres", "-At", "-c", q], { encoding: "utf8" }).trim()
const esperar = async (fn, ms = 60000, paso = 500) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, paso)) } return null }

async function token(u) {
  const r = await fetch(`${API}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(USERS[u]) })
  return (await r.json()).access_token
}
async function rest(u, method, path, body) {
  const t = await token(u)
  const r = await fetch(`${API}/rest/v1/${path}`, { method, headers: { apikey: ANON, Authorization: `Bearer ${t}`, "Accept-Profile": "crm", "Content-Profile": "crm", "Content-Type": "application/json", Prefer: "return=representation" }, body: body ? JSON.stringify(body) : undefined })
  const txt = await r.text(); let json; try { json = JSON.parse(txt) } catch { json = txt }
  return { status: r.status, json }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] })

async function sesion(u) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage(); await page.setViewport({ width: 1440, height: 900 })
  const errores = []
  page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`))
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource.*(401|404)/i.test(m.text())) errores.push(`console: ${m.text().slice(0, 160)}`) })
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" })
  await page.type("#email", USERS[u].email); await page.type("#password", USERS[u].password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 })   // el redirect de la Server Action es navegación de cliente
  await page.waitForNetworkIdle({ idleTime: 500 })
  return { ctx, page, errores }
}
const ERROR_UI = /Application error|Unhandled Runtime Error|This page couldn.t load|Internal Server Error|Something went wrong/i

async function visitar(page, errores, ruta, esperado) {
  errores.length = 0
  const resp = await page.goto(`${BASE}${ruta}`, { waitUntil: "networkidle0" })
  const h1 = await page.$eval("h1", (e) => e.textContent).catch(() => null)
  const cuerpo = await page.$eval("body", (b) => b.innerText)
  const fallo = resp.status() >= 400 || ERROR_UI.test(cuerpo) || !h1 || (esperado && !h1.includes(esperado))
  ok(!fallo && errores.length === 0, `${ruta.padEnd(28)} → «${(h1 ?? "sin h1").slice(0, 40)}»`, `estado ${resp.status()} ${errores[0] ?? ""}`)
}

try {
  // ── 0) Sin sesión no se entra ─────────────────────────────────────────────────
  console.log("\n▸ Protección de rutas")
  {
    const ctx = await browser.createBrowserContext(); const p = await ctx.newPage()
    await p.goto(`${BASE}/bandeja`, { waitUntil: "networkidle0" })
    ok(new URL(p.url()).pathname === "/login", "sin sesión, /bandeja redirige a /login")
    await p.type("#email", USERS.admin.email); await p.type("#password", "mala-contraseña"); await p.click('button[type="submit"]')
    const msg = await esperar(async () => (await p.$('[role="alert"]')) && (await p.$eval('[role="alert"]', (e) => e.textContent)), 8000)
    ok(!!msg && /incorrectos/.test(msg), "contraseña incorrecta muestra error y no entra")
    await ctx.close()
  }

  // ── 1) Cada usuario: entra y recorre todas las pantallas ───────────────────────
  const ids = { contacto: sql("select id from crm.contactos where nombre is not null order by creado_at limit 1"), pedido: sql("select id from crm.entradas where tipo='pedido' order by recibido_at desc limit 1") }
  const PANTALLAS = [["/", "Hola"], ["/bandeja", "Bandeja"], ["/contactos", "Contactos"], [`/contactos/${ids.contacto}`, null], ["/admision", "Pipeline de admisión"], ["/empleo", "Pipeline de empleo"],
    ["/pedidos", "Pedidos"], [`/pedidos/${ids.pedido}`, "Pedido #"], ["/bajas", "Solicitudes de baja"], ["/tareas", "Tareas"], ["/tareas?vista=vencidas", "Tareas"], ["/tareas?vista=todas", "Tareas"]]
  const sesiones = {}
  for (const u of Object.keys(USERS)) {
    console.log(`\n▸ Usuario: ${u}`)
    const s = await sesion(u); sesiones[u] = s
    const rol = await s.page.$eval('[data-testid="usuario-rol"]', (e) => e.textContent).catch(() => null)
    ok(!!rol, `entra correctamente (rol mostrado: ${rol})`)
    for (const [ruta, h] of PANTALLAS) await visitar(s.page, s.errores, ruta, h)
  }

  // ── 2) Permisos por rol: interfaz ──────────────────────────────────────────────
  console.log("\n▸ Permisos por rol (interfaz)")
  const ficha = async (u) => { const s = sesiones[u]; await s.page.goto(`${BASE}/contactos/${ids.contacto}`, { waitUntil: "networkidle0" }); return s.page }
  {
    const pl = await ficha("lectura")
    ok(!(await pl.$('[data-testid="guardar-contacto"]')), "lectura: la ficha NO tiene botón «Guardar cambios»")
    ok(!(await pl.$('[data-testid="nota-guardar"]')), "lectura: la ficha NO permite añadir notas")
    ok(!(await pl.evaluate(() => document.body.innerText.includes("Consentimientos"))), "lectura: no ve los consentimientos")
    const pa = await ficha("admin")
    ok(!!(await pa.$('[data-testid="guardar-contacto"]')), "admin: la ficha tiene «Guardar cambios»")
    ok(await pa.evaluate(() => document.body.innerText.includes("Consentimientos")), "admin: ve los consentimientos")
    const pc = await ficha("comercial")
    ok(!(await pc.evaluate(() => document.body.innerText.includes("Consentimientos"))), "comercial: no ve los consentimientos")
  }

  // ── 3) Permisos por rol: BASE DE DATOS (la API, sin pasar por la interfaz) ────
  console.log("\n▸ Permisos por rol (RLS, directamente contra la API)")
  const entradaLibre = sql("select id from crm.entradas where asignado_a is null order by recibido_at desc limit 1")
  const oppDeOtro = sql("select id from crm.oportunidades where propietario_id='11111111-1111-4111-8111-111111111111' limit 1") ||
    sql("update crm.oportunidades set propietario_id='11111111-1111-4111-8111-111111111111' where id=(select id from crm.oportunidades where propietario_id is null limit 1) returning id").split("\n")[0]
  const cid = ids.contacto
  let r = await rest("lectura", "PATCH", `entradas?id=eq.${entradaLibre}`, { estado: "en_gestion" })
  ok(Array.isArray(r.json) && r.json.length === 0, "lectura no puede cambiar el estado de una entrada (0 filas)", JSON.stringify(r.json).slice(0, 80))
  r = await rest("lectura", "POST", "notas", { contacto_id: cid, texto: "intento", autor_id: "33333333-3333-4333-8333-333333333333" })
  ok(r.status >= 400, "lectura no puede crear notas (RLS)", `status ${r.status}`)
  r = await rest("comercial", "PATCH", `oportunidades?id=eq.${oppDeOtro}`, { titulo: "hackeado" })
  ok(Array.isArray(r.json) && r.json.length === 0, "comercial no puede editar una oportunidad asignada a OTRA persona")
  r = await rest("comercial", "POST", "actividades", { tipo: "sistema", titulo: "falsa" })
  ok(r.status >= 400, "comercial no puede escribir en el historial (actividades)", `status ${r.status}`)
  r = await rest("comercial", "PATCH", `entradas?id=eq.${entradaLibre}`, { estado: "en_gestion" })
  ok(Array.isArray(r.json) && r.json.length === 1, "comercial SÍ puede gestionar una entrada sin asignar")
  r = await rest("comercial", "PATCH", `usuarios?id=eq.22222222-2222-4222-8222-222222222222`, { rol: "admin" })
  ok(r.status >= 400 || (Array.isArray(r.json) && r.json.length === 0), "comercial no puede subirse el rol a admin")
  r = await rest("admin", "PATCH", `oportunidades?id=eq.${oppDeOtro}`, { titulo: sql(`select titulo from crm.oportunidades where id='${oppDeOtro}'`) })
  ok(Array.isArray(r.json) && r.json.length === 1, "admin SÍ puede editar cualquier oportunidad")

  // ── 4) Cambios de usuario → actividades ────────────────────────────────────────
  console.log("\n▸ Registro de actividad")
  {
    const antes = Number(sql(`select count(*) from crm.actividades where contacto_id='${cid}'`))
    const pc = await ficha("comercial")
    await pc.type('[data-testid="nota-texto"]', "Nota de prueba desde el test de humo")
    await pc.click('[data-testid="nota-guardar"]')
    const guardada = await esperar(async () => Number(sql(`select count(*) from crm.actividades where contacto_id='${cid}'`)) > antes, 10000)
    ok(!!guardada, "añadir una nota desde la interfaz crea una actividad")
    const quien = sql(`select coalesce(u.nombre,'(sistema)') from crm.actividades a left join crm.usuarios u on u.id=a.usuario_id where a.contacto_id='${cid}' and a.tipo='nota' order by a.ocurrio_at desc limit 1`)
    ok(quien === "Carlos Comercial", "la actividad queda a nombre de quien la hizo", quien)
  }

  // ── 5) Kanban: arrastrar una tarjeta ────────────────────────────────────────────
  console.log("\n▸ Pipeline de admisión (arrastrar y soltar)")
  {
    const page = sesiones.admin.page
    await page.goto(`${BASE}/admision`, { waitUntil: "networkidle0" })
    // Columnas contiguas para que ambas estén a la vista (el tablero tiene scroll horizontal)
    const tarjeta = await page.$('[data-testid="kanban"] [data-etapa="Solicitud recibida"] [data-testid="tarjeta-oportunidad"]')
    const destino = await page.$('[data-testid="kanban"] [data-etapa="Sesión realizada"]')
    if (!tarjeta || !destino) ok(false, "hay una tarjeta en «Solicitud recibida»")
    else {
      const oppId = await tarjeta.evaluate((e) => e.getAttribute("data-opp"))
      await tarjeta.evaluate((e) => e.scrollIntoView({ block: "center", inline: "center" }))
      const a = await tarjeta.boundingBox(); const b = await destino.boundingBox()
      const yDestino = Math.min(Math.max(b.y + 100, 120), 700)
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down()
      await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 5 })
      await page.mouse.move(b.x + b.width / 2, yDestino, { steps: 30 }); await page.mouse.up()
      const movida = await esperar(async () => sql(`select e.nombre from crm.oportunidades o join crm.etapas e on e.id=o.etapa_id where o.id='${oppId}'`) === "Sesión realizada", 10000)
      ok(!!movida, "arrastrar la tarjeta de «Solicitud recibida» a «Sesión realizada» actualiza la base de datos")
      const act = sql(`select count(*) from crm.actividades where oportunidad_id='${oppId}' and tipo='cambio_etapa' and usuario_id='11111111-1111-4111-8111-111111111111' and titulo like '%→ Sesión realizada'`)
      ok(Number(act) >= 1, "y queda registrado en actividades a nombre del admin")
    }
    // lectura: las tarjetas no se pueden arrastrar (y aunque lo intentara, la RLS lo impide: comprobado arriba)
    const pl = sesiones.lectura.page; await pl.goto(`${BASE}/admision`, { waitUntil: "networkidle0" })
    ok(await pl.evaluate(() => document.body.innerText.includes("solo lectura")), "lectura ve el aviso de solo lectura en el pipeline")
  }

  // ── 6) Bajas ────────────────────────────────────────────────────────────────────
  console.log("\n▸ Solicitudes de baja")
  {
    const page = sesiones.admin.page
    await page.goto(`${BASE}/bajas`, { waitUntil: "networkidle0" })
    const filas = await page.$$('[data-testid="fila-baja"]')
    ok(filas.length >= 1, `se listan las bajas (${filas.length})`)
    const cId = sql("select contacto_id from crm.entradas where tipo='baja' limit 1")
    sql(`update crm.contactos set no_contactar=false where id='${cId}'`)
    await page.goto(`${BASE}/bajas`, { waitUntil: "networkidle0" })
    const btn = await page.$('[data-testid="fila-baja"] [data-testid="btn-no-contactar"]')
    await page.evaluate(() => [...document.querySelectorAll('[data-testid="btn-no-contactar"]')].find((b) => /Marcar/.test(b.textContent))?.click())
    const marcado = await esperar(async () => sql(`select count(*) from crm.contactos where no_contactar and id in (select contacto_id from crm.entradas where tipo='baja')`) !== "0", 8000)
    ok(!!btn && !!marcado, "la acción «Marcar no contactar» actualiza el contacto")
  }

  // ── 7) Tiempo real: una entrada nueva desde SQL aparece SIN recargar ────────────
  console.log("\n▸ Tiempo real")
  {
    const page = sesiones.admin.page
    await page.goto(`${BASE}/bandeja`, { waitUntil: "networkidle0" })
    await esperar(async () => (await page.$eval('[data-testid="estado-realtime"]', (e) => e.getAttribute("data-vivo")).catch(() => "false")) === "true", 15000)
    ok((await page.$eval('[data-testid="estado-realtime"]', (e) => e.getAttribute("data-vivo"))) === "true", "el indicador muestra «En vivo» (canal Realtime suscrito)")
    await page.evaluate(() => { window.__marca = "sin-recarga" })
    const antes = Number((await page.$eval('[data-testid="total-entradas"]', (e) => e.textContent)).match(/\d+/)[0])
    const email = `tiempo.real.${Date.now()}@ejemplo.test`
    sql(`insert into public.mensajes_contacto (nombre, email, telefono, asunto, mensaje) values ('Prueba Tiempo Real', '  ${email.toUpperCase()}  ', '+34 600 000 000', 'Test realtime', 'Insertado desde SQL por el test de humo')`)
    const t0 = Date.now()
    const aparece = await esperar(async () => (await page.$$eval('[data-testid="fila-entrada"]', (f, e) => f.some((r) => r.innerText.toLowerCase().includes(e)), email)), 75000, 400)
    const seg = ((Date.now() - t0) / 1000).toFixed(1)
    ok(!!aparece, `la entrada insertada por SQL aparece en la bandeja en ${seg} s`)
    ok((await page.evaluate(() => window.__marca)) === "sin-recarga", "…sin recargar la página")
    const despues = Number((await page.$eval('[data-testid="total-entradas"]', (e) => e.textContent)).match(/\d+/)[0])
    ok(despues === antes + 1, `el contador pasa de ${antes} a ${despues}`)
    sql(`delete from public.mensajes_contacto where nombre='Prueba Tiempo Real'`)
  }
} finally {
  await browser.close()
}
console.log(`\n${fallos === 0 ? "✅ TODO CORRECTO" : `❌ ${fallos} comprobación(es) fallida(s)`}`)
process.exit(fallos === 0 ? 0 : 1)
