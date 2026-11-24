/* =====================================================================
   CONFIGURACIÓN DE LA LIGA — lo único que hay que tocar
   ===================================================================== */
window.LIGA_CONFIG = {
  // ============ PEGA AQUÍ LA CONFIGURACIÓN DE FIREBASE ============
  // Firebase > engranaje > Configuración del proyecto > pestaña General > "Tus apps" > tu app web > "Config".
  // Sustituye SOLO lo que está entre comillas por lo que te da Firebase. Conserva las comas y las llaves.
  // No es una contraseña: la seguridad la ponen las reglas de Firestore.
  FIREBASE: {
    apiKey: "AIzaSyCv-6otgZUtTF3pDscRvUd_oWwz_CZYLis",
    authDomain: "americana-legends-cup.firebaseapp.com",
    projectId: "americana-legends-cup",
    storageBucket: "americana-legends-cup.firebasestorage.app",
    messagingSenderId: "424447945192",
    appId: "1:424447945192:web:db0f7e1dec86ab94b69c5d"
  },

  // Clave pública de los avisos (no es secreta). La clave privada va en Vercel, nunca aquí.
  PUSH_KEY: "BCQ4vYCWwMsxwqhbBzkBNHA42AvJpZlhUJJsOhdzRZF3V49cnWI_6IEmE3iXdP3QrWPOom2ijZBCEIcOaQOOimU",

  // Código solo para probar en tu ordenador (localhost, sin Firebase). No es el de la liga:
  // el de verdad vive en Firestore (config/acceso) y nunca se sube a GitHub.
  LOCAL_PIN: "PRUEBA",

  // Día en que se abre el resumen de la primera vuelta (el 26/12, último día de la ida). Ese día llega un aviso especial.
  RECAP_FROM: "2026-12-26",
  // Entradas a la app según Vercel Analytics (se rellena automáticamente el 26/12). 0 = usar solo el contador propio.
  APP_OPENS: 0,
  // Uso de la app para el recap (24/11/2026):
  // - entradas: 109 páginas vistas reales en Vercel del 15 al 24/11 + 283 estimadas del 13/10 (primeros pronósticos) al 14/11,
  //   cuando aún no había analítica: el 13/10 como un día de anuncio (55, igual que el 18/11), la semana del 14 al 19/10
  //   al doble del ritmo normal (12/día, la de más pronósticos) y del 20/10 al 14/11 al ritmo normal (6/día).
  // - ritmo: media diaria de Vercel del 15 al 24/11 sin el día del anuncio de la agenda (54 / 9 días). Se usa para contar
  //   los días después de «hasta» mientras «vercel» esté a 0.
  // - vercel: páginas vistas en Vercel desde el día siguiente a «hasta» (lo rellena la tarea del 26/12).
  // - minVisita: duración media de una visita según PostHog (7 sesiones medidas del 22 al 24/11; muestra pequeña).
  APP_USAGE: { hasta: "2026-11-24", entradas: 392, ritmo: 6, vercel: 0, minVisita: 1.8 },
  // Únicas cuentas que pueden ver el recap antes de RECAP_FROM (enlace #recap-preview o 7 toques en el logo)
  RECAP_TESTERS: ["pepe"],

  // Cruces oficiales de la ida (J1–J9), en el mismo orden que la web original.
  // La vuelta (J10–J18) repite cada jornada con los cruces invertidos.
  // Jugadores con vídeo de entrada (img/<id>-walkout.webp). Ejemplo: ["alvaro","pepe"]
  WALKOUTS: [],

  CRUCES_IDA: [
    [["alvaro", "tomas"], ["eduardo", "pablo"], ["joan", "marcos"], ["pepe", "carlos"], ["marc", "julian"]], [["alvaro", "pablo"], ["tomas", "marcos"], ["eduardo", "carlos"], ["joan", "julian"], ["pepe", "marc"]], [["alvaro", "marcos"], ["pablo", "carlos"], ["tomas", "julian"], ["eduardo", "marc"], ["joan", "pepe"]], [["alvaro", "carlos"], ["marcos", "julian"], ["pablo", "marc"], ["tomas", "pepe"], ["eduardo", "joan"]], [["alvaro", "julian"], ["carlos", "marc"], ["marcos", "pepe"], ["pablo", "joan"], ["tomas", "eduardo"]], [["alvaro", "marc"], ["julian", "pepe"], ["carlos", "joan"], ["marcos", "eduardo"], ["pablo", "tomas"]], [["alvaro", "pepe"], ["marc", "joan"], ["julian", "eduardo"], ["carlos", "tomas"], ["marcos", "pablo"]], [["alvaro", "joan"], ["pepe", "eduardo"], ["marc", "tomas"], ["julian", "pablo"], ["carlos", "marcos"]], [["alvaro", "eduardo"], ["joan", "tomas"], ["pepe", "pablo"], ["marc", "marcos"], ["julian", "carlos"]]],
};

// Analítica de uso (PostHog, UE). Pega aquí la "Project API key" (empieza por phc_). Es pública: va en la app.
// Vacía = no se carga nada y no se pregunta a nadie.
window.DX_ANALYTICS = {
  key: "phc_q5zqwYMPsx6DcEMtTn5Cj8os7gfQEM7iGrYX7wGftAcL",
  host: "https://eu.i.posthog.com",
  app: "americana",
  privacyUrl: "/privacidad.html",
  actionAttrs: ["data-tab", "data-x", "data-open-match", "data-open-player", "data-act", "data-pred", "data-versus", "data-sv-nav", "data-agw-preset"]
};
