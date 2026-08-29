// Configuración de Firebase
// ⚠️ REEMPLAZA ESTAS CREDENCIALES CON LAS TUYAS DE FIREBASE ⚠️
// Sigue las instrucciones en FIREBASE_SETUP.md
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForNetlify",
  authDomain: "papubanda-dibujo.firebaseapp.com",
  databaseURL: "https://papubanda-dibujo-default-rtdb.firebaseio.com",
  projectId: "papubanda-dibujo",
  storageBucket: "papubanda-dibujo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase con manejo de errores
let database, drawingRef;
try {
  firebase.initializeApp(firebaseConfig);
  database = firebase.database();
  drawingRef = database.ref('drawing');
  console.log('Firebase inicializado correctamente');
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
}
