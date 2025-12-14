// ================================
//  IMPORTAR FIREBASE v12.5.0
// ================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js";

// ================================
//  CONFIGURACIÓN FIREBASE
// ================================
const firebaseConfig = {
  apiKey: "AIzaSyAzonIFbhlOnnIs9xG9Lb4uBJHLrhCi3qU",
  authDomain: "web-y-movil-agroncontrol.firebaseapp.com",
  projectId: "web-y-movil-agroncontrol",
  storageBucket: "web-y-movil-agroncontrol.appspot.com", // ✔ CORREGIDO
  messagingSenderId: "180502593551",
  appId: "1:180502593551:web:f4ae5111ac99ec70fa237a",
  measurementId: "G-BJ9G9WSKNY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// ================================
//  ELEMENTOS DEL DOM
// ================================
const userNameEl = document.getElementById("profile-name");
const userEmailEl = document.getElementById("profile-email");
const fechaRegistroEl = document.getElementById("miembro-desde");

const totalCowsEl = document.getElementById("vacas-registradas");
const totalRemindersEl = document.getElementById("recordatorios-activos");

// ================================
//  CARGAR DATOS DEL USUARIO
// ================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const uid = user.uid;
  const userRef = doc(db, "users", uid);

  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();

      userNameEl.textContent = data.nombre || "Sin nombre";
      userEmailEl.textContent = data.email || "-";

      if (data.fechaRegistro?.seconds) {
        const fechaJS = new Date(data.fechaRegistro.seconds * 1000);
        fechaRegistroEl.textContent = fechaJS.toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      }
    }

    const cowsCol = collection(db, "users", uid, "cows");
    const cowsCount = await getCountFromServer(cowsCol);
    totalCowsEl.textContent = cowsCount.data().count;

    const remindersCol = collection(db, "users", uid, "reminders");
    const remindersCount = await getCountFromServer(remindersCol);
    totalRemindersEl.textContent = remindersCount.data().count;

  } catch (error) {
    console.error("Error cargando perfil:", error);
  }
});

   // 🔗 CONFIGURA TU ENLACE AQUÍ
  const APK_URL = "https://drive.google.com/file/d/1AzI0q8QNbPIYP10eewEgUaiu184At9aA/view?usp=drive_link";
  
  // Actualizar botón de descarga
  document.getElementById('btn-download-apk').href = APK_URL;
  
  // Generar QR dinámicamente
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(APK_URL)}`;
  document.getElementById('qr-code-img').src = qrApiUrl;