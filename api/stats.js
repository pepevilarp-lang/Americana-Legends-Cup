/* Datos de la liga para el resumen de temporada (solo lectura, solo con la clave del servidor).
   Devuelve partidos, pronósticos, votos, registro, agendas y contadores. Nunca correos,
   cuentas ni suscripciones de avisos (de estas solo cuántos móviles tiene cada jugador).
   GET /api/stats?key=<CRON_SECRET> */
const { accessToken, list, str, fsVal } = require("./daily.js");

const COLS = ["matches", "preds", "votes", "log", "avail", "plans", "stats", "survey_stats"];
const toObj = docs => Object.fromEntries(docs.map(d => [d.name.split("/").pop(), Object.assign(fsVal({ mapValue: { fields: d.fields || {} } }), { _c: d.createTime, _u: d.updateTime })]));

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const q = req.query || {};
  if (!process.env.CRON_SECRET || q.key !== process.env.CRON_SECRET) return res.status(401).json({ error: "unauthorized" });
  try {
    const tok = await accessToken(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    const out = { at: new Date().toISOString() };
    await Promise.all(COLS.map(async c => { out[c] = toObj(await list(c, tok).catch(() => [])); }));
    const subs = await list("push", tok).catch(() => []);
    out.devices = {}; subs.forEach(d => { const w = str(d.fields, "who") || "?"; out.devices[w] = (out.devices[w] || 0) + 1; });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
  }
};
