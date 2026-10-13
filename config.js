/* =====================================================================
   CONFIGURACIÓN DE LA LIGA — lo único que hay que tocar
   ===================================================================== */
window.LIGA_CONFIG = {
  // Pega aquí el bloque firebaseConfig de tu proyecto, SOLO lo que va entre { y }.
  // (Firebase > engranaje > Configuración del proyecto > Tus apps > Configuración)
  // No es una contraseña: la seguridad la ponen las reglas de Firestore.
  FIREBASE: null,

  // PIN solo para el modo prueba (sin Firebase). Con Firebase, el PIN
  // está guardado en Firestore (config/pin) y no aparece en el código.
  LOCAL_PIN: "2627",

  // Cruces oficiales de la ida (J1–J9), en el mismo orden que la web original.
  // La vuelta (J10–J18) repite cada jornada con los cruces invertidos.
  CRUCES_IDA: [
    [["alvaro", "tomas"], ["eduardo", "pablo"], ["joan", "marcos"], ["pepe", "carlos"], ["marc", "julian"]], [["alvaro", "pablo"], ["tomas", "marcos"], ["eduardo", "carlos"], ["joan", "julian"], ["pepe", "marc"]], [["alvaro", "marcos"], ["pablo", "carlos"], ["tomas", "julian"], ["eduardo", "marc"], ["joan", "pepe"]], [["alvaro", "carlos"], ["marcos", "julian"], ["pablo", "marc"], ["tomas", "pepe"], ["eduardo", "joan"]], [["alvaro", "julian"], ["carlos", "marc"], ["marcos", "pepe"], ["pablo", "joan"], ["tomas", "eduardo"]], [["alvaro", "marc"], ["julian", "pepe"], ["carlos", "joan"], ["marcos", "eduardo"], ["pablo", "tomas"]], [["alvaro", "pepe"], ["marc", "joan"], ["julian", "eduardo"], ["carlos", "tomas"], ["marcos", "pablo"]], [["alvaro", "joan"], ["pepe", "eduardo"], ["marc", "tomas"], ["julian", "pablo"], ["carlos", "marcos"]], [["alvaro", "eduardo"], ["joan", "tomas"], ["pepe", "pablo"], ["marc", "marcos"], ["julian", "carlos"]]],
};
