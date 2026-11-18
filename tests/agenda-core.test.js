/* Pruebas del motor de la agenda: node tests/agenda-core.test.js */
const A = require("../agenda-core.js");
const assert = require("assert");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("✓", name); };

// 2026-11-18 es miércoles
const pepe = { days: [1, 2, 3, 4], wk: ["t", "n"], we: [], marks: {} };            // lun–jue tarde/noche
const joan = { days: [2, 4, 6], wk: ["n"], we: ["m"], marks: {} };                  // mar, jue noche; sáb mañana
const base = { a: "pepe", b: "joan", avA: pepe, avB: joan, today: "2026-11-18", nowHour: 10, winStart: "2026-11-17", winEnd: "2026-11-26" };

t("día de la semana correcto", () => { assert.strictEqual(A.dow("2026-11-18"), 3); assert.strictEqual(A.fmtDay("2026-11-19"), "jue 19 nov"); });
t("estado: franja y día habitual", () => {
  assert.strictEqual(A.status(pepe, "2026-11-19", "t"), "yes");
  assert.strictEqual(A.status(pepe, "2026-11-19", "m"), "no");
  assert.strictEqual(A.status(pepe, "2026-11-21", "m"), "no");      // sábado, sin franjas de finde
  assert.strictEqual(A.status(null, "2026-11-21", "m"), "unknown");
});
t("excepciones: «no puedo» gana y «sí seguro» abre el día", () => {
  const p = { ...pepe, marks: { "2026-11-19": "no", "2026-11-20": "si" } };
  assert.strictEqual(A.status(p, "2026-11-19", "t"), "no");
  assert.strictEqual(A.status(p, "2026-11-20", "t"), "sure");        // viernes no es habitual, pero lo marcó
  assert.strictEqual(A.status(p, "2026-11-20", "m"), "no");          // fuera de sus franjas
});
t("encuentra solo huecos comunes, dentro de plazo y ordenados por fecha", () => {
  const r = A.suggest(base);
  assert.strictEqual(r.status, "ok");
  assert.deepStrictEqual(r.slots.map(s => s.date + s.f), ["2026-11-19n", "2026-11-24n", "2026-11-26n"]);
  r.slots.forEach(s => { assert.ok(s.date <= base.winEnd); assert.strictEqual(s.a !== "no" && s.b !== "no", true); });
});
t("hoy solo si hay antelación (2 h)", () => {
  const p = { days: [3], wk: ["md", "n"], we: [] }, j = { days: [3], wk: ["md", "n"], we: [] };
  const r1 = A.suggest({ ...base, avA: p, avB: j, nowHour: 12.5, winEnd: "2026-11-18" });
  assert.ok(r1.slots.some(s => s.date === "2026-11-18" && s.f === "n"));
  assert.ok(!r1.slots.some(s => s.date === "2026-11-18" && s.f === "md"));
});
t("no propone días en que alguno ya juega otro partido", () => {
  const r = A.suggest({ ...base, busy: { joan: ["2026-11-19"] } });
  assert.ok(!r.slots.some(s => s.date === "2026-11-19"));
});
t("hora habitual aprendida de los partidos jugados", () => {
  const prev = [{ a: "pepe", b: "marc", time: "21:00" }, { a: "joan", b: "carlos", time: "21:00" }, { a: "x", b: "y", time: "20:30" }];
  const pt = A.prefTimes(prev, "pepe", "joan");
  assert.strictEqual(pt.n, "21:00");
  const r = A.suggest({ ...base, prefTime: pt });
  assert.strictEqual(r.slots[0].time, "21:00");
  assert.strictEqual(r.slots[0].key, "2026-11-19|21:00");
});
t("si alguien no ha rellenado su agenda: espera su respuesta", () => {
  const r = A.suggest({ ...base, avB: null });
  assert.strictEqual(r.status, "needsAvail");
  assert.deepStrictEqual(r.missing, ["joan"]);
  assert.ok(r.pending.length > 0 && r.pending.every(s => s.waiting === "joan"));
});
t("sin hueco común: lo dice y enseña los casi", () => {
  const p = { days: [1], wk: ["m"], we: [] }, j = { days: [2], wk: ["n"], we: [] };
  const r = A.suggest({ ...base, avA: p, avB: j });
  assert.strictEqual(r.status, "noCommon");
  assert.strictEqual(r.slots.length, 0);
  assert.ok(r.near.length > 0);
});
t("partido aplazado (plazo pasado): busca en las 2 semanas siguientes", () => {
  const r = A.suggest({ ...base, winStart: "2026-11-07", winEnd: "2026-11-16" });
  assert.ok(r.late);
  assert.ok(r.slots.length > 0 && r.slots.every(s => s.date >= "2026-11-18" && s.date <= "2026-12-02"));
});
t("jornada futura: no propone antes de que empiece", () => {
  const r = A.suggest({ ...base, winStart: "2026-11-27", winEnd: "2026-12-06" });
  assert.ok(r.slots.every(s => s.date >= "2026-11-27"));
});
t("último día de plazo sin hueco: amplía una semana y lo marca fuera de plazo", () => {
  const r = A.suggest({ ...base, today: "2026-11-26", nowHour: 22, winEnd: "2026-11-26" });
  assert.ok(r.extended);
  assert.ok(r.slots.length > 0 && r.slots.every(s => s.outside));
});
t("un hueco por día y como mucho 4", () => {
  const all = { days: [0, 1, 2, 3, 4, 5, 6], wk: ["m", "md", "t", "n"], we: ["m", "md", "t", "n"] };
  const r = A.suggest({ ...base, avA: all, avB: all });
  assert.strictEqual(r.slots.length, 4);
  assert.strictEqual(new Set(r.slots.map(s => s.date)).size, 4);
});
t("acuerdo: el primer hueco que han marcado los dos y no ha pasado", () => {
  const plan = { picks: { pepe: ["2026-11-24|20:30", "2026-11-19|20:30", "2026-11-10|20:30"], joan: ["2026-11-19|20:30", "2026-11-24|20:30", "2026-11-10|20:30"] } };
  assert.strictEqual(A.agreed(plan, "pepe", "joan", "2026-11-18"), "2026-11-19|20:30");
  assert.strictEqual(A.agreed({ picks: { pepe: ["2026-11-19|20:30"] } }, "pepe", "joan", "2026-11-18"), null);
});
t("franja de una hora", () => { assert.strictEqual(A.franjaOf("10:30"), "m"); assert.strictEqual(A.franjaOf("14:00"), "md"); assert.strictEqual(A.franjaOf("19:59"), "t"); assert.strictEqual(A.franjaOf("21:15"), "n"); });
console.log(`\n${n} pruebas superadas`);
