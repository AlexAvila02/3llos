# Reglas de Despliegue Automático (Antigravity)

Este repositorio (`origin`: `https://github.com/AlexAvila02/3llos.git`, rama `main`) está conectado a **Cloudflare Pages** y despliega automáticamente a producción en:

- **URL de producción**: `https://3llos.pages.dev`

## Regla obligatoria tras cada modificación

Después de completar cualquier modificación de archivos en este repositorio desde Antigravity (salvo que el usuario indique explícitamente **NO** subir los cambios todavía), debes publicar todo en Git y en la página `.dev` ejecutando en PowerShell:

```powershell
npm.cmd run deploy -- "<tipo>: <descripción breve en español>"
```

(O directamente `node scripts/deploy.mjs "<tipo>: <descripción breve en español>"`; en este entorno Windows usa `npm.cmd` en lugar de `npm` porque `npm.ps1` está bloqueado por la política de ejecución de PowerShell).

Usa el formato **Conventional Commits** (`feat:`, `fix:`, `style:`, `refactor:`, `chore:`, `docs:`), por ejemplo:

```powershell
npm.cmd run deploy -- "feat: agregar nueva sección en inicio"
```

## Qué hace `npm run deploy`

El script [scripts/deploy.mjs](./scripts/deploy.mjs) ejecuta automáticamente el flujo seguro completo:

1. Verifica que estés en la rama `main` y comprueba que no existan archivos sensibles (`.env`, llaves privadas, credenciales) en los cambios pendientes.
2. Hace `git add -A` y crea el commit con el mensaje indicado (si hay cambios pendientes).
3. Ejecuta `git fetch origin main` y, si hay commits externos recientes en `origin/main` (por ejemplo, actualizaciones automáticas de `chore: actualizar kisukedreemurr`), integra esos cambios mediante `git pull --rebase origin main`.
4. Ejecuta `git push origin main`.
5. Consulta la API de GitHub para esperar y confirmar que el check **`Cloudflare Pages`** termine con estado `success` y muestra el SHA del commit junto con la URL `https://3llos.pages.dev`.

## Prohibiciones explícitas

- **Nunca** subas ni hagas commit de archivos `.env`, `.env.local`, llaves privadas (`.pem`, `.key`, `id_rsa`) ni archivos de credenciales.
- **Nunca** uses `git push --force` ni `--force-with-lease` sobre `main`.
- Si `git pull --rebase origin main` falla por conflictos reales, **aborta** inmediatamente con `git rebase --abort`, no fuerces el push e informa claramente al usuario qué archivos entraron en conflicto.

## Reporte al usuario

En tu respuesta final al usuario después de modificar el proyecto, confirma siempre:
1. El **hash corto del commit** pusheado a `origin/main`.
2. El **estado del despliegue** en `https://3llos.pages.dev` (y la Preview URL si Cloudflare Pages la reportó).
