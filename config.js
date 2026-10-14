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

  // PIN solo para probar en tu ordenador (localhost). Con Firebase, el PIN está en las reglas de Firestore.
  LOCAL_PIN: "2627",

  // Cruces oficiales de la ida (J1–J9), en el mismo orden que la web original.
  // La vuelta (J10–J18) repite cada jornada con los cruces invertidos.
  // Jugadores con vídeo de entrada (img/<id>-walkout.webp). Ejemplo: ["alvaro","pepe"]
  WALKOUTS: [],

  CRUCES_IDA: [
    [["alvaro", "tomas"], ["eduardo", "pablo"], ["joan", "marcos"], ["pepe", "carlos"], ["marc", "julian"]], [["alvaro", "pablo"], ["tomas", "marcos"], ["eduardo", "carlos"], ["joan", "julian"], ["pepe", "marc"]], [["alvaro", "marcos"], ["pablo", "carlos"], ["tomas", "julian"], ["eduardo", "marc"], ["joan", "pepe"]], [["alvaro", "carlos"], ["marcos", "julian"], ["pablo", "marc"], ["tomas", "pepe"], ["eduardo", "joan"]], [["alvaro", "julian"], ["carlos", "marc"], ["marcos", "pepe"], ["pablo", "joan"], ["tomas", "eduardo"]], [["alvaro", "marc"], ["julian", "pepe"], ["carlos", "joan"], ["marcos", "eduardo"], ["pablo", "tomas"]], [["alvaro", "pepe"], ["marc", "joan"], ["julian", "eduardo"], ["carlos", "tomas"], ["marcos", "pablo"]], [["alvaro", "joan"], ["pepe", "eduardo"], ["marc", "tomas"], ["julian", "pablo"], ["carlos", "marcos"]], [["alvaro", "eduardo"], ["joan", "tomas"], ["pepe", "pablo"], ["marc", "marcos"], ["julian", "carlos"]]],
};
