// ================================
// 🔹 INICIALIZACIÓN DE FIREBASE 🔹
// ================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  collection
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// 🔧 Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB7WdEEYxvxYDe1bsrcLg1lQNa1wJbBXZ8",
  authDomain: "agrocontrol-8550b.firebaseapp.com",
  projectId: "agrocontrol-8550b",
  storageBucket: "agrocontrol-8550b.appspot.com",
  messagingSenderId: "540741735209",
  appId: "1:540741735209:web:7a44dff52d07641cc91d38",
  measurementId: "G-7FBMJ1WNPZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUid = null;

// ================================
// 🔹 ACTUALIZAR PERFIL EN LA UI 🔹
// ================================
async function actualizarPerfilUI(user) {
  if (!user) return;

  const nombreEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const profileImg = document.getElementById("profile-image");

  const email = user.email || "email@ejemplo.com";
  let displayName = user.displayName || email.split("@")[0];

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // 🟢 Crea el documento si no existe (esto sí tiene permiso con tus reglas)
      await setDoc(userRef, {
        email,
        nombre: displayName,
        creado: serverTimestamp(),
        ultimoAcceso: serverTimestamp()
      });
      console.log(`[perfil.js] Documento Firestore creado para ${user.uid}`);
    }

    // Vuelve a leer (ahora debe existir)
    const nuevoSnap = await getDoc(userRef);
    const data = nuevoSnap.data();
    if (data?.nombre) displayName = data.nombre;

  } catch (err) {
    console.warn("⚠️ No se pudo acceder a Firestore (verifica permisos):", err);
  }

  // Mostrar datos en la UI
  if (nombreEl) nombreEl.textContent = displayName;
  if (emailEl) emailEl.textContent = email;
  if (profileImg) {
    const savedUid = localStorage.getItem("profile-image-uid");
    const savedImg = localStorage.getItem("profile-image");
    profileImg.src =
      savedUid === user.uid && savedImg
        ? savedImg
        : "img/avatar-placeholder.png";
  }

  console.log("[perfil.js] Perfil mostrado:", { displayName, email, uid: user.uid });
}

// ================================
// 🔹 REGISTRAR ÚLTIMO ACCESO 🔹
// ================================
async function registrarUltimoAcceso(uid) {
  if (!uid) return;
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      { ultimoAcceso: serverTimestamp() },
      { merge: true }
    );
    console.log(`[perfil.js] Último acceso registrado para UID: ${uid}`);
  } catch (err) {
    console.error("❌ Error registrando último acceso:", err);
  }
}

// ================================
// 🔹 MOSTRAR ÚLTIMO ACCESO 🔹
// ================================
function mostrarUltimoAcceso(uid) {
  if (!uid) return;
  const userRef = doc(db, "users", uid);
  const ultimoEl = document.getElementById("ultimoAcceso");
  if (!ultimoEl) return;

  onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists() && snap.data().ultimoAcceso) {
        let fecha = snap.data().ultimoAcceso;
        if (typeof fecha.toDate === "function") fecha = fecha.toDate();

        const opciones = {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        };

        ultimoEl.textContent = fecha.toLocaleString("es-CO", opciones);
      } else {
        ultimoEl.textContent = "Primer inicio de sesión";
      }
    },
    (err) => {
      console.error("⚠️ Error mostrando último acceso:", err);
      ultimoEl.textContent = "Sin permiso o error al cargar";
    }
  );
}

// ================================
// 🔹 CONTAR VACAS Y RECORDATORIOS 🔹
// ================================
function escucharCambiosColecciones(uid) {
  if (!uid) return;

  const vacasSpan = document.getElementById("vacas-registradas");
  const recordatoriosSpan = document.getElementById("recordatorios-activos");

  // Escuchar cambios en la colección de vacas
  const cowsRef = collection(db, "users", uid, "cows");
  onSnapshot(cowsRef, (snapshot) => {
    const totalVacas = snapshot.size;
    if (vacasSpan) vacasSpan.textContent = totalVacas;
    console.log(`🐄 Vacas registradas: ${totalVacas}`);
  });

  // Escuchar cambios en la colección de recordatorios
  const remindersRef = collection(db, "users", uid, "reminders");
  onSnapshot(remindersRef, (snapshot) => {
    const activos = snapshot.docs.filter(doc => doc.data().activo !== false).length;
    if (recordatoriosSpan) recordatoriosSpan.textContent = activos;
    console.log(`⏰ Recordatorios activos: ${activos}`);
  });
}

// ================================
// 🔹 CONTROL DE SESIÓN 🔹
// ================================
onAuthStateChanged(auth, async (user) => {
  const nombreEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const ultimoEl = document.getElementById("ultimoAcceso");
  const profileImg = document.getElementById("profile-image");

  if (user) {
    console.log("[Auth] Usuario autenticado:", user.uid);

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    // ✅ Si el usuario no tiene documento, lo creamos
    if (!snap.exists()) {
      console.warn("⚠️ No existe documento para este usuario, creando uno nuevo...");
      await setDoc(userRef, {
        nombre: user.displayName || "Usuario nuevo",
        email: user.email || "Sin email",
        creadoEn: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
      });
      console.log("✅ Documento de usuario creado en Firestore:", user.uid);
    }

    // Ya puedes continuar con tus funciones normales
    await registrarUltimoAcceso(user.uid);
    await actualizarPerfilUI(user);
    mostrarUltimoAcceso(user.uid);
    escucharCambiosColecciones(user.uid);

  } else {
    // 🔹 Usuario no autenticado: limpiar la UI
    console.warn("[Auth] Ningún usuario autenticado");
    if (profileImg) profileImg.src = "img/avatar-placeholder.png";
    if (nombreEl) nombreEl.textContent = "Usuario";
    if (emailEl) emailEl.textContent = "email@ejemplo.com";
    if (ultimoEl) ultimoEl.textContent = "-";
  }
});

// ================================
// 🔹 FOTO DE PERFIL LOCAL 🔹
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const profileImg = document.getElementById("profile-image");
  const fotoInput = document.getElementById("foto-input");

  if (profileImg) profileImg.src = "img/avatar-placeholder.png";

  if (fotoInput) {
    fotoInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) mostrarVistaPrevia(file);
    });
  }

  const btnVer = document.getElementById("btn-ver-foto");
  const btnEliminar = document.getElementById("btn-eliminar-foto");
  if (btnVer) btnVer.addEventListener("click", verFoto);
  if (btnEliminar) btnEliminar.addEventListener("click", eliminarFoto);
});

// ================================
// 🔹 FUNCIONES DE FOTO 🔹
// ================================
function mostrarVistaPrevia(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const imageData = e.target.result;
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="modal fade" id="previewModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Vista previa de la foto</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body text-center">
              <img id="preview-image" src="${imageData}" alt="Vista previa" style="max-width:100%; max-height:320px; border-radius:50%;">
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="confirmar-foto">Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    const modalNode = container.querySelector("#previewModal");
    const previewModal = new bootstrap.Modal(modalNode);
    previewModal.show();
    container.querySelector("#confirmar-foto").onclick = () => {
      const profileImg = document.getElementById("profile-image");
      if (profileImg) profileImg.src = imageData;
      localStorage.setItem("profile-image", imageData);
      localStorage.setItem("profile-image-uid", currentUid);
      previewModal.hide();
    };
    modalNode.addEventListener("hidden.bs.modal", () => {
      setTimeout(() => container.remove(), 300);
    });
  };
  reader.readAsDataURL(file);
}

function eliminarFoto() {
  const profileImg = document.getElementById("profile-image");
  if (profileImg) profileImg.src = "img/avatar-placeholder.png";
  localStorage.removeItem("profile-image");
  localStorage.removeItem("profile-image-uid");
}

function verFoto() {
  const img = document.getElementById("profile-image");
  if (!img) return alert("Imagen no encontrada");
  const url = img.src;
  const w = window.open("", "_blank");
  if (!w) return alert("No se pudo abrir la ventana. Revisa bloqueo de pop-ups.");
  w.document.write(`
    <html><head><title>Foto de perfil</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:95%;max-height:95vh;object-fit:contain;border-radius:12px}</style>
    </head><body><img src="${url}" alt="Foto de perfil"></body></html>`);
  w.document.close();
}

window.eliminarFoto = eliminarFoto;
window.verFoto = verFoto;
window.mostrarVistaPrevia = mostrarVistaPrevia;
window.auth = auth;