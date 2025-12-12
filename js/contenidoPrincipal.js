// ===============================
// IMPORTAR FIREBASE
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  getCountFromServer,
  getDocs,
  query,
  orderBy,
  limit
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
    document.getElementById("dato-vacas").textContent = totalVacas;
    
    console.log("✅ Total vacas registradas:", totalVacas);
    return totalVacas;
  } catch (error) {
    console.error("❌ Error contando vacas:", error);
    document.getElementById("dato-vacas").textContent = "0";
    return 0;
  }
}

// ===============================
// 🟢 OBTENER PRÓXIMO RECORDATORIO
// ===============================
async function obtenerProximoRecordatorio(userId) {
  try {
    const remindersCol = collection(db, "users", userId, "reminders");
    const q = query(remindersCol, orderBy("dateTime", "asc"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      document.getElementById("proximo-recordatorio-titulo").textContent = "Sin recordatorios";
      document.getElementById("proximo-recordatorio-fecha").textContent = "No hay eventos programados";
      return;
    }
    
    // Filtrar solo recordatorios NO vencidos
    const ahora = new Date();
    let proximoRecordatorio = null;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const fecha = data.dateTime?.toDate();
      
      // Solo considerar recordatorios futuros
      if (fecha && fecha >= ahora && !proximoRecordatorio) {
        proximoRecordatorio = data;
      }
    });
    
    // Si no hay recordatorios futuros
    if (!proximoRecordatorio) {
      document.getElementById("proximo-recordatorio-titulo").textContent = "Sin recordatorios próximos";
      document.getElementById("proximo-recordatorio-fecha").textContent = "Todos los recordatorios están vencidos";
      return;
    }
    
    // Mostrar el próximo recordatorio
    const fecha = proximoRecordatorio.dateTime?.toDate();
    
    document.getElementById("proximo-recordatorio-titulo").textContent = proximoRecordatorio.title || "Evento";
    
    if (fecha) {
      const opciones = { 
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      };
      document.getElementById("proximo-recordatorio-fecha").textContent = 
        fecha.toLocaleDateString('es-ES', opciones);
    } else {
      document.getElementById("proximo-recordatorio-fecha").textContent = "Fecha no disponible";
    }
    
    console.log("✅ Próximo recordatorio cargado");
  } catch (error) {
    console.error("❌ Error obteniendo recordatorio:", error);
    document.getElementById("proximo-recordatorio-titulo").textContent = "Error al cargar";
    document.getElementById("proximo-recordatorio-fecha").textContent = "Intenta recargar la página";
  }
}

// ===============================
// 🟢 DETECTAR SESIÓN
// ===============================
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioId = user.uid;
    console.log("👤 Usuario autenticado:", usuarioId);
    cargarEstadisticas();
  } else {
    console.log("⚠️ No hay usuario autenticado");
    window.location.href = "index.html";
  }
});

// ===============================
// 🟢 FUNCIÓN PRINCIPAL
// ===============================
async function cargarEstadisticas() {
  if (!usuarioId) return;
  
  console.log("📊 Cargando estadísticas...");
  
  await contarVacasRegistradas(usuarioId);
  await obtenerProximoRecordatorio(usuarioId);
}