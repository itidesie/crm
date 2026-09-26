#!/usr/bin/env node
/**
 * Capturas de pantalla de todas las vistas del CRM (revisión visual). Uso:
 *   CRM_URL=http://localhost:3001 node scripts/capturas.mjs [carpeta]     (por defecto ./capturas)
 */
import puppeteer from "puppeteer-core"
import { existsSync, mkdirSync } from "node:fs"

const BASE = process.env.CRM_URL || "http://localhost:3001"
const DIR = process.argv[2] || "capturas"
const CHROME = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync)
mkdirSync(DIR, { recursive: true })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] })
const page = await browser.newPage()
const errores = []
page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`))
page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/i.test(m.text())) errores.push(`console: ${m.text().slice(0, 200)}`) })
const foto = async (nombre, opciones = {}) => { await new Promise((r) => setTimeout(r, 1300)); await page.screenshot({ path: `${DIR}/${nombre}.png`, ...opciones }); console.log("✔", nombre) }

await page.setViewport({ width: 1440, height: 900 })
await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" })
await foto("00-login")

await page.type("#email", "admin@idesie.test"); await page.type("#password", "Crm-Admin-2026")
await page.click('button[type="submit"]')
await page.waitForFunction(() => location.pathname === "/", { timeout: 30000 })
await page.waitForNetworkIdle({ idleTime: 600 })
await foto("01-inicio")
await foto("01b-inicio-completa", { fullPage: true })

for (const [ruta, nombre] of [["/bandeja", "02-bandeja"], ["/contactos", "03-contactos"], ["/admision", "05-admision"], ["/empleo", "06-empleo"], ["/pedidos", "07-pedidos"], ["/bajas", "08-bajas"], ["/tareas", "09-tareas"]]) {
  await page.goto(`${BASE}${ruta}`, { waitUntil: "networkidle0" }); await foto(nombre)
}

// Ficha de contacto
await page.goto(`${BASE}/contactos`, { waitUntil: "networkidle0" })
const href = await page.$eval('[data-testid="lista-contactos"] a', (a) => a.getAttribute("href"))
await page.goto(`${BASE}${href}`, { waitUntil: "networkidle0" }); await foto("04-ficha"); await foto("04b-ficha-completa", { fullPage: true })

// Detalle de bandeja (panel lateral)
await page.goto(`${BASE}/bandeja`, { waitUntil: "networkidle0" })
await page.click('[data-testid="fila-entrada"] button'); await foto("02b-bandeja-detalle")

// Pedido
await page.goto(`${BASE}/pedidos`, { waitUntil: "networkidle0" })
const hp = await page.$eval('[data-testid="lista-pedidos"] a', (a) => a.getAttribute("href"))
await page.goto(`${BASE}${hp}`, { waitUntil: "networkidle0" }); await foto("07b-pedido")

// Paleta de comandos y menú contraído
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" })
await page.keyboard.down("Control"); await page.keyboard.press("k"); await page.keyboard.up("Control")
await page.type('[data-testid="paleta-input"]', "gar"); await foto("10-paleta")
await page.keyboard.press("Escape")
await page.click('button[aria-label="Contraer menú"]'); await foto("11-menu-contraido")

// Móvil
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
await page.goto(`${BASE}/bandeja`, { waitUntil: "networkidle0" }); await foto("12-movil-bandeja")
await page.click('button[aria-label="Abrir menú"]'); await foto("13-movil-menu")

console.log(errores.length ? `\n⚠ Errores de consola/página:\n${errores.join("\n")}` : "\nSin errores de consola.")
await browser.close()
