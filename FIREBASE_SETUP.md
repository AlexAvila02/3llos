# Configuración Firebase para Sincronización en Tiempo Real

Este proyecto incluye sincronización de dibujo en tiempo real usando Firebase Realtime Database.

## Configuración para Netlify

### 1. Crear proyecto en Firebase

1. Ve a https://console.firebase.google.com/
2. Crea un nuevo proyecto
3. Ve a "Realtime Database" y crea una base de datos
4. En "Reglas", establece:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
5. Ve a "Configuración del proyecto" > "General"
6. Copia la configuración del SDK (apiKey, authDomain, databaseURL, etc.)

### 2. Actualizar credenciales

Abre `index.html` y reemplaza las credenciales de Firebase en la sección:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 3. Deploy en Netlify

Sube todos los archivos a Netlify como de costumbre. La sincronización funcionará automáticamente.

## Funcionalidad

- Cuando alguien dibuja, se guarda automáticamente en Firebase
- Todos los usuarios ven los cambios en tiempo real
- El canvas se sincroniza entre todos los usuarios conectados

## Notas

- Las credenciales actuales son de ejemplo y no funcionarán
- Debes usar tus propias credenciales de Firebase
- El plan gratuito de Firebase permite hasta 100 conexiones simultáneas
