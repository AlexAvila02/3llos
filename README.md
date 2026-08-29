# Papubanda Website

Sitio web de la comunidad Papubanda con páginas de personajes, juegos y herramientas interactivas.

## 📁 Estructura del Proyecto

```
papubanda/
├── index.html                  # Página principal
├── css/                        # Estilos
│   ├── main.css               # Estilos principales
│   └── paint.css              # Estilos del paint app
├── js/                         # JavaScript
│   ├── firebase-config.js     # Configuración de Firebase
│   ├── utils.js               # Funciones utilitarias
│   ├── main.js                # Lógica principal
│   └── paint.js               # Lógica del paint app
├── pages/                      # Páginas del sitio
│   ├── personajes/            # Páginas de personajes
│   │   ├── andres.html
│   │   ├── arroz.html
│   │   ├── calipso.html
│   │   ├── primito.html
│   │   ├── pinguino.html
│   │   ├── pablito.html
│   │   ├── latipica.html
│   │   ├── godtorias.html
│   │   ├── alex.html
│   │   ├── emilio.html
│   │   ├── laura.html
│   │   ├── 33.html
│   │   ├── bowl.html
│   │   ├── aram1.html
│   │   ├── aun-no.html
│   │   └── andres-celeste.html
│   └── juegos/                # Juegos y herramientas
│       ├── ruleta.html
│       ├── tierlist.html
│       ├── lineadetiempo.html
│       └── teclado.html
├── assets/                     # Recursos
│   ├── images/                # Imágenes
│   └── audio/                 # Archivos de audio
├── components/                 # Componentes reutilizables
├── next.config.js             # Configuración de Next.js
├── FIREBASE_SETUP.md          # Guía de configuración Firebase
└── README.md                  # Este archivo
```

## 🚀 Características

### Página Principal
- **Buscador de personajes**: Escribe un nombre para ir a su página
- **Pintucalipso**: App de dibujo con:
  - Múltiples capas
  - Herramientas (pincel, borrador, balde, círculos, líneas)
  - Undo/redo
  - Zoom con Ctrl + rueda del ratón
  - Sincronización en tiempo real vía Firebase
- **Selector de temas**: 6 temas de colores
- **Cotización del dólar**: Actualizada vía API
- **Efectos visuales**: Partículas flotantes, ondas animadas

### Juegos y Herramientas
- **Ruleta**: Ruleta giratoria interactiva
- **Tier List**: Creador de tier lists
- **Línea de Tiempo**: Historia de la comunidad
- **Test de Teclado**: Probador de teclado

### Páginas de Personajes
Cada miembro tiene su propia página con diseño único y animaciones personalizadas.

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Base de datos**: Firebase Realtime Database
- **APIs**: DolarAPI (cotización en tiempo real)
- **Audio**: Web Audio API
- **Framework**: Next.js (configurado)

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
```

2. Navega al directorio:
```bash
cd papubanda
```

3. Abre `index.html` en tu navegador o usa un servidor local:
```bash
# Con Python 3
python -m http.server 8000

# Con Node.js
npx serve
```

## ⚙️ Configuración de Firebase

Para activar la sincronización en tiempo real del paint:

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Activa Realtime Database
3. Copia tus credenciales en `js/firebase-config.js`
4. Establece las reglas de seguridad en Firebase

Más detalles en `FIREBASE_SETUP.md`

## 🤝 Contribuir

1. Crea una rama para tu feature
2. Haz tus cambios
3. Crea un pull request

## 📝 Notas

- Las credenciales de Firebase en el repositorio son de ejemplo
- El sitio está diseñado para funcionar como sitio estático
- Compatibilidad: Chrome, Firefox, Safari, Edge (últimas versiones)

## 📄 Licencia

Papubanda 2026
