/**
 * Prueba del inicio de sesión: detección de rol, cuenta sin alta en el CRM, contraseña incorrecta y caducidad de sesión.
 * Necesita Supabase local en marcha, una cuenta sin alta (sinacceso@idesie.test / Sin-Acceso-2026, créala en Studio)
 * y el CRM en el puerto 3011 arrancado con la sesión acortada a 25 s:
 *   NEXT_PUBLIC_SUPABASE_URL=<local> NEXT_PUBLIC_SUPABASE_ANON_KEY=<local> CRM_SESION_SEGUNDOS=25 npx next dev -p 3011
 *   node scripts/prueba-sesion.mjs
 */
import puppeteer from "puppeteer-core"
const B = "http://localhost:3011"
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] })
const ok = (c, m) => console.log(c ? "  ✔" : "  ✖", m)
async function entrar(p, email, pass) {
  await p.goto(`${B}/login`, { waitUntil: "networkidle0" })
  await p.type("#email", email); await p.type("#password", pass); await p.click('button[type="submit"]')
  await Promise.race([p.waitForFunction(() => location.pathname === "/", { timeout: 15000 }).catch(() => {}), p.waitForSelector('[role="alert"]', { timeout: 15000 }).catch(() => {})])
  await p.waitForNetworkIdle({ idleTime: 400 }).catch(() => {})
}
// 1) Admin: se detecta el rol
let c = await b.createBrowserContext(); let p = await c.newPage()
await entrar(p, "admin@idesie.test", "Crm-Admin-2026")
ok(p.url() === `${B}/`, "admin entra y llega al inicio")
ok((await p.$eval('[data-testid="usuario-rol"]', e => e.textContent)) === "Administrador", "se detecta el rol «Administrador»")
const ck = await p.cookies(); const sb = ck.filter(x => x.name.startsWith("sb-"))
const vida = Math.round((sb[0].expires - Date.now() / 1000))
console.log(`  cookies de sesión: ${sb.length}, caducan en ~${vida}s (esperado ≈ 325 s en esta prueba)`)
ok(vida <= 326 && vida > 0, "la cookie de sesión tiene la duración configurada (no 400 días)")
// 2) Sigue dentro antes de caducar
await p.goto(`${B}/bandeja`, { waitUntil: "networkidle0" }); ok(new URL(p.url()).pathname === "/bandeja", "antes de caducar, sigue con la sesión iniciada")
// 3) Caduca
await new Promise(r => setTimeout(r, 27000))
await p.goto(`${B}/bandeja`, { waitUntil: "networkidle0" })
ok(p.url().includes("/login") && p.url().includes("expirada=1"), `pasado el límite, redirige a /login?expirada=1  (${p.url()})`)
ok(await p.$('[data-testid="aviso-expirada"]') !== null, "muestra el aviso de sesión caducada")
// 4) Volver a entrar funciona (sin bucle)
await entrar(p, "admin@idesie.test", "Crm-Admin-2026"); ok(p.url() === `${B}/`, "tras caducar, puede volver a entrar")
// 5) Cuenta sin alta en el CRM
let c2 = await b.createBrowserContext(); let p2 = await c2.newPage()
await entrar(p2, "sinacceso@idesie.test", "Sin-Acceso-2026")
const msg = await p2.$eval('[role="alert"]', e => e.textContent).catch(() => null)
ok(msg && /no tiene acceso al CRM/.test(msg), `cuenta sin alta en crm.usuarios: «${msg}»`)
ok(p2.url().includes("/login"), "y no entra (se queda en el login, sin bucle de redirecciones)")
await p2.goto(`${B}/`, { waitUntil: "networkidle0" }); ok(p2.url().includes("/login"), "tampoco puede saltar al inicio: no quedó sesión abierta")
// 6) Contraseña incorrecta
let c3 = await b.createBrowserContext(); let p3 = await c3.newPage()
await entrar(p3, "admin@idesie.test", "mala")
ok((await p3.$eval('[role="alert"]', e => e.textContent).catch(() => "")).includes("incorrectos"), "contraseña incorrecta → mensaje de error")
// 7) Otros roles
for (const [em, pw, rol] of [["comercial@idesie.test", "Crm-Comercial-2026", "Comercial"], ["lectura@idesie.test", "Crm-Lectura-2026", "Solo lectura"]]) {
  const cx = await b.createBrowserContext(); const px = await cx.newPage(); await entrar(px, em, pw)
  ok((await px.$eval('[data-testid="usuario-rol"]', e => e.textContent).catch(() => null)) === rol, `${em} → rol «${rol}»`)
}
await b.close()
