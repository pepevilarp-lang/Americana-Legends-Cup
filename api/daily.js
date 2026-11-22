/* Recordatorios diarios (los lanza Vercel cada mañana, ver «crons» en vercel.json).
   Como mucho UN aviso por persona y día:
     · Hoy juegas            → los dos jugadores, con sonido
     · Mañana juegas         → los dos jugadores, con sonido
     · Tu rival te ha propuesto fecha y no has contestado → con sonido
     · Arranca la jornada / quedan 2 días / partido aplazado (lunes) sin fecha → con el hueco que os va bien a los dos (agenda inteligente)
     · Hoy en la liga        → el resto, sin sonido (solo si hay partidos ese día)
   Necesita en Vercel: FIREBASE_SERVICE_ACCOUNT (el JSON de la cuenta de servicio) y CRON_SECRET. */
const crypto = require("crypto");
const webpush = require("web-push");
const { JORNADAS, NAMES, FIXTURE, RECAP_FROM } = require("./_liga");
const AC = require("../agenda-core.js");
const { log, flushLogs } = require("./posthog-logs");
const PROJECT = process.env.FIREBASE_PROJECT_ID || "americana-legends-cup";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const ymdMadrid = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
const diffDays = (a, b) => { const P = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((P(b) - P(a)) / 864e5); };
const nm = id => NAMES[id] || id;
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtDay = s => { const [y, m, d] = s.split("-").map(Number); return `${DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MES[m - 1]}`; };
const detail = m => `${m.time ? " a las " + m.time : ""}${m.court ? " · " + m.court : ""}`;

/* Lógica pura (se puede probar sin red): partidos guardados + agendas + fecha de hoy → un aviso por jugador */
function buildPlan(saved, today, ag = {}) {
  const avail = ag.avail || {}, plans = ag.plans || {};
  const tomorrow = addDays(today, 1);
  const all = FIXTURE.map(f => ({ ...f, ...(saved[f.id] || {}) }))
    .concat(Object.entries(saved).filter(([id]) => !FIXTURE.some(f => f.id === id)).map(([id, m]) => ({ id, ...m })))   // playoffs
    .filter(m => m.a && m.b);
  const open = m => m.status !== "done" && m.status !== "wo";
  const plan = {};
  const add = (pid, p) => { if (!plan[pid]) plan[pid] = p; };
  const rival = (m, pid) => (m.a === pid ? m.b : m.a);
  // Agenda: el mejor hueco común de un partido (o null)
  const busy = {}; all.forEach(m => { if (m.date) [m.a, m.b].forEach(p => (busy[p] = busy[p] || []).push(m.date)); });
  const prefTime = AC.prefTimes(all.filter(m => m.time), null, null);
  const bestSlot = m => { const f = FIXTURE.find(x => x.id === m.id); if (!f) return null;
    const [ws, we] = JORNADAS[f.j - 1];
    const r = AC.suggest({ a: m.a, b: m.b, avA: avail[m.a], avB: avail[m.b], today, nowHour: 8, winStart: ws, winEnd: we, busy, prefTime, max: 1 });
    return r.slots[0] || null; };
  const nudge = (m, pid, title, fallback) => { const s = bestSlot(m);
    if (s) return { title, body: `Con ${nm(rival(m, pid))}: os va bien a los dos el ${AC.label(s)}. Toca para cerrarlo.`, tag: `daily-${today}`, url: `./#agenda-${m.id}` };
    if (!AC.filled(avail[pid])) return { title, body: `${fallback} Rellena tu agenda (3 preguntas, 30 s) y la app os busca hueco.`, tag: `daily-${today}`, url: "./#agenda" };
    return { title, body: `${fallback} Mirad la agenda: ahí veis qué días os encajan.`, tag: `daily-${today}`, url: `./#agenda-${m.id}` }; };
  // 1) hoy y mañana
  for (const [day, word] of [[today, "Hoy"], [tomorrow, "Mañana"]]) {
    all.filter(m => open(m) && m.date === day).forEach(m => [m.a, m.b].forEach(pid =>
      add(pid, { title: `🎾 ${word} juegas`, body: `Contra ${nm(rival(m, pid))}${detail(m)}. ¡Suerte!`, tag: `daily-${today}` })));
  }
  // 1b) Día del resumen de la primera vuelta: aviso especial (quien juega hoy ya tiene su «Hoy juegas»)
  if (today === RECAP_FROM) {
    Object.keys(NAMES).forEach(pid => add(pid, { title: "🎧 Tu primera vuelta ya suena",
      body: `${nm(pid)}, gracias por hacer historia en la primera temporada de la Legends Cup. Tu resumen de la ida te espera, con canción incluida.`,
      tag: "recap-ida", url: "./#recap" }));
  }
  const noDate = all.filter(m => open(m) && !m.date && m.j);
  // 1c) Tu rival te ha propuesto fecha y no has contestado
  noDate.forEach(m => [m.a, m.b].forEach(pid => {
    const p = plans[m.id] && plans[m.id].picks || {}, mine = (p[pid] || []).filter(k => k >= today), his = (p[rival(m, pid)] || []).filter(k => k >= today);
    if (his.length && !mine.length) add(pid, { title: `📅 ${nm(rival(m, pid))} te ha propuesto fecha`, body: `${his.slice().sort().slice(0, 2).map(k => AC.label(k)).join(" o ")}. ¿Te va bien? Toca para responder.`, tag: `daily-${today}`, url: `./#agenda-${m.id}` });
  }));
  // 2) arranca la jornada / quedan 2 días, sin fecha
  const j = JORNADAS.findIndex(([a, b]) => today >= a && today <= b) + 1;
  if (j) {
    const [ws, we] = JORNADAS[j - 1], left = diffDays(today, we);
    noDate.filter(m => m.j === j).forEach(m => [m.a, m.b].forEach(pid => {
      if (today === ws) add(pid, nudge(m, pid, `🗓️ Arranca la Jornada ${j}`, `Te toca contra ${nm(rival(m, pid))}.`));
      else if (left === 2) add(pid, nudge(m, pid, `⏳ Quedan 2 días de la Jornada ${j}`, `Aún no tenéis fecha para ${nm(m.a)}–${nm(m.b)}.`));
    }));
  }
  // 2b) los lunes, partidos aplazados sin fecha
  if (AC.dow(today) === 1) noDate.filter(m => { const f = FIXTURE.find(x => x.id === m.id); return f && JORNADAS[f.j - 1][1] < today; })
    .forEach(m => [m.a, m.b].forEach(pid => add(pid, nudge(m, pid, "⚠️ Tenéis un partido aplazado", `${nm(m.a)}–${nm(m.b)} (J${m.j}) sigue sin jugarse.`))));
  // 3) resto: resumen del día, sin sonido
  const todays = all.filter(m => open(m) && m.date === today).sort((x, y) => (x.time || "99").localeCompare(y.time || "99"));
  if (todays.length) {
    const body = todays.map(m => `${nm(m.a)}–${nm(m.b)}${m.time ? " " + m.time : ""}`).join(" · ");
    Object.keys(NAMES).forEach(pid => add(pid, { title: "🎾 Hoy en la Legends Cup", body, tag: `daily-${today}`, quiet: true }));
  }
  return plan;
}

/* Acceso a Firestore con la cuenta de servicio (no depende de la sesión de nadie) */
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${unsigned}.${sig}` });
  const j = await r.json(); if (!j.access_token) throw new Error("token: " + JSON.stringify(j).slice(0, 200)); return j.access_token;
}
async function list(col, tok) {
  const out = []; let page = "";
  do {
    const r = await fetch(`${BASE}/${col}?pageSize=300${page ? "&pageToken=" + page : ""}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (!r.ok) throw new Error(`firestore ${col} ${r.status}`);
    const j = await r.json(); (j.documents || []).forEach(d => out.push(d)); page = j.nextPageToken || "";
  } while (page);
  return out;
}
const str = (f, k) => (f && f[k] && f[k].stringValue) || "";
/* Valor de Firestore (formato REST) → valor normal */
function fsVal(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fsVal);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fsVal(x)]));
  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: "falta CRON_SECRET en Vercel" });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(500).json({ error: "falta FIREBASE_SERVICE_ACCOUNT en Vercel" });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return res.status(500).json({ error: "vapid keys missing" });
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const tok = await accessToken(sa);
    const [mDocs, pDocs, aDocs, plDocs] = await Promise.all([list("matches", tok), list("push", tok), list("avail", tok).catch(() => []), list("plans", tok).catch(() => [])]);
    const toObj = docs => Object.fromEntries(docs.map(d => [d.name.split("/").pop(), fsVal({ mapValue: { fields: d.fields || {} } })]));
    const saved = {};
    mDocs.forEach(d => { const id = d.name.split("/").pop(), f = d.fields || {};
      const parts = id.split("-"); const a = str(f, "a") || parts[1], b = str(f, "b") || parts.slice(2).join("-");
      saved[id] = { status: str(f, "status"), date: str(f, "date"), time: str(f, "time"), court: str(f, "court"), a, b }; });
    const today = (req.query && req.query.date) || ymdMadrid();
    const plan = buildPlan(saved, today, { avail: toObj(aDocs), plans: toObj(plDocs) });
    if (req.query && req.query.dry) return res.status(200).json({ today, plan });
    log("info", "daily_notification_plan_created", { recipient_count: Object.keys(plan).length, subscription_count: pDocs.length });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:liga@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    let sent = 0, failed = 0;
    await Promise.all(pDocs.map(async d => {
      const f = d.fields || {}, who = str(f, "who"), p = plan[who]; if (!p) return;
      let sub; try { sub = JSON.parse(str(f, "sub")); } catch (_) { return; }
      try { await webpush.sendNotification(sub, JSON.stringify({ url: "./#hoy", ...p }), { TTL: 6 * 3600, urgency: p.quiet ? "low" : "normal" }); sent++; }
      catch (e) { failed++; }
    }));
    log("info", "daily_notifications_dispatched", { recipient_count: Object.keys(plan).length, sent_count: sent, failed_count: failed });
    await flushLogs();
    res.status(200).json({ today, people: Object.keys(plan).length, sent, failed });
  } catch (e) {
    log("error", "daily_notification_run_failed");
    await flushLogs();
    res.status(500).json({ error: String(e.message || e) });
  }
};
module.exports.buildPlan = buildPlan;
module.exports.fsVal = fsVal;
module.exports.accessToken = accessToken;
module.exports.list = list;
module.exports.str = str;
