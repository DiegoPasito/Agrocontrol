// ===============================
// IMPORTAR FIREBASE
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  getCountFromServer 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ===============================
// CONFIGURACIÓN FIREBASE
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyAzonIFbhlOnnIs9xG9Lb4uBJHLrhCi3qU",
  authDomain: "web-y-movil-agroncontrol.firebaseapp.com",
  projectId: "web-y-movil-agroncontrol",
  storageBucket: "web-y-movil-agroncontrol.appspot.com",
  messagingSenderId: "180502593551",
  appId: "1:180502593551:web:f4ae5111ac99ec70fa237a",
  measurementId: "G-BJ9G9WSKNY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let usuarioId = null;

// ===============================
// 🟢 CONTAR VACAS REGISTRADAS
// ===============================
async function contarVacasRegistradas(userId) {
  try {
    const cowsCol = collection(db, "users", userId, "cows");
    const cowsCount = await getCountFromServer(cowsCol);
    
    const totalVacas = cowsCount.data().count;
    
    // Actualizar el HTML
    document.getElementById("dato-vacas").textContent = totalVacas;
    
    console.log("✅ Total vacas registradas:", totalVacas);
    
    return totalVacas;
  } catch (error) {
    console.error("❌ Error contando vacas:", error);
    document.getElementById("dato-vacas").textContent = "Error";
    return 0;
  }
}

// ===============================
// 🟢 DETECTAR SESIÓN
// ===============================
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioId = user.uid;
    console.log("👤 Usuario autenticado:", usuarioId);
    
    // Cargar todas las estadísticas
    cargarEstadisticas();
    
  } else {
    console.log("⚠️ No hay usuario autenticado");
    document.getElementById("dato-vacas").textContent = "0";
    // Redirigir al login si no hay sesión
    window.location.href = "index.html";
  }
});

// ===============================
// 🟢 FUNCIÓN PRINCIPAL
// ===============================
async function cargarEstadisticas() {
  if (!usuarioId) return;
  
  console.log("📊 Cargando estadísticas...");
  
  // Cargar contador de vacas
  await contarVacasRegistradas(usuarioId);
  
  // 🔜 Aquí irán las otras funciones:
  // await calcularSaludHato(usuarioId);
  // await obtenerProximoEvento(usuarioId);
  // await cargarProduccionSemanal(usuarioId);
  // await cargarComposicionHato(usuarioId);
}