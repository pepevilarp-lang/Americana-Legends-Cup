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
const WX = require("./_wx.js"), WX_DESC = WX.DESC;
const EVO = require("../evo-core.js");
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
  // Pista del informe del rival: primero el tiempo previsto cruzado con su historial; si no, su golpe más flojo
  const scout = ag.scout || {}, wxAt = ag.wxAt || (() => null);
  const tip = (m, riv) => { const s = scout[riv] || {}, n = nm(riv), cond = wxAt(m.date, m.time), c = cond && s.c5 && s.c5[cond];
    if (cond && c && (c.w || 0) + (c.l || 0) >= 1) return `Previsión: ${WX_DESC[cond] || cond.toLowerCase()}. Con este tiempo, ${n} va ${c.w || 0}-${c.l || 0}.`;
    const weak = Object.entries(s.q3b || {}).sort((a, b) => b[1] - a[1])[0];
    if (weak && weak[1] >= 1) return `${cond ? `Previsión: ${WX_DESC[cond] || cond.toLowerCase()}. ` : ""}Su golpe con menos confianza: ${weak[0].toLowerCase()}.`;
    return cond ? `Previsión: ${WX_DESC[cond] || cond.toLowerCase()}.` : ""; };
  // 1) hoy y mañana
  for (const [day, word] of [[today, "Hoy"], [tomorrow, "Mañana"]]) {
    all.filter(m => open(m) && m.date === day).forEach(m => [m.a, m.b].forEach(pid => { const riv = rival(m, pid), t = tip(m, riv);
      add(pid, { title: `🎾 ${word} juegas`, body: `Contra ${nm(riv)}${detail(m)}. ${t ? t + " Toca para ver su informe." : "¡Suerte!"}`, tag: `daily-${today}`, url: t ? `./#scout-${riv}` : undefined }); }));
  }
  // 1a) Encuesta sin contestar: recordatorio al día siguiente, a los 2, 4 y 7 días
  (ag.pending || []).forEach(sv => { const d = sv.days; if (![1, 2, 4, 7].includes(d) && !(d > 7 && AC.dow(today) === 1)) return;
    add(sv.playerId, { title: "🎾 Tú, tenista", body: `Tienes pendiente responder la encuesta de tu partido contra ${nm(sv.rival)}. Son 30 segundos y alimentan tu informe y tu evolución.`, tag: `sv-${today}`, url: "./#hoy" }); });
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
  // 2c) Día 1 de cada mes: tu evolución, en privado (solo a ti, con tus encuestas)
  if (today.slice(8) === "01" && ag.evo) Object.keys(NAMES).forEach(pid => { const ln = ag.evo[pid];
    add(pid, ln ? { title: "📈 Tu mes en la Legends", body: `${ln} Toca para ver tu evolución.`, tag: `evo-${today}`, url: "./#evolucion" }
               : { title: "📈 ¿Cómo evolucionas?", body: "Contesta la encuesta de tu próximo partido (30 s) y la app te dirá qué golpe mejora y cuál flojea.", tag: `evo-${today}`, url: "./#evolucion", quiet: true }); });
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
const intMap = o => ({ mapValue: { fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { integerValue: String(v) }])) } });
async function writeRv(pid, x, noN, tok) {
  const fields = { rv_n: { integerValue: String(x.n) }, rv_golpes: intMap(x.g), rv_clave: intMap(x.c) };
  if (noN) Object.assign(fields, { n: { integerValue: "0" }, w: { integerValue: "0" }, l: { integerValue: "0" }, pid: { stringValue: pid } });
  const mask = Object.keys(fields).map(k => "updateMask.fieldPaths=" + k).join("&");
  const r = await fetch(`${BASE}/survey_stats/${encodeURIComponent(pid)}?${mask}`, { method: "PATCH", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error("rv " + r.status);
}
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
  const dryKey = req.query && req.query.dry && req.query.key === secret;
  if (req.headers.authorization !== `Bearer ${secret}` && !dryKey) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(500).json({ error: "falta FIREBASE_SERVICE_ACCOUNT en Vercel" });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return res.status(500).json({ error: "vapid keys missing" });
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const tok = await accessToken(sa);
    const [mDocs, pDocs, aDocs, plDocs, sDocs, fc] = await Promise.all([list("matches", tok), list("push", tok), list("avail", tok).catch(() => []), list("plans", tok).catch(() => []), list("survey_stats", tok).catch(() => []), WX.forecast()]);
    const toObj = docs => Object.fromEntries(docs.map(d => [d.name.split("/").pop(), fsVal({ mapValue: { fields: d.fields || {} } })]));
    const saved = {};
    mDocs.forEach(d => { const id = d.name.split("/").pop(), f = d.fields || {};
      const parts = id.split("-"); const a = str(f, "a") || parts[1], b = str(f, "b") || parts.slice(2).join("-");
      saved[id] = { status: str(f, "status"), date: str(f, "date"), time: str(f, "time"), court: str(f, "court"), a, b }; });
    const today = (req.query && req.query.date) || ymdMadrid();
    // Encuestas: pendientes (recordatorio), lo que dicen los rivales de cada uno y, el día 1, la evolución
    const svs = (await list("surveys", tok).catch(() => [])).map(d => fsVal({ mapValue: { fields: d.fields || {} } })).filter(Boolean);
    const rivalOf = sv => { const m = saved[sv.matchId]; if (!m) return null; return m.a === sv.playerId ? m.b : m.b === sv.playerId ? m.a : null; };
    const now = Date.now(), pending = svs.filter(v => v.status === "pending" && v.playerId && v.t)
      .map(v => ({ playerId: v.playerId, rival: rivalOf(v), days: Math.floor((now - v.t) / 864e5) })).filter(v => v.rival);
    const done = svs.filter(v => v.status === "completed" && v.playerId && v.answers);
    let evo = null;
    if (today.slice(8) === "01") { const by = {}; done.forEach(v => (by[v.playerId] = by[v.playerId] || []).push(v));
      evo = Object.fromEntries(Object.keys(NAMES).map(pid => [pid, EVO.line(EVO.summarize(by[pid] || []))])); }
    // «Lo que dicen de ti tus rivales»: se suma en survey_stats de cada uno (solo cifras agregadas, nunca quién lo dijo)
    try { const rv = {};
      done.forEach(v => { const r = rivalOf(v); if (!r) return; const a = v.answers, g = [].concat(a.rival_golpes || []), c = [].concat(a.rival_clave || []);
        if (!g.length && !c.length) return; const x = rv[r] = rv[r] || { n: 0, g: {}, c: {} }; x.n++;
        g.forEach(k => x.g[k] = (x.g[k] || 0) + 1); c.forEach(k => x.c[k] = (x.c[k] || 0) + 1); });
      const statN = Object.fromEntries(sDocs.map(d => [d.name.split("/").pop(), d.fields && d.fields.n]));
      await Promise.all(Object.entries(rv).map(([pid, x]) => writeRv(pid, x, statN[pid] === undefined, tok)));
    } catch (_) {}
    const plan = buildPlan(saved, today, { avail: toObj(aDocs), plans: toObj(plDocs), scout: toObj(sDocs), wxAt: (d, t) => WX.condAt(fc, d, t), evo, pending });
    if (req.query && req.query.dry) return res.status(200).json({ today, plan });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:liga@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    let sent = 0, failed = 0;
    await Promise.all(pDocs.map(async d => {
      const f = d.fields || {}, who = str(f, "who"), p = plan[who]; if (!p) return;
      let sub; try { sub = JSON.parse(str(f, "sub")); } catch (_) { return; }
      try { await webpush.sendNotification(sub, JSON.stringify({ ...p, url: p.url || "./#hoy" }), { TTL: 6 * 3600, urgency: p.quiet ? "low" : "normal" }); sent++; }
      catch (e) { failed++; }
    }));
    res.status(200).json({ today, people: Object.keys(plan).length, sent, failed });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
module.exports.buildPlan = buildPlan;
module.exports.fsVal = fsVal;
module.exports.accessToken = accessToken;
module.exports.list = list;
module.exports.str = str;
