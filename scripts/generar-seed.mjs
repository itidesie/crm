#!/usr/bin/env node
/**
 * Genera supabase/seed.sql con DATOS FALSOS pero realistas (español):
 *  · 60 personas repartidas en TODAS las tablas de formularios de la web (esquema public);
 *  · algunas personas aparecen en varios formularios con el MISMO email escrito distinto
 *    (mayúsculas, espacios) para probar la unificación de contactos;
 *  · fechas repartidas en los últimos ~6 meses (relativas a now(): el seed siempre está "fresco");
 *  · 3 usuarios de prueba en Auth (admin, comercial, lectura) + el proceso de unificación;
 *  · algo de "trabajo del equipo" (asignaciones, notas, tareas, cambios de etapa) para ver el historial.
 * Determinista (PRNG con semilla): mismo seed.sql en cada ejecución.   Uso: pnpm seed:generar
 */
import { writeFileSync } from "node:fs"

let s = 20260926
const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`)
const ago = (days, h = int(0, 23), m = int(0, 59)) => `now() - interval '${days} days ${h} hours ${m} minutes'`
const plano = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "")

const NOMBRES = ["María","Laura","Carmen","Ana","Lucía","Paula","Marta","Elena","Sara","Cristina","Patricia","Isabel","Pilar","Rocío","Beatriz","Sofía","Andrea","Claudia","Alba","Irene",
  "Javier","Carlos","David","Miguel","Alejandro","Daniel","Pablo","Sergio","Jorge","Álvaro","Adrián","Rubén","Iván","Óscar","Raúl","Diego","Fernando","Andrés","Héctor","Mateo"]
const APELLIDOS = ["García","Fernández","González","Rodríguez","López","Martínez","Sánchez","Pérez","Gómez","Martín","Jiménez","Ruiz","Hernández","Díaz","Moreno","Álvarez","Muñoz","Romero","Alonso","Gutiérrez",
  "Navarro","Torres","Domínguez","Vázquez","Ramos","Gil","Ramírez","Serrano","Blanco","Molina","Morales","Suárez","Ortega","Delgado","Castro","Ortiz","Rubio","Marín","Sanz","Iglesias"]
const LUGARES = [["Madrid","España","+34"],["Barcelona","España","+34"],["Valencia","España","+34"],["Sevilla","España","+34"],["Bilbao","España","+34"],["Málaga","España","+34"],
  ["Zaragoza","España","+34"],["Valladolid","España","+34"],["A Coruña","España","+34"],["Ciudad de México","México","+52"],["Bogotá","Colombia","+57"],["Santiago","Chile","+56"],
  ["Lima","Perú","+51"],["Buenos Aires","Argentina","+54"],["Quito","Ecuador","+593"]]
const TITULACIONES = ["Grado en Arquitectura","Ingeniería de Caminos, Canales y Puertos","Grado en Ingeniería Civil","Arquitectura Técnica","Ingeniería Industrial",
  "Grado en Ingeniería de Edificación","Ingeniería de Telecomunicación","Máster en Arquitectura"]
const UNIVERSIDADES = ["Universidad Politécnica de Madrid","Universitat Politècnica de Catalunya","Universitat Politècnica de València","Universidad de Sevilla","Universidad del País Vasco",
  "Universidad de Málaga","UNAM","Universidad de Chile","Pontificia Universidad Católica de Chile","Universidad Nacional de Colombia","Universidad de Buenos Aires","PUCP"]
const DOMINIOS = ["gmail.com","gmail.com","gmail.com","hotmail.com","outlook.com","yahoo.es","estudio-arq.es","ingenieriasur.com","construccionesnorte.es","icloud.com"]
const PROGRAMAS = ["MBIM","MBIM","MBBE","EMBIM","Online","Online"]

// ── 60 personas únicas ───────────────────────────────────────────────────────
const usados = new Set(); const P = []
while (P.length < 60) {
  const n = pick(NOMBRES), a1 = pick(APELLIDOS), a2 = pick(APELLIDOS); const clave = `${n}${a1}${a2}`
  if (usados.has(clave)) continue; usados.add(clave)
  const [ciudad, pais, pref] = pick(LUGARES)
  const base = `${plano(n)}.${plano(a1)}@${pick(DOMINIOS)}`
  const nums = pref === "+34" ? `6${int(0,9)}${int(0,9)} ${int(100,999)} ${int(100,999)}` : `${int(300,999)} ${int(100,999)} ${int(1000,9999)}`
  P.push({ nombre: `${n} ${a1} ${a2}`, nombreCorto: n, email: base, tel: `${pref} ${nums}`, telSin: nums.replace(/ /g, ""), ciudad, pais,
           titulacion: pick(TITULACIONES), univ: pick(UNIVERSIDADES) })
}
// Dos parejas "casi iguales" que NO deben fusionarse solas (mismo Gmail con/sin punto): solo salen en el informe de duplicados.
P[7].email = "javier.gonzalez@gmail.com"; P[7].nombre = "Javier González Ruiz"; P[7].nombreCorto = "Javier"
P[8].email = "javiergonzalez@gmail.com";  P[8].nombre = "Javier González Ruiz"; P[8].nombreCorto = "Javier"

// Mismo email, escrito distinto según el formulario (la unificación debe verlos como uno solo)
let cont = 0
function variante(p, forzar) {
  const e = p.email; const k = forzar ?? (cont++ % 5 === 0 ? 0 : int(0, 4))
  switch (k) {
    case 1: return e.replace(/^./, (c) => c.toUpperCase())                       // Maria.lopez@gmail.com
    case 2: return e.toUpperCase()                                              // MARIA.LOPEZ@GMAIL.COM
    case 3: return `  ${e}  `                                                   // con espacios
    case 4: return e.split("@").map((x, i) => (i ? x : x.replace(/(^|\.)./g, (m) => m.toUpperCase()))).join("@") // Maria.Lopez@gmail.com
    default: return e
  }
}
const telVar = (p) => (rnd() < 0.5 ? p.tel : p.telSin)

const out = []
const w = (t = "") => out.push(t)

w("-- =============================================================================")
w("-- SEED LOCAL — DATOS FALSOS. Generado por scripts/generar-seed.mjs (no editar a mano).")
w("-- Se ejecuta automáticamente tras las migraciones en `supabase db reset`.")
w("-- =============================================================================")
w()

// ── Ofertas de empleo (para las candidaturas) ────────────────────────────────
w("insert into public.ofertas_empleo (id, puesto, empresa, ubicacion, salario, tipo_contrato, descripcion, activa) values")
w([["BIM Coordinator","Constructora Levante","Valencia","32.000 - 38.000 €/año","Indefinido"],
   ["BIM Manager","Ingeniería Cantábrico","Bilbao","45.000 - 55.000 €/año","Indefinido"],
   ["Ingeniero MEP (BIM)","Instalaciones Sur","Sevilla","30.000 - 36.000 €/año","Jornada completa"],
   ["Delineante BIM","Estudio Arquitectura Norte","Remoto","24.000 - 28.000 €/año","Freelance"]]
  .map((o, i) => `  (${i + 1}, ${o.slice(0, 5).map(q).join(", ")}, 'Oferta de ejemplo (seed local).', true)`).join(",\n") + ";")
w("select setval(pg_get_serial_sequence('public.ofertas_empleo', 'id'), 4);")
w()

// ── Solicitudes de admisión (30 filas, 24 personas; 6 repiten con otro programa) ──
w("-- solicitudes_admision")
const ESTADOS_ADM = ["pendiente", "revisado", "aceptado", "rechazado"]
const admRows = []
function adm(p, dias, programa) {
  const estado = dias < 10 ? pick(["pendiente", "pendiente", "pendiente", "revisado"])
    : dias < 45 ? pick(["pendiente", "revisado", "revisado", "aceptado"]) : pick(["aceptado", "aceptado", "rechazado", "revisado"])
  const origen = rnd() < 0.3 ? "landing" : programa.toLowerCase()
  admRows.push(`(${q(p.nombre)}, ${q(variante(p))}, ${q(telVar(p))}, ${q(p.pais)}, ${q(p.ciudad)}, ${q(`19${int(78, 99)}-0${int(1, 9)}-1${int(0, 9)}`)}, ${q(p.titulacion)}, ${q(p.univ)}, ${q(programa)}, ${q(origen)}, ${rnd() < 0.5 ? q("Me interesa especializarme en BIM para proyectos de edificación.") : "null"}, true, ${q(estado)}, ${ago(dias)})`)
}
for (let i = 0; i < 24; i++) adm(P[i], int(0, 170), pick(PROGRAMAS))
for (let i = 0; i < 6; i++) adm(P[i], int(0, 60), pick(["Online", "EMBIM", "MBBE"]))
w("insert into public.solicitudes_admision (nombre_completo, email, telefono, pais, ciudad, fecha_nacimiento, titulacion_previa, universidad_origen, programa_solicitado, origen, mensaje, rgpd_aceptado, estado, created_at) values")
w(admRows.map((r) => "  " + r).join(",\n") + ";")
w()

// ── Mensajes de contacto (24) ────────────────────────────────────────────────
w("-- mensajes_contacto")
const MSG = [["Información sobre el máster","Hola, me gustaría saber si hay plazas para la próxima convocatoria y qué requisitos hay."],
  ["Financiación","¿Ofrecéis pago fraccionado o becas? Trabajo actualmente y quisiera compaginarlo."],
  ["Convalidación de créditos","Tengo formación previa en Revit y Navisworks, ¿se puede convalidar algún módulo?"],
  ["Fechas de inicio","¿Cuándo empieza la próxima edición del máster online y cuántas horas semanales requiere?"],
  ["Prácticas","Quisiera confirmar cómo funcionan las prácticas remuneradas y si están garantizadas."],
  ["Formación para empresa","Somos una constructora de 40 personas y queremos formar a nuestro equipo en BIM. ¿Podéis enviarnos una propuesta?"],
  ["Titulación requerida","Soy aparejador con 8 años de experiencia. ¿Puedo acceder al Executive Master?"],
  ["Problema con el catálogo","He solicitado el catálogo pero no me ha llegado el correo, ¿podéis reenviarlo?"],
  ["Reserva de plaza","Quiero reservar plaza. ¿Cuál es el proceso y el importe de la matrícula?"],
  ["Convenio universitario","Escribo desde la oficina de empleo de mi universidad para explorar una colaboración."]]
const msgRows = []
for (let i = 0; i < 24; i++) {
  const p = P[10 + (i % 25)]; const [asunto, texto] = MSG[i % MSG.length]; const prog = rnd() < 0.5 ? pick(["MBIM","MBBE","EMBIM","Online"]) : null
  msgRows.push(`(${q(p.nombreCorto + " " + p.nombre.split(" ")[1])}, ${q(variante(p))}, ${rnd() < 0.6 ? q(telVar(p)) : "null"}, ${q(asunto)}, ${q(texto)}, ${prog ? q("asesoria") : "null"}, ${q(prog)}, ${ago(int(0, 175))})`)
}
w("insert into public.mensajes_contacto (nombre, email, telefono, asunto, mensaje, motivo, programa, created_at) values")
w(msgRows.map((r) => "  " + r).join(",\n") + ";")
w()

// ── Descargas de catálogo (34) ───────────────────────────────────────────────
w("-- descargas_catalogo")
const CAT = { MBIM: ["mbim-fulltime", "Máster BIM Full Time"], MBBE: ["mbim-building-engineering", "Máster BIM & Building Engineering"], Online: ["mbim-online", "Máster BIM Online"], EMBIM: ["executive-master-bim", "Executive Máster BIM"] }
const catRows = []
for (let i = 0; i < 34; i++) {
  const p = P[20 + (i % 40)]; const prog = pick(Object.keys(CAT)); const [id, nom] = CAT[prog]
  catRows.push(`(${q(p.nombre)}, ${q(variante(p))}, ${q(telVar(p))}, ${q(id)}, ${q(nom)}, ${q(prog)}, true, ${ago(int(0, 178))})`)
}
w("insert into public.descargas_catalogo (nombre, email, telefono, catalogo_id, catalogo_nombre, programa, rgpd_aceptado, created_at) values")
w(catRows.map((r) => "  " + r).join(",\n") + ";")
w()

// ── Candidaturas de empleo (12) ──────────────────────────────────────────────
w("-- candidaturas_empleo")
const puestos = ["BIM Coordinator", "BIM Manager", "Ingeniero MEP (BIM)", "Delineante BIM"]
const canRows = []
for (let i = 0; i < 12; i++) {
  const p = P[40 + i]; const idx = i % 4; const espontanea = i === 11
  canRows.push(`(${espontanea ? "null" : idx + 1}, ${q(espontanea ? "Candidatura espontánea" : puestos[idx])}, ${q(p.nombre)}, ${q(variante(p))}, ${q(telVar(p))}, ${q("Adjunto mi experiencia en modelado BIM. Quedo a la espera de vuestras noticias.")}, ${ago(int(0, 170))})`)
}
w("insert into public.candidaturas_empleo (oferta_id, oferta_puesto, nombre, email, telefono, mensaje, created_at) values")
w(canRows.map((r) => "  " + r).join(",\n") + ";")
w()

// ── Pedidos (10, de personas que también solicitaron admisión) ───────────────
w("-- orders + order_items")
const PRODUCTOS = [[8, "Master BIM Full Time", 15000], [9, "Master BIM Online", 4500], [10, "Executive Master BIM", 18000], [11, "Curso de Revit - Iniciación", 0], [12, "Título Profesional CUALIFICAM", 262.5]]
const ordRows = []; const itemRows = []
for (let i = 0; i < 10; i++) {
  const p = P[i]; const id = i + 1; const prod = PRODUCTOS[i % PRODUCTOS.length]
  const matricula = i % 3 === 0; const items = matricula ? [[prod[0], `Matrícula — ${prod[1]}`, 3000]] : [[prod[0], prod[1], prod[2]]]
  const total = items.reduce((a, x) => a + x[2], 0)
  ordRows.push(`(${id}, ${q(variante(p))}, ${q(p.nombre)}, ${rnd() < 0.5 ? q(telVar(p)) : "null"}, ${q(i % 4 === 1 ? "paid" : "pending")}, ${total}, ${ago(int(0, 160))})`)
  for (const it of items) itemRows.push(`(${id}, ${it[0]}, ${q(it[1])}, 1, ${it[2]})`)
}
w("insert into public.orders (id, customer_email, customer_name, customer_phone, status, total_amount, created_at) values")
w(ordRows.map((r) => "  " + r).join(",\n") + ";")
w("insert into public.order_items (order_id, product_id, product_name, quantity, price) values")
w(itemRows.map((r) => "  " + r).join(",\n") + ";")
w("select setval(pg_get_serial_sequence('public.orders', 'id'), 10);")
w()

// ── Bajas (4) ────────────────────────────────────────────────────────────────
w("-- solicitudes_baja")
const bajaRows = [3, 14, 28, 44].map((i, k) => `(${q(variante(P[i], k === 0 ? 2 : 0).trim().toLowerCase())}, ${q(pick(["no_interes", "privacidad", "spam", "otro"]))}, ${ago(int(1, k === 0 ? 4 : 60))})`)
w("insert into public.solicitudes_baja (email, motivo, created_at) values")
w(bajaRows.map((r) => "  " + r).join(",\n") + ";")
w()

// ── Leads legacy (6) — tabla congelada del antiguo calendario ────────────────
w("-- leads (legado)")
const leadRows = []
for (let i = 0; i < 6; i++) {
  const p = P[50 + i]; const [n1, ...rest] = p.nombre.split(" ")
  leadRows.push(`(${q(n1)}, ${q(rest.join(" "))}, ${q(telVar(p))}, ${q(variante(p))}, ${q(pick(["MBIM", "Online", null]))}, current_date - ${int(30, 150)}, '${10 + i}:00', 'landing', ${q(pick(["nuevo", "contactado", "descartado"]))}, ${ago(int(30, 150))})`)
}
w("insert into public.leads (first_name, last_name, phone, email, master_interes, session_date, session_time, origen, status, created_at) values")
w(leadRows.map((r) => "  " + r).join(",\n") + ";")
w()

// ── Usuarios de prueba (Auth) + CRM ──────────────────────────────────────────
const USERS = [
  ["11111111-1111-4111-8111-111111111111", "admin@idesie.test", "Crm-Admin-2026", "Ana Directora", "admin"],
  ["22222222-2222-4222-8222-222222222222", "comercial@idesie.test", "Crm-Comercial-2026", "Carlos Comercial", "comercial"],
  ["33333333-3333-4333-8333-333333333333", "lectura@idesie.test", "Crm-Lectura-2026", "Laura Lectura", "lectura"],
]
w("-- Usuarios de prueba (SOLO LOCAL). Sin MFA.")
for (const [id, email, pass] of USERS) {
  w(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '${id}', 'authenticated', 'authenticated', '${email}', extensions.crypt('${pass}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '${id}', '${id}', jsonb_build_object('sub', '${id}', 'email', '${email}', 'email_verified', true), 'email', now(), now(), now());`)
}
w("insert into crm.usuarios (id, nombre, email, rol) values")
w(USERS.map(([id, email, , nombre, rol]) => `  ('${id}', ${q(nombre)}, '${email}', '${rol}')`).join(",\n") + ";")
w()

// ── Unificación de contactos + reglas de alta (el proceso real del CRM) ──────
w("-- Proceso de unificación: crea contactos/entradas/oportunidades. Lo de hace más de 30 días queda 'gestionada'.")
w("select crm.procesar_entradas(now() - interval '30 days');")
w()

// ── Trabajo del equipo (para ver asignaciones, notas, tareas y el historial) ──
const ADMIN = USERS[0][0], COM = USERS[1][0]
const actua = (uid) => `select set_config('request.jwt.claims', json_build_object('sub', '${uid}', 'role', 'authenticated')::text, true);`
w("-- Trabajo del equipo simulado")
w(actua(COM))
w(`update crm.oportunidades set propietario_id = '${COM}' where id in (select o.id from crm.oportunidades o join crm.pipelines p on p.id = o.pipeline_id where p.codigo = 'admision' and o.propietario_id is null order by o.creado_at desc limit 9);`)
w(`update crm.oportunidades o set etapa_id = (select id from crm.etapas e where e.pipeline_id = o.pipeline_id and e.nombre = 'Contactado') where propietario_id = '${COM}' and etapa_id = (select id from crm.etapas e where e.pipeline_id = o.pipeline_id and e.nombre = 'Solicitud recibida') and id in (select id from crm.oportunidades where propietario_id = '${COM}' order by creado_at desc limit 3);`)
w(`update crm.entradas set estado = 'en_gestion', asignado_a = '${COM}' where id in (select id from crm.entradas where estado = 'nueva' and tipo in ('mensaje_contacto', 'solicitud_admision') order by recibido_at desc limit 5);`)
w(`select crm.marcar_leida(id, true) from crm.entradas where estado <> 'nueva' or recibido_at < now() - interval '3 days';`)
w(`insert into crm.notas (contacto_id, autor_id, texto) select contacto_id, '${COM}', 'Llamado hoy: muy interesado, prefiere modalidad online. Enviar comparativa de másteres.' from crm.entradas where estado = 'en_gestion' order by recibido_at desc limit 3;`)
w(actua(ADMIN))
w(`update crm.oportunidades o set etapa_id = (select id from crm.etapas e where e.pipeline_id = o.pipeline_id and e.nombre = 'Matriculado') where id in (select o2.id from crm.oportunidades o2 join crm.etapas e2 on e2.id = o2.etapa_id where e2.nombre = 'Admitido' order by o2.creado_at limit 2);`)
w(`insert into crm.notas (contacto_id, autor_id, texto) select id, '${ADMIN}', 'Contacto prioritario (recomendado por antiguo alumno).' from crm.contactos order by creado_at limit 2;`)
w(`insert into crm.tareas (contacto_id, asignado_a, titulo, vence_at, creado_por) select id, '${COM}', 'Llamar para resolver dudas de financiación', now() - interval '2 days', '${ADMIN}' from crm.contactos order by creado_at desc limit 2;`)
w(`insert into crm.tareas (contacto_id, asignado_a, titulo, vence_at, creado_por) select id, '${COM}', 'Enviar propuesta de formación in company', now() + interval '3 days', '${ADMIN}' from crm.contactos order by creado_at limit 1;`)
w(`select set_config('request.jwt.claims', '', true);`)

writeFileSync("supabase/seed.sql", out.join("\n") + "\n")
console.log(`supabase/seed.sql generado (${out.length} líneas): 60 personas, ${admRows.length} admisiones, ${msgRows.length} mensajes, ${catRows.length} catálogos, ${canRows.length} candidaturas, ${ordRows.length} pedidos, ${bajaRows.length} bajas, ${leadRows.length} leads.`)
