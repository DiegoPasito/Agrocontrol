import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB7WdEEYxvxYDe1bsrcLg1lQNa1wJbBXZ8",
  authDomain: "agrocontrol-8550b.firebaseapp.com",
  projectId: "agrocontrol-8550b",
  storageBucket: "agrocontrol-8550b.appspot.com",
  messagingSenderId: "540741735209",
  appId: "1:540741735209:web:7a44dff52d07641cc91d38",
  measurementId: "G-7FBMJ1WNPZ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Actualizar UI desde Firebase (si está autenticado)
async function actualizarPerfilUI(user) {
  if (!user) {
    console.log('No hay usuario autenticado');
    return;
  }

  try {
    const nombreElement = document.getElementById('profile-name');
    const emailElement = document.getElementById('profile-email');

    // Intentar leer doc en Firestore
    const userRef = doc(db, "usuarios", user.uid);
    const userDoc = await getDoc(userRef);

    let nombreMostrar = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
    if (userDoc.exists()) {
      const data = userDoc.data();
      nombreMostrar = data.nombreUsuario || data.nombre || nombreMostrar;
    } else {
      // opcional: crear documento si no existe (comenta si no quieres)
      try {
        await setDoc(userRef, { nombre: nombreMostrar, email: user.email }, { merge: true });
      } catch (e) {
        console.warn('No se pudo crear documento usuario:', e);
      }
    }

    if (nombreElement) nombreElement.textContent = nombreMostrar;
    if (emailElement) emailElement.textContent = user.email || '';

  } catch (error) {
    console.error('Error al cargar datos del usuario:', error);
  }
}

// Escuchar auth
onAuthStateChanged(auth, (user) => {
  if (user) actualizarPerfilUI(user);
});

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Cargar imagen guardada
  const profileImg = document.getElementById('profile-image');
  try {
    const savedImage = localStorage.getItem('profile-image');
    if (savedImage && profileImg) profileImg.src = savedImage;
  } catch (e) {
    console.warn('localStorage inaccesible:', e);
  }

  // Input file
  const fotoInput = document.getElementById('foto-input');
  if (fotoInput) {
    fotoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      mostrarVistaPrevia(file);
    });
  }

  // Si existen botones en HTML, registrar listeners (opcional, más seguro que onclick inline)
  const btnVer = document.getElementById('btn-ver-foto');
  const btnEliminar = document.getElementById('btn-eliminar-foto');
  if (btnVer) btnVer.addEventListener('click', verFoto);
  if (btnEliminar) btnEliminar.addEventListener('click', eliminarFoto);

  // Placeholder name/email si no hay datos aún
  const pn = document.getElementById('profile-name');
  const pe = document.getElementById('profile-email');
  if (pn && (!pn.textContent || pn.textContent.trim() === '')) pn.textContent = 'Usuario';
  if (pe && (!pe.textContent || pe.textContent.trim() === '')) pe.textContent = 'email@ejemplo.com';
});

// Vista previa mediante modal Bootstrap
function mostrarVistaPrevia(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const imageData = e.target.result;

    // crear modal si no existe
    const modalEl = document.createElement('div');
    modalEl.innerHTML = `
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
    document.body.appendChild(modalEl);

    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    previewModal.show();

    const confirmar = document.getElementById('confirmar-foto');
    confirmar.onclick = () => {
      const profileImg = document.getElementById('profile-image');
      if (profileImg) profileImg.src = imageData;
      try { localStorage.setItem('profile-image', imageData); } catch (e) { console.warn('No se pudo usar localStorage:', e); }
      previewModal.hide();
    };

    document.getElementById('previewModal').addEventListener('hidden.bs.modal', function () {
      setTimeout(() => { modalEl.remove(); }, 300);
    });
  };
  reader.readAsDataURL(file);
}

// Eliminar foto
function eliminarFoto() {
  const profileImg = document.getElementById('profile-image');
  if (profileImg) profileImg.src = 'img/avatar-placeholder.png';
  try { localStorage.removeItem('profile-image'); } catch (e) { console.warn(e); }
}

// Ver foto en nueva ventana
function verFoto() {
  const img = document.getElementById('profile-image');
  if (!img) { alert('Imagen no encontrada'); return; }
  const url = img.src;
  const w = window.open("", "_blank");
  if (!w) { alert('No se pudo abrir la ventana. Revisa bloqueo de pop-ups.'); return; }
  w.document.write(`
    <html><head><title>Foto de perfil</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:95%;max-height:95vh;object-fit:contain;border-radius:12px}</style>
    </head><body><img src="${url}" alt="Foto de perfil"></body></html>`);
  w.document.close();
}

// Exponer funciones globalmente (permite onclick inline si las usas)
window.eliminarFoto = eliminarFoto;
window.verFoto = verFoto;
window.mostrarVistaPrevia = mostrarVistaPrevia;
