/* =====================================================================
   CIFRAS DE FUERA DE LA PISTA para el resumen de la primera vuelta.
   Lo que la app no puede calcular sola (GitHub, Vercel Analytics, PostHog).
   Lo de dentro de la pista (partidos, pronósticos, votos, aplazamientos,
   encuestas) se calcula en directo con los datos de la liga.

   Fuentes:
   - github:  historial del repositorio (cada cambio publicado de la app)
   - vercel:  visitas de Vercel Web Analytics (solo guarda desde el 15/11)
   - posthog: analítica de uso desde el 22/11 (solo de quien la ha aceptado)
   A partir del 22/11 PostHog es la fuente de uso de la app. El 26/12 a primera
   hora una tarea programada vuelve a sacar estas cifras y publica la app.
   ===================================================================== */
window.RECAP_DATA = {
  at: "2026-11-24",
  github: {
    commits: 90,              // cambios publicados en la app desde el 13/10
    prs: 22,
    busiestDay: { d: "2026-10-21", n: 23 }   // el día que más se tocó la app
  },
  vercel: {
    since: "2026-11-15",
    visits: 122,
    iosShare: 0.71            // 7 de cada 10 visitas, desde iPhone
  },
  posthog: {
    since: "2026-11-22",
    people: 4,                // jugadores que han aceptado la analítica
    sessions: 11,
    pageviews: 37,
    topScreen: "clasificacion" // la pantalla más vista después de Inicio
  }
};
