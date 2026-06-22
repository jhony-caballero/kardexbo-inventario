/* ===================================================================
   CONFIGURACIÓN DE FIREBASE — KardexBot
   Proyecto: kardexbot-inventario
   =================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBz3mV6MavmQ_wPGaeHd5eb105B2vGF6GI",
  authDomain: "kardexbot-inventario.firebaseapp.com",
  projectId: "kardexbot-inventario",
  storageBucket: "kardexbot-inventario.firebasestorage.app",
  messagingSenderId: "237943924509",
  appId: "1:237943924509:web:7407625f56bf1a0f4763f4"
};

// Correo del administrador principal.
// CAMBIA ESTO por tu correo real antes de subir a GitHub.
const ADMIN_EMAIL = "tu-correo@gmail.com";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
