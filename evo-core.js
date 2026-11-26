/* =====================================================================
   EVOLUCIÓN · motor común (app y aviso mensual del servidor)
   Compara tus últimas encuestas con las anteriores, como haría un entrenador:
   qué golpe ha ganado confianza, cuál la ha perdido, cómo te ves y cómo llegas físicamente.
   Solo usa tus propias encuestas.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EvoCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const SHOTS = ["Saque", "Resto", "Derecha", "Revés", "Volea", "Dejada", "Globo", "Remate"];
  const PERF = ["Muy malo", "Malo", "Normal", "Bueno", "Muy bueno"], FIS = ["Muy mal", "Mal", "Normal", "Bien", "Muy bien"];
  const ART = { Saque: "el", Resto: "el", Derecha: "la", "Revés": "el", Volea: "la", Dejada: "la", Globo: "el", Remate: "el" };
  const the = k => `${ART[k] || "el"} ${k.toLowerCase()}`;
  const arr = v => [].concat(v || []).filter(Boolean);
  const avg = (list, f) => { const v = list.map(f).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const lvl = (scale, v) => { const i = scale.indexOf(v); return i < 0 ? null : i + 1; };
  const shotScore = (list, k) => avg(list, s => (arr(s.q3_confianza).includes(k) ? 1 : 0) - (arr(s.q3_menos_confianza).includes(k) ? 1 : 0));

  /* surveys: [{ answers:{q1,q3_confianza,q3_menos_confianza,q6}, sentAt }] (las tuyas, completadas) */
  function summarize(surveys, recentN = 3) {
    const all = (surveys || []).filter(s => s && s.answers).sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0)).map(s => s.answers);
    const n = all.length;
    if (n < 2) return { n, ready: false };
    const k = Math.min(recentN, Math.max(1, Math.floor(n / 2)) + (n >= 4 ? 1 : 0)), recent = all.slice(-k), before = all.slice(0, -k);
    const shots = SHOTS.map(s => ({ s, now: shotScore(recent, s), was: shotScore(before, s) }))
      .map(x => ({ ...x, d: (x.now || 0) - (x.was || 0) }));
    const riser = shots.filter(x => x.d >= 0.34 && x.now > 0).sort((a, b) => b.d - a.d)[0] || null;
    const faller = shots.filter(x => x.d <= -0.34 && x.now < 0).sort((a, b) => a.d - b.d)[0] || null;
    const weakNow = shots.filter(x => x.now < 0).sort((a, b) => a.now - b.now)[0] || null;
    const strongNow = shots.filter(x => x.now > 0).sort((a, b) => b.now - a.now)[0] || null;
    const self = { now: avg(recent, a => lvl(PERF, a.q1)), was: avg(before, a => lvl(PERF, a.q1)) };
    const fis = { now: avg(recent, a => lvl(FIS, a.q6)), was: avg(before, a => lvl(FIS, a.q6)) };
    const up = x => x.now != null && x.was != null && x.now - x.was >= 0.5, down = x => x.now != null && x.was != null && x.now - x.was <= -0.5;
    const notes = [];
    if (riser) notes.push(riser.was < 0 ? `tu ${riser.s.toLowerCase()} ha pasado de golpe flojo a golpe de confianza` : `tu ${riser.s.toLowerCase()} gana confianza`);
    if (up(self)) notes.push("te ves mejor en pista que antes");
    if (up(fis)) notes.push("llegas mejor físicamente");
    if (faller) notes.push(`ojo con ${the(faller.s)}: ha perdido confianza`);
    if (down(fis)) notes.push("llegas más justo de físico");
    if (down(self)) notes.push("te ves peor que antes: cabeza fría");
    const goal = weakNow ? `Tu reto: ${the(weakNow.s)}, tu golpe con menos confianza ahora mismo.` : null;
    return { n, ready: true, k, riser, faller, weakNow, strongNow, self, fis, notes, goal };
  }
  /* Una frase para el aviso del mes */
  function line(sum) {
    if (!sum || !sum.ready) return null;
    if (!sum.notes.length) return sum.goal ? `Todo estable en tus últimos partidos. ${sum.goal}` : "Todo estable en tus últimos partidos.";
    const t = sum.notes.slice(0, 2).join(" y ");
    return t.charAt(0).toUpperCase() + t.slice(1) + ".";
  }
  return { summarize, line, SHOTS, the };
});
