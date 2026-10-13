# Americana Legends Cup · Vol. 1 (2026–27)

Web de la liga: carteles de cada partido, livescore en tiempo real, clasificación oficial según el reglamento, estadísticas, MVP, pronósticos, playoffs y premios.

Es una web estática (HTML + CSS + JS, sin compilación), así que en Vercel carga al instante. Los datos viven en Supabase y se actualizan en directo en todos los móviles.

## Puesta en marcha (unos 10 minutos)

### 1. Supabase
1. En tu proyecto de Supabase, abre **SQL Editor > New query**.
2. Abre `supabase/schema.sql`, **cambia el PIN** en la línea marcada y pégalo entero. Pulsa **Run**.
3. En **Project Settings > API** copia la **Project URL** y la **anon public key**.

### 2. Configuración
Abre `config.js` y pega los dos valores:
```js
SUPABASE_URL: "https://xxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJ...",
```
La anon key es pública por diseño: lo que protege los datos son las reglas del esquema. Los resultados **solo** se pueden guardar con el PIN, que vive en la base de datos y no en el código.

### 3. GitHub + Vercel
1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New > Project**, importa el repo y pulsa **Deploy** (sin framework ni build command).
3. Cada `git push` vuelve a publicar la web.

## Uso
- **Marcador en directo**: abre el partido, pulsa *Empezar marcador en directo* y toca la cara de quien gana cada juego. Detecta solo el tie-break (6-6) y el super tie-break (1-1 en sets). Tiene *Deshacer*.
- **Resultado final / WO / borrar**: desde la ficha del partido.
- **Pronósticos**: cada uno elige su nombre una vez y vota antes de que empiece el partido.

## Cambiar cosas
- **Calendario**: `CRUCES_IDA` en `config.js` ya tiene los cruces oficiales J1–J9 en el orden de la web original. La vuelta (J10–J18) repite cada jornada con los cruces invertidos.
- **Motes y descripciones**: lista `PLAYERS` en `app.js` (`nick`, `style`, `bio`).
- **Secciones**: Hoy, Clasificación, Calendario / Resultados, Jugadores, Comparador H2H, Analytics, Votación MVP, Pronósticos, Playoffs y premios. *Exportar JSON* descarga una copia de todos los datos.
- **Fotos**: `img/players/<id>.webp` (PNG/WebP con fondo transparente, cabeza y hombros, unos 500 px de ancho).
- **Colores y nombres**: lista `PLAYERS` al principio de `app.js`.
