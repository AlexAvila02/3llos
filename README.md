# Papubanda Website

Sitio web de la comunidad **Papubanda** (`https://3llos.pages.dev`) con páginas de personajes, ranking de PCs, seguimiento de series, torneos, equipo T2, gestor de mods y minijuegos interactivos.

## 📁 Estructura del Proyecto

```text
ellos/
├── index.html                  # Portada principal, buscador de personajes y modal Pintucalipso
├── css/                        # Hojas de estilo globales y de portada
│   ├── main.css                # Estilos principales, sidebar, ondas y layout responsive
│   ├── particles.css           # Partículas flotantes animadas de portada
│   ├── paint.css               # Estilos de Pintucalipso
│   └── mods.css                # Estilos del gestor de mods
├── js/                         # Scripts principales del sitio
│   ├── shared-ui.js            # Temas, sidebar, Web Audio API y navegación con sonido
│   ├── utils.js                # Ondas de agua en canvas, dólar API, error modal y partículas
│   ├── main.js                 # Buscador/redirecciones de personajes y eventos de portada
│   ├── firebase-config.js      # Configuración de Firebase Realtime Database
│   ├── mods.js                 # Cliente del gestor de mods de Minecraft
│   └── paint/                  # Módulos de Pintucalipso (state, layers, tools, sync)
├── functions/api/              # Cloudflare Pages Functions (Series Tracker + Minehost/Mods)
│   ├── _minehost.js            # Helper Pterodactyl/Minehost
│   ├── mods.js                 # Listado de mods .jar
│   ├── download-mod.js         # Descarga individual de mods
│   ├── download-all-zip.js     # Descarga empaquetada en ZIP
│   ├── _series-store.js        # Persistencia en Cloudflare KV, sesiones y hashing PBKDF2
│   └── series/                 # Endpoints REST (/api/series/*)
├── pages/
│   ├── mods.html               # Gestor de mods del servidor Minecraft
│   ├── personajes/             # Páginas individuales de miembros + personajes-common.css
│   ├── pcs/                    # Top mejores PCs (podio, tabla y fichas dinámicas)
│   ├── t2/                     # Página del equipo T2 de League of Legends
│   ├── torneos/                # Torneos Calipso (Ida, Vuelta y Top Promedio)
│   ├── series/                 # Series Tracker con perfiles protegidos y gráfico en Canvas
│   │   └── js/                 # Módulos: model, storage, chart, episodes-ui, modals-ui, app
│   └── juegos/                 # Juegos y utilidades interactivas
│       ├── ruleta.html         # Ruleta giratoria
│       ├── tierlist.html       # Creador de Tier Lists con exportación PNG
│       ├── lineadetiempo.html  # Línea de tiempo e historia de la comunidad
│       ├── teclado.html        # Test de teclado
│       ├── mando.html          # Test de mando / gamepad
│       ├── pixel-game.html     # Pixel Adventure (arquitectura modular en js/engine y js/pixel)
│       └── kisukedreemurr/     # Espejo sincronizado desde proyecto externo
├── scripts/
│   ├── check.mjs               # Verificador estático (sintaxis, imports, HTML y handlers)
│   └── deploy.mjs              # Script seguro de commit, rebase, push y check Cloudflare Pages
├── tests/                      # Suite automatizada con node:test
├── assets/                     # Imágenes, audio y videos
├── AGENTS.md                   # Guía técnica para agentes de IA
├── FIREBASE_SETUP.md           # Guía de configuración Firebase RTDB
└── SERIES_SETUP.md             # Guía de configuración Cloudflare KV (SERIES_KV)
```

## 🚀 Secciones y Características

- **Portada y Pintucalipso**: buscador de personajes, 6 temas visuales compartidos, cotización del dólar (DolarAPI), partículas y editor de dibujo multicapa con zoom, undo/redo, balde de pintura y sincronización opcional con Firebase.
- **Series Tracker (`pages/series/`)**: seguimiento de series por temporadas y capítulos (notas `0–10` con decimales), gráfico interactivo en Canvas, perfiles protegidos con clave, modo solo lectura compartible (`?user=...`) y respaldo local automático.
- **Juegos y utilidades (`pages/juegos/`)**: Pixel Adventure (plataformas con jefes, tienda, mercenario y niveles secretos), Ruleta, Tier List, Línea de Tiempo, Test de Teclado, Test de Mando y Kisukedreemurr.
- **Comunidad y Torneos**: páginas de personajes, Top PCs (`pages/pcs/`), equipo T2 de LoL (`pages/t2/`), Torneos Calipso (`pages/torneos/`) y Mods del servidor Minecraft (`pages/mods.html`).

## 🛠️ Desarrollo y Verificación

Requisitos: **Node.js** (probado en Node 24) con sus dependencias instaladas.

```powershell
# Levantar servidor local en el puerto 8080
npm.cmd run dev

# Ejecutar verificador estático (sintaxis, imports ES, links HTML, handlers inline)
npm.cmd run check

# Ejecutar suite de pruebas automatizadas
npm.cmd test

# Ejecutar verificación completa (check + tests)
npm.cmd run verify
```

> En Linux/macOS puedes usar `npm run <script>`; en Windows PowerShell utiliza `npm.cmd run <script>` si `npm.ps1` está restringido por la política de ejecución.

## ⚙️ Configuración de Servicios

- **Firebase Realtime Database (Pintucalipso)**: sigue las instrucciones en [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).
- **Cloudflare KV (Series Tracker)**: configura el binding `SERIES_KV` siguiendo [SERIES_SETUP.md](./SERIES_SETUP.md).
- **Minehost / Pterodactyl (Mods)**: define `MINEHOST_URL`, `MINEHOST_API_KEY` y `MINEHOST_SERVER_ID` en las variables de entorno de Cloudflare Pages.

## 📄 Licencia

Papubanda 2026
