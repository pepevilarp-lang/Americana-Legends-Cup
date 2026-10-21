/* Envía los avisos a los móviles que los han activado.
   Solo puede usarlo quien ya ha entrado con el PIN: se comprueba leyendo Firestore con su propia sesión. */
const webpush = require("web-push");
const PROJECT = process.env.FIREBASE_PROJECT_ID || "americana-legends-cup";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/* De 23:00 a 8:00 (hora de Madrid) los avisos llegan sin sonido */
function nightInMadrid() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(new Date()));
  return h >= 23 || h < 8;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const { idToken, payload, exclude, only, target } = req.body || {};
  if (!idToken || !payload || !payload.title) return res.status(400).json({ error: "bad request" });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return res.status(500).json({ error: "vapid keys missing" });
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:liga@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  } catch (e) { return res.status(500).json({ error: "vapid subject", detail: String(e.message || e) }); }

  // 1) Si su sesión puede leer la colección «push», es miembro (lo deciden las reglas de Firestore)
  const auth = { Authorization: `Bearer ${idToken}` };
  let r;
  try { r = await fetch(`${BASE}/push?pageSize=300`, { headers: auth }); }
  catch (e) { return res.status(502).json({ error: "firestore unreachable" }); }
  if (r.status === 401 || r.status === 403) return res.status(403).json({ error: "not a member" });
  if (!r.ok) return res.status(502).json({ error: "firestore", status: r.status });
  const docs = (await r.json()).documents || [];

  // 2) Enviar
  const quiet = !!payload.quiet || nightInMadrid();
  const msg = JSON.stringify({ title: String(payload.title).slice(0, 80), body: String(payload.body || "").slice(0, 220), url: payload.url || "./", tag: payload.tag || "liga", quiet });
  let sent = 0, dead = 0, skipped = 0, failed = 0, reason = "";
  await Promise.all(docs.map(async d => {
    const id = d.name.split("/").pop(), f = d.fields || {};
    if ((exclude && id === exclude) || (target && id !== target)) { skipped++; return; }
    const who = f.who && f.who.stringValue;
    if (Array.isArray(only) && only.length && !only.includes(who)) { skipped++; return; }
    let sub; try { sub = JSON.parse(f.sub.stringValue); } catch (_) { skipped++; return; }
    try { await webpush.sendNotification(sub, msg, { TTL: 6 * 3600, urgency: quiet ? "low" : "high" }); sent++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {   // el móvil ya no existe: se borra de la lista
        dead++; await fetch(`${BASE}/push/${id}`, { method: "DELETE", headers: auth }).catch(() => {});
      } else { failed++; if (!reason) reason = `${e.statusCode || ""} ${(e.body || e.message || "").toString().slice(0, 120)}`.trim(); }
    }
  }));
  res.status(200).json({ sent, dead, skipped, failed, reason, total: docs.length });
};
