/* Avisos puntuales a toda la liga (anuncios). Solo con la clave del servidor (CRON_SECRET),
   el texto está fijado aquí (no se puede mandar otro) y cada anuncio sale una sola vez.
   GET /api/broadcast?key=…&id=<anuncio>[&dry=1] */
const webpush = require("web-push");
const { accessToken, list, str } = require("./daily.js");
const PROJECT = process.env.FIREBASE_PROJECT_ID || "americana-legends-cup";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const ANUNCIOS = {
  "agenda-1811": {
    title: "🗓️ Seniors, Juniors",
    body: "Vayamos a solucionar el gran mal de esta liga: los aplazamientos. Abre la app, contesta 3 preguntas y se acabaron los «¿y el jueves?».",
    url: "./#agenda", tag: "agenda-1811",
  },
  // A quien aún no ha aceptado la analítica (Pepe, Álvaro, Joan y Eduardo ya la aceptaron)
  "analitica-2511": {
    title: "📊 Un favor de 2 segundos",
    body: "Toca aquí y dale a «Aceptar»: así sabremos qué funciona en la app y tendremos datos de verdad para el resumen de la ida del 26/12.",
    url: "./#analitica", tag: "analitica-2511",
    skip: ["pepe", "alvaro", "joan", "eduardo"],
  },
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const q = req.query || {};
  if (!process.env.CRON_SECRET || q.key !== process.env.CRON_SECRET) return res.status(401).json({ error: "unauthorized" });
  const a = ANUNCIOS[q.id]; if (!a) return res.status(404).json({ error: "anuncio desconocido" });
  try {
    const tok = await accessToken(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    const auth = { Authorization: `Bearer ${tok}` };
    const mark = `${BASE}/config/bc_${q.id}`;
    const prev = await fetch(mark, { headers: auth });
    if (prev.ok) return res.status(200).json({ id: q.id, already: true });
    const subs = (await list("push", tok)).filter(d => !(a.skip || []).includes(str(d.fields, "who")));
    const who = [...new Set(subs.map(d => str(d.fields, "who")).filter(Boolean))];
    if (q.dry) return res.status(200).json({ id: q.id, dry: true, devices: subs.length, players: who, payload: a });
    // se marca ANTES de enviar: si algo falla a medias, nunca sale dos veces
    const w = await fetch(mark, { method: "PATCH", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { at: { timestampValue: new Date().toISOString() } } }) });
    if (!w.ok) return res.status(500).json({ error: "no se pudo marcar el anuncio", status: w.status });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:liga@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    let sent = 0, failed = 0;
    await Promise.all(subs.map(async d => {
      let sub; try { sub = JSON.parse(str(d.fields, "sub")); } catch (_) { return; }
      try { await webpush.sendNotification(sub, JSON.stringify({ title: a.title, body: a.body, url: a.url, tag: a.tag }), { TTL: 12 * 3600, urgency: "high" }); sent++; } catch (e) { failed++; }
    }));
    res.status(200).json({ id: q.id, sent, failed, devices: subs.length, players: who.length });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
