/* =====================================================================
   AGENDA INTELIGENTE · motor (sin pantalla)
   Lo usan la app (agenda.js) y los recordatorios del servidor (api/daily.js),
   así que no depende del navegador. Fechas en texto «AAAA-MM-DD».

   Disponibilidad de un jugador (documento avail/<jugador>):
     { days:[1,2,4],          // días de la semana que suele poder (0 = domingo)
       wk:["t","n"],           // franjas entre semana
       we:["m","md"],          // franjas en fin de semana
       marks:{ "2026-11-21":"no", "2026-11-23":"si" },   // excepciones de días concretos
       at: 1731900000000 }
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AgendaCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const FRANJAS = [
    { k: "m",  label: "Mañana",   hint: "9 a 13 h",  from: 9,  to: 13, def: "10:00" },
    { k: "md", label: "Mediodía", hint: "13 a 16 h", from: 13, to: 16, def: "14:00" },
    { k: "t",  label: "Tarde",    hint: "16 a 20 h", from: 16, to: 20, def: "18:30" },
    { k: "n",  label: "Noche",    hint: "20 a 23 h", from: 20, to: 23, def: "20:30" },
  ];
  const FK = Object.fromEntries(FRANJAS.map(f => [f.k, f]));
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const DIAS_C = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const pd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const ymd = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const t = pd(s); t.setUTCDate(t.getUTCDate() + n); return ymd(t); };
  const dow = s => pd(s).getUTCDay();
  const diff = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
  const isWeekend = s => { const w = dow(s); return w === 0 || w === 6; };
  const fmtDay = s => { const [, m, d] = s.split("-").map(Number); return `${DIAS_C[dow(s)]} ${d} ${MES[m - 1]}`; };
  const hhmm = t => { const [h, m] = String(t || "0:0").split(":").map(Number); return h + (m || 0) / 60; };
  const franjaOf = time => { const h = hhmm(time); return (FRANJAS.find(f => h >= f.from && h < f.to) || (h < 9 ? FRANJAS[0] : FRANJAS[3])).k; };

  /* ¿Tiene agenda útil? (ha contestado al menos días y alguna franja) */
  function filled(av) {
    return !!(av && Array.isArray(av.days) && av.days.length && ((av.wk && av.wk.length) || (av.we && av.we.length)));
  }

  /* Estado de un jugador en un día y franja: "sure" | "yes" | "no" | "unknown" */
  function status(av, date, f) {
    if (!filled(av)) {
      const mk = av && av.marks && av.marks[date];
      if (mk === "no") return "no";
      if (mk === "si") return "sure";
      return "unknown";
    }
    const mark = av.marks && av.marks[date];
    if (mark === "no") return "no";
    const group = (isWeekend(date) ? av.we : av.wk) || [];
    if (mark === "si") return group.length ? (group.includes(f) ? "sure" : "no") : "sure";
    return av.days.includes(dow(date)) && group.includes(f) ? "yes" : "no";
  }

  /* Hora habitual de cada franja, aprendida de los partidos ya jugados (los de la pareja pesan el triple) */
  function prefTimes(matches, a, b) {
    const count = {};
    (matches || []).forEach(m => {
      if (!m || !m.time || !/^\d{1,2}:\d{2}$/.test(m.time)) return;
      const w = (m.a === a || m.b === a || m.a === b || m.b === b) ? 3 : 1, f = franjaOf(m.time);
      count[f] = count[f] || {}; count[f][m.time] = (count[f][m.time] || 0) + w;
    });
    const out = {};
    FRANJAS.forEach(f => { const c = count[f.k]; out[f.k] = c ? Object.entries(c).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0][0] : f.def; });
    return out;
  }

  /* Propuesta de huecos para un partido.
     o = { a, b, avA, avB, today, nowHour, winStart, winEnd, busy:{[pid]:[fechas]}, prefTime, max, minNotice } */
  function suggest(o) {
    const max = o.max || 4, notice = o.minNotice == null ? 2 : o.minNotice;
    const pref = o.prefTime || {};
    const late = !!o.winEnd && o.winEnd < o.today;
    let start = o.winStart && o.winStart > o.today ? o.winStart : o.today;
    let end = late ? addDays(o.today, 14) : (o.winEnd || addDays(o.today, 14));
    const extended = !late && diff(start, end) < 1;              // casi sin margen: se mira también la semana siguiente
    if (extended) end = addDays(end, 7);
    const busyA = new Set((o.busy && o.busy[o.a]) || []), busyB = new Set((o.busy && o.busy[o.b]) || []);
    const both = [], pending = [], near = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (busyA.has(d) || busyB.has(d)) continue;               // ese día uno de los dos ya juega otro partido
      const dd = diff(o.today, d);
      for (const f of FRANJAS) {
        if (dd === 0 && (o.nowHour == null ? 24 : o.nowHour) > f.from - notice) continue;   // hoy, sin antelación suficiente
        const sa = status(o.avA, d, f.k), sb = status(o.avB, d, f.k);
        const okA = sa === "yes" || sa === "sure", okB = sb === "yes" || sb === "sure";
        let score = -dd * 2 - (dd === 0 ? 18 : dd === 1 ? 4 : 0) + (isWeekend(d) ? 3 : 0);
        if (busyA.has(addDays(d, -1)) || busyA.has(addDays(d, 1)) || busyB.has(addDays(d, -1)) || busyB.has(addDays(d, 1))) score -= 6;
        if (o.winEnd && d > o.winEnd && !late) score -= 25;      // fuera de plazo: solo si no hay otra cosa
        score += (sa === "sure" ? 12 : 0) + (sb === "sure" ? 12 : 0);
        const slot = { date: d, f: f.k, time: pref[f.k] || f.def, key: `${d}|${pref[f.k] || f.def}`, a: sa, b: sb, outside: !!(o.winEnd && d > o.winEnd) };
        if (okA && okB) both.push({ ...slot, score: 100 + score });
        else if ((okA && sb === "unknown") || (okB && sa === "unknown")) pending.push({ ...slot, score: 40 + score, waiting: okA ? o.b : o.a });
        else if (okA || okB) near.push({ ...slot, score: 10 + score, cant: okA ? o.b : o.a });
      }
    }
    const pick = list => {
      const byDay = {};
      list.forEach(s => { if (!byDay[s.date] || s.score > byDay[s.date].score) byDay[s.date] = s; });
      return Object.values(byDay).sort((x, y) => y.score - x.score || x.date.localeCompare(y.date)).slice(0, max)
        .sort((x, y) => x.date.localeCompare(y.date));
    };
    const missing = [[o.a, o.avA], [o.b, o.avB]].filter(([, av]) => !filled(av)).map(([p]) => p);
    const slots = pick(both);
    return {
      status: slots.length ? "ok" : missing.length ? "needsAvail" : "noCommon",
      slots, pending: pick(pending), near: pick(near).slice(0, 3), missing, late, extended,
      window: { start, end },
    };
  }

  /* Primer hueco que han marcado los dos (y que aún no ha pasado) */
  function agreed(plan, a, b, today) {
    const pa = (plan && plan.picks && plan.picks[a]) || [], pb = (plan && plan.picks && plan.picks[b]) || [];
    return pa.filter(k => pb.includes(k) && k.split("|")[0] >= today).sort()[0] || null;
  }

  /* Texto corto para un hueco: «jue 20 nov · 18:30» */
  const label = s => `${fmtDay(s.date || s.split("|")[0])} · ${s.time || s.split("|")[1]}`;

  return { FRANJAS, FK, DIAS, DIAS_C, filled, status, prefTimes, suggest, agreed, label, fmtDay, addDays, diff, dow, isWeekend, franjaOf };
});
