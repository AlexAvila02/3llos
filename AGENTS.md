# Guía del Repositorio para Agentes de IA (`AGENTS.md`)

Este repositorio corresponde al sitio web **Papubanda** (`https://3llos.pages.dev`). Está diseñado como una aplicación web estática sin bundler ni paso de compilación, acompañada por **Cloudflare Pages Functions** en `functions/api/` y pruebas/verificadores en Node.js.

---

## 1. Stack Técnico Real

- **Frontend estático**: HTML5, CSS3 y JavaScript vanilla servido desde la raíz (`.`), publicado en **Cloudflare Pages** (`netlify.toml` se conserva por compatibilidad legada).
- **Compatibilidad `file://` + HTTP**: la mayoría de las páginas usan scripts clásicos (`<script src="...">`) para funcionar tanto en servidor (`npm.cmd run dev` o producción) como abriendo los `.html` directamente desde el sistema de archivos.
- **Módulos ES nativos (navegador)**: únicamente **Pixel Adventure** (`pages/juegos/pixel-game.html` → `pages/juegos/js/**/*.js`) utiliza `<script type="module">`.
- **Backend serverless (Cloudflare Pages Functions)**: `functions/api/` en formato ES Modules (Web Standard `Request`/`Response` + Web Crypto).
  - `netlify/functions/` se conserva por compatibilidad legada con Netlify.
- **Persistencia externa**:
  - **Series Tracker**: Cloudflare KV (`SERIES_KV`) en producción; respaldo automático en `localStorage` cuando se ejecuta localmente o sin binding configurado (ver `SERIES_SETUP.md`).
  - **Pintucalipso**: Firebase Realtime Database (`js/firebase-config.js`, ver `FIREBASE_SETUP.md`) + `localStorage`.
  - **Mods Minecraft**: API de Pterodactyl/Minehost mediante variables de entorno en Cloudflare Pages.

---

## 2. Comandos de Trabajo

> **Nota para Windows PowerShell**: si `npm` falla por `ExecutionPolicy` (`npm.ps1`), ejecuta `npm.cmd` o llama directamente a `node`.

```powershell
# Servidor local de desarrollo (puerto 8080)
npm.cmd run dev

# Verificador estático (sintaxis JS/MJS, imports ES, refs HTML, handlers inline y tamaños)
npm.cmd run check
# o: node scripts/check.mjs

# Suite de pruebas unitarias e integración (node:test)
npm.cmd test
# o: node --test tests/*.test.mjs

# Verificación completa obligatoria antes de cerrar cualquier cambio
npm.cmd run verify

# Commit seguro + rebase con origin/main + push + espera de despliegue en Cloudflare Pages (ver GEMINI.md)
npm.cmd run deploy -- "feat: descripción breve del cambio"
```

---

## 3. Mapa Completo de Carpetas y Módulos

```text
.
├── index.html                  # Portada principal, barra de búsqueda, navegación rápida y modal de Paint
├── css/
│   ├── main.css                # Estilos principales del sitio, sidebar, ondas y responsive (con índice interno)
│   ├── particles.css           # Partículas flotantes animadas de index.html
│   ├── paint.css               # Estilos exclusivos del modal Pintucalipso
│   └── mods.css                # Estilos de pages/mods.html
├── js/
│   ├── shared-ui.js            # Utilidades globales: temas, sidebar, Web Audio API y navigateWithCloseSound()
│   ├── utils.js                # Sonido gota, modal de error, canvas water-ripple, dólar API y partículas
│   ├── main.js                 # Buscador de personajes, redirecciones, scroll e inicialización de portada
│   ├── firebase-config.js      # Inicialización Firebase RTDB para Pintucalipso
│   ├── mods.js                 # Lógica de listado, filtros, estado MC y descarga directa/ZIP de mods
│   └── paint/                  # Pintucalipso modularizado (namespace global window.PaintApp)
│       ├── state.js            # Estado compartido del lienzo, herramientas, zoom, capas y hexToRgb
│       ├── layers.js           # Capas, miniaturas, localStorage y undo/redo
│       ├── tools.js            # Pincel, borrador, círculo, línea, floodFill y exportación PNG
│       └── sync.js             # Eventos del canvas, modal y sincronización con Firebase
├── functions/api/              # Endpoints de Cloudflare Pages Functions (ESM)
│   ├── _minehost.js            # Config y fetch autenticado a Pterodactyl/Minehost
│   ├── mods.js                 # GET /api/mods
│   ├── download-mod.js         # GET /api/download-mod?file=*.jar
│   ├── download-all-zip.js     # GET/POST /api/download-all-zip
│   ├── _series-store.js        # Validación, PBKDF2-SHA256, sesiones Bearer y acceso a SERIES_KV
│   └── series/
│       ├── index.js            # GET /api/series (directorio público)
│       ├── register.js         # POST /api/series/register
│       ├── login.js            # POST /api/series/login
│       ├── logout.js           # POST /api/series/logout
│       └── [username].js       # GET / PUT /api/series/:username
├── netlify/functions/          # Funciones legadas de Netlify (conservar)
├── pages/
│   ├── mods.html               # Gestor de mods del servidor Minecraft
│   ├── personajes/             # 12 páginas de miembros + personajes-common.css
│   ├── pcs/                    # Top PCs Papu Banda
│   │   ├── index.html          # Podio y tabla comparativa
│   │   ├── pcs-index.css       # Estilos del ranking
│   │   ├── pcs-index.js        # Renderizado del podio y tabla
│   │   ├── pcs-data.js         # Fuente única de datos de PCs (PCS_DATA)
│   │   ├── pc.html             # Ficha dinámica (?id=...)
│   │   ├── pc-detail.css       # Estilos compartidos de fichas individuales
│   │   ├── pc-detail.js        # Renderizador de ficha individual (data-pc-id o ?id=)
│   │   └── gubi.html, lokito.html, shadownix23.html
│   ├── t2/                     # Equipo T2 de League of Legends
│   │   ├── index.html
│   │   ├── t2.css
│   │   ├── t2-data.js          # Fuente única de datos (T2_DATA)
│   │   └── t2.js               # Renderizado de roster, estadísticas, champs e historial
│   ├── torneos/                # Historial de torneos
│   │   ├── torneo.css          # Estilos compartidos del índice, top promedio y detalle
│   │   ├── index.html
│   │   ├── top-promedio.html
│   │   ├── torneo-calipso.html
│   │   └── torneo-calipso-revancha.html
│   ├── series/                 # Series Tracker multiusuario
│   │   ├── index.html
│   │   ├── series.css          # Estilos (con índice de secciones)
│   │   └── js/                 # Scripts clásicos compartiendo window.SeriesTracker
│   │       ├── model.js        # Validación, normalización, stats y summary (también importable en Node)
│   │       ├── storage.js      # Sesión, caché, localDbApi y cliente HTTP/KV
│   │       ├── chart.js        # Gráfico en <canvas> y tooltip
│   │       ├── episodes-ui.js  # Tarjetas KPI, pestañas y filas de capítulos
│   │       ├── modals-ui.js    # Banner de perfil, modal de auth y directorio de usuarios
│   │       └── app.js          # Contexto compartido, sincronización, eventos e init()
│   └── juegos/
│       ├── css/                # juegos-common.css y CSS específico de cada juego/herramienta
│       ├── ruleta.html, tierlist.html, lineadetiempo.html, teclado.html, mando.html
│       ├── pixel-game.html     # Pixel Adventure (usa css/pixel-game.css + ES Modules en js/)
│       ├── js/
│       │   ├── state.js, levels.js, audio.js, player.js, entities.js, game.js
│       │   ├── engine/         # camera.js, loop.js, scene.js
│       │   ├── pixel/          # combat.js, level-loader.js, mercenary.js, bosses.js,
│       │   │                   # render-bg.js, render-world.js, render-hud.js
│       │   └── ruleta.js, tierlist.js, lineadetiempo.js, teclado.js, mando.js
│       └── kisukedreemurr/     # ESPEJO EXTERNO — NO EDITAR AQUÍ
├── scripts/
│   ├── check.mjs               # Verificador estático del repositorio
│   └── deploy.mjs              # Flujo de commit + rebase + push + estado Cloudflare Pages
├── tests/                      # Pruebas automatizadas con node:test
│   ├── series-api.test.mjs
│   ├── series-model.test.mjs
│   └── minehost-api.test.mjs
├── assets/                     # Imágenes, audio y videos
├── components/                 # Directorio reservado (conservar)
└── server/                     # Dependencias auxiliares de servidor (conservar)
```

---

## 4. Guía Rápida: Dónde Hacer Cambios Frecuentes

- **Agregar o modificar un personaje / redirección**: añade el `.html` en `pages/personajes/` enlazando `personajes-common.css` + `../../js/shared-ui.js` (usando `navigateWithCloseSound(event, '../../index.html')`) y registra su patrón en `js/main.js`.
- **Actualizar el ranking de PCs**: edita `pages/pcs/pcs-data.js` (`PCS_DATA`). Tanto `pages/pcs/index.html` como `pages/pcs/pc.html` se actualizan automáticamente.
- **Actualizar el equipo T2 (LoL)**: edita únicamente `pages/t2/t2-data.js` (`T2_DATA`).
- **Agregar o editar un torneo**: usa `pages/torneos/torneo.css` y enlázalo desde el HTML correspondiente en `pages/torneos/`.
- **Cambiar lógica del gestor de Mods**: frontend en `pages/mods.html` + `js/mods.js` + `css/mods.css`; backend en `functions/api/mods.js`, `download-mod.js`, `download-all-zip.js` y `_minehost.js`.
- **Cambiar lógica de Series Tracker**:
  - Reglas de negocio / cálculos / validación: `pages/series/js/model.js` y su contraparte de servidor `functions/api/_series-store.js` (mantener ambas sincronizadas).
  - UI o gráfico: `episodes-ui.js`, `modals-ui.js` o `chart.js` en `pages/series/js/`.
  - Persistencia o API cliente: `pages/series/js/storage.js`.
- **Modificar Pixel Adventure**:
  - Niveles: `pages/juegos/js/levels.js`.
  - Físicas e input del jugador: `pages/juegos/js/player.js`.
  - Combate, carga de niveles, mercenario o jefes: `pages/juegos/js/pixel/combat.js`, `level-loader.js`, `mercenary.js`, `bosses.js`.
  - Renderizado: `pages/juegos/js/pixel/render-bg.js`, `render-world.js`, `render-hud.js`.
- **Modificar Pintucalipso**: archivos en `js/paint/` (`state.js`, `layers.js`, `tools.js`, `sync.js`) y `css/paint.css`.

---

## 5. Reglas Críticas y Trampas Conocidas

1. **NO editar `pages/juegos/kisukedreemurr/`**: es un espejo sincronizado desde `C:\Users\USUARIO\Desktop\Kisukedreemurr` mediante `actualizar-kisukedreemurr.bat` usando `robocopy /MIR` (cualquier cambio local aquí será sobrescrito).
2. **No convertir páginas clásicas a `<script type="module">`**: todas las páginas fuera de `pages/juegos/pixel-game.html` cargan scripts clásicos para seguir funcionando al abrirse directamente con `file://`.
3. **Handlers `onclick` en HTML**: cualquier función llamada desde `onclick`, `onchange` o `oninput` en un `.html` debe quedar expuesta en el ámbito global (`window`), y `scripts/check.mjs` lo verifica automáticamente.
4. **Cuidar el orden de carga de scripts**:
   - En `index.html`: `shared-ui.js` → `utils.js` → `firebase-config.js` → `main.js` → `paint/state.js` → `paint/layers.js` → `paint/tools.js` → `paint/sync.js`.
   - En `pages/series/index.html`: `shared-ui.js` → `model.js` → `storage.js` → `chart.js` → `episodes-ui.js` → `modals-ui.js` → `app.js`.
5. **Conservar directorios heredados**: no eliminar `netlify/functions/`, `server/` ni `components/`.
6. **Variables de entorno en producción**:
   - Series Tracker requiere el binding KV `SERIES_KV` en Cloudflare Pages (ver `SERIES_SETUP.md`).
   - Mods Minecraft requiere `MINEHOST_URL`, `MINEHOST_API_KEY` y `MINEHOST_SERVER_ID`.
7. **Referencia de audio conocida**: `pages/juegos/pixel-game.html` referencia `../../assets/audio/nivel11.mp3` (archivo de audio opcional pendiente). `scripts/check.mjs` lo reporta como `[WARN]`, pero bloqueará cualquier otra referencia rota nueva.

---

## 6. Convenciones de Código y Flujo de Trabajo

- **Idioma**: escribe todos los comentarios, docstrings, mensajes de UI, documentación y commits en **español**.
- **Seguridad XSS**: al construir HTML dinámico con cadenas de usuario o datos externos (`innerHTML`), escapa siempre con `escapeHtml()`.
- **Tamaño y cohesión**: mantén los módulos enfocados y por debajo de ~500 líneas cuando sea viable; extrae CSS/JS inline de nuevos archivos HTML a archivos dedicados.
- **Verificación obligatoria**: después de editar código, ejecuta siempre `npm.cmd run verify` y confirma que `scripts/check.mjs` y `tests/*.test.mjs` pasen sin errores.
- **Despliegue**: revisa `GEMINI.md` para las reglas de commit y despliegue automático mediante `scripts/deploy.mjs`.
