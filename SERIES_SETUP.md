# Configuración de Cloudflare KV para Series Tracker

Este proyecto incluye perfiles de usuario compartidos y modo solo lectura para el **Series Tracker** (`/pages/series/index.html`) usando **Cloudflare Pages Functions** (`/api/series/*`) y **Cloudflare KV**.

## Pasos para activar la base de datos compartida en Cloudflare Pages

### 1. Crear el KV Namespace en Cloudflare

1. Entra al panel de [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. En el menú lateral ve a **Storage & Databases** (o **Workers & Pages**) > **KV**.
3. Haz clic en **Create a namespace**.
4. Asígnale un nombre descriptivo, por ejemplo `papubanda-series`, y confirma con **Add**.

### 2. Enlazar el binding `SERIES_KV` al proyecto de Cloudflare Pages

1. Ve a **Workers & Pages** y abre tu proyecto de **Cloudflare Pages** (donde está publicado este sitio).
2. Entra en **Settings** > **Bindings** (o **Functions** > **KV namespace bindings**).
3. Haz clic en **Add** > **KV namespace** y configura exactamente:
   - **Variable name**: `SERIES_KV`
   - **KV namespace**: selecciona `papubanda-series`
4. Asegúrate de añadir este mismo binding tanto para **Production** como para **Preview** si usas ramas de vista previa.
5. Guarda los cambios.

### 3. Redesplegar y verificar

1. Realiza un nuevo deploy desde la pestaña **Deployments** (por ejemplo **Retry deployment** sobre el último deploy) o haciendo `git push`.
2. Abre `https://tu-sitio.pages.dev/api/series` en el navegador.
3. Si está configurado correctamente, deberías recibir HTTP `200` con:
   ```json
   { "users": [] }
   ```
   (Si falta el binding `SERIES_KV`, el endpoint responderá HTTP `503` con `"code": "KV_NOT_CONFIGURED"`).

## Cómo funciona para los usuarios

- **Primera vez**: al entrar a `pages/series/index.html` sin perfil iniciado, se pide crear un **usuario** y una **clave o PIN corto** (mínimo 4 caracteres).
- **Edición protegida**: solo quien tenga la clave puede iniciar sesión y modificar sus series o calificaciones (también desde otros dispositivos).
- **Modo solo lectura**: cualquier persona puede ver los perfiles desde el directorio **👥 Usuarios** o abriendo el enlace compartible `?user=<usuario>`, recorrer temporadas, filtros y gráficos, pero no puede editar ni borrar las notas del autor.
- **Desarrollo local**: si se abre la página localmente con `npm run dev` (`live-server`) sin Cloudflare Functions, la aplicación activa automáticamente un modo de prueba en el navegador (`localStorage`) para poder probar el flujo completo sin configurar KV todavía.
