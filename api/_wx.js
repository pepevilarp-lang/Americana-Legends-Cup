/* Previsión del tiempo para la hora del partido (Open-Meteo: gratis, sin clave).
   Devuelve la condición en las mismas palabras que la encuesta de después del partido,
   para cruzarla con el historial del rival. */
const LAT = 41.39, LON = 2.17;   // Barcelona
const DESC = { "Mucho viento": "viento fuerte 🌬️", "Calor intenso": "calor fuerte 🥵", "Frío": "frío 🥶", "Llovizna": "llovizna 🌦️",
  "Partido después de lluvia / pista pesada": "pista pesada por la lluvia 🌧️", "Humedad alta": "mucha humedad 💧", "Viento ligero": "algo de viento 🍃" };

async function forecast() {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m&past_days=1&forecast_days=3&timezone=Europe%2FMadrid&wind_speed_unit=kmh`;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
  try { const r = await fetch(u, { signal: ctl.signal }); if (!r.ok) return null; return await r.json(); }
  catch (_) { return null; } finally { clearTimeout(t); }
}
/* Condición prevista el día `date` a la hora `time` («HH:MM»; sin hora, las 18:00) */
function condAt(fc, date, time) {
  if (!fc || !fc.hourly || !date) return null;
  const H = fc.hourly, hh = String(time || "18:00").slice(0, 2), key = `${date}T${hh}:00`, i = H.time.indexOf(key);
  if (i < 0) return null;
  const wind = Math.max(H.wind_speed_10m[i] || 0, (H.wind_gusts_10m[i] || 0) * 0.6), temp = H.temperature_2m[i], rh = H.relative_humidity_2m[i];
  const rainNow = H.precipitation[i] || 0, rainBefore = H.precipitation.slice(Math.max(0, i - 12), i).reduce((s, x) => s + (x || 0), 0);
  if (rainNow >= 0.2 && rainNow < 2) return "Llovizna";
  if (rainBefore >= 2) return "Partido después de lluvia / pista pesada";
  if (wind >= 25) return "Mucho viento";
  if (temp >= 30) return "Calor intenso";
  if (temp <= 8) return "Frío";
  if (rh >= 88) return "Humedad alta";
  if (wind >= 15) return "Viento ligero";
  return null;   // condiciones normales
}
module.exports = { forecast, condAt, DESC };
