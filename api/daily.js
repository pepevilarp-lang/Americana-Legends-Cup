/* Recordatorios diarios (los lanza Vercel cada mañana, ver «crons» en vercel.json).
   Como mucho UN aviso por persona y día:
     · Hoy juegas            → los dos jugadores, con sonido
     · Mañana juegas         → los dos jugadores, con sonido
     · Quedan 2 días de jornada y no tenéis fecha → los dos jugadores, con sonido
     · Hoy en la liga        → el resto, sin sonido (solo si hay partidos ese día)
   Necesita en Vercel: FIREBASE_SERVICE_ACCOUNT (el JSON de la cuenta de servicio) y CRON_SECRET. */
const crypto = require("crypto");
const webpush = require("web-push");
const { JORNADAS, NAMES, FIXTURE } = require("./_liga");
const PROJECT = process.env.FIREBASE_PROJECT_ID || "americana-legends-cup";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const ymdMadrid = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
const diffDays = (a, b) => { const P = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((P(b) - P(a)) / 864e5); };
const nm = id => NAMES[id] || id;
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtDay = s => { const [y, m, d] = s.split("-").map(Number); return `${DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MES[m - 1]}`; };
const detail = m => `${m.time ? " a las " + m.time : ""}${m.court ? " · " + m.court : ""}`;

/* Lógica pura (se puede probar sin red): partidos guardados + fecha de hoy → un aviso por jugador */
function buildPlan(saved, today) {
  const tomorrow = addDays(today, 1);
  const all = FIXTURE.map(f => ({ ...f, ...(saved[f.id] || {}) }))
    .concat(Object.entries(saved).filter(([id]) => !FIXTURE.some(f => f.id === id)).map(([id, m]) => ({ id, ...m })))   // playoffs
    .filter(m => m.a && m.b);
  const open = m => m.status !== "done" && m.status !== "wo";
  const plan = {};
  const add = (pid, p) => { if (!plan[pid]) plan[pid] = p; };
  const rival = (m, pid) => (m.a === pid ? m.b : m.a);
  // 1) hoy y mañana
  for (const [day, word] of [[today, "Hoy"], [tomorrow, "Mañana"]]) {
    all.filter(m => open(m) && m.date === day).forEach(m => [m.a, m.b].forEach(pid =>
      add(pid, { title: `🎾 ${word} juegas`, body: `Contra ${nm(rival(m, pid))}${detail(m)}. ¡Suerte!`, tag: `daily-${today}` })));
  }
  // 2) jornada a punto de cerrar sin fecha
  const j = JORNADAS.findIndex(([a, b]) => today >= a && today <= b) + 1;
  if (j && diffDays(today, JORNADAS[j - 1][1]) === 2) {
    all.filter(m => m.j === j && open(m) && !m.date).forEach(m => [m.a, m.b].forEach(pid =>
      add(pid, { title: `⏳ Quedan 2 días de la Jornada ${j}`, body: `Aún no tenéis fecha para ${nm(m.a)}–${nm(m.b)}. Escribe a ${nm(rival(m, pid))} y fijadla.`, tag: `daily-${today}` })));
  }
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
    const [mDocs, pDocs] = await Promise.all([list("matches", tok), list("push", tok)]);
    const saved = {};
    mDocs.forEach(d => { const id = d.name.split("/").pop(), f = d.fields || {};
      const parts = id.split("-"); const a = str(f, "a") || parts[1], b = str(f, "b") || parts.slice(2).join("-");
      saved[id] = { status: str(f, "status"), date: str(f, "date"), time: str(f, "time"), court: str(f, "court"), a, b }; });
    const today = (req.query && req.query.date) || ymdMadrid();
    const plan = buildPlan(saved, today);
    if (req.query && req.query.dry) return res.status(200).json({ today, plan });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:liga@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    let sent = 0, failed = 0;
    await Promise.all(pDocs.map(async d => {
      const f = d.fields || {}, who = str(f, "who"), p = plan[who]; if (!p) return;
      let sub; try { sub = JSON.parse(str(f, "sub")); } catch (_) { return; }
      try { await webpush.sendNotification(sub, JSON.stringify({ ...p, url: "./#hoy" }), { TTL: 6 * 3600, urgency: p.quiet ? "low" : "normal" }); sent++; }
      catch (e) { failed++; }
    }));
    res.status(200).json({ today, people: Object.keys(plan).length, sent, failed });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
module.exports.buildPlan = buildPlan;
