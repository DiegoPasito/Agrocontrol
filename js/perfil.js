import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc,
  collection, getDocs, query, orderBy, where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '-';
  // Firestore Timestamp
  if (typeof value.toDate === 'function') value = value.toDate();
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleString();
}

async function getUserDocEitherCollection(uid) {
  const paths = ["users", "usuarios"];
  for (const p of paths) {
    try {
      const ref = doc(db, p, uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return { snap, path: p, ref };
    } catch (e) {
      console.warn('Error leyendo', p, e);
    }
  }
  return null;
}

async function actualizarPerfilUI(user) {
  if (!user) return;
  const nombreEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  const profileImg = document.getElementById('profile-image');

  let displayName = user.displayName || '';
  let email = user.email || '';
  let photoURL = user.photoURL || '';

  if (!displayName && user.providerData && user.providerData.length) {
    for (const p of user.providerData) {
      if (p.displayName) { displayName = p.displayName; break; }
    }
  }

  const fallbackName = email ? email.split('@')[0] : 'Usuario';

  try {
    const found = await getUserDocEitherCollection(user.uid);
    if (found) {
      const data = found.snap.data();
      displayName = data.displayName || data.nombre || data.name || data.fullName || data.full_name || data.nombreUsuario || displayName || '';
      email = data.email || email;
      photoURL = data.photoURL || data.foto || photoURL || '';
    } else {
      // crear doc mínimo para futuras lecturas (opcional)
      try {
        await setDoc(doc(db, "users", user.uid), { nombre: displayName || fallbackName, email }, { merge: true });
      } catch (e) { console.warn('No se pudo crear doc users/{uid}:', e); }
    }
  } catch (err) {
    console.error('Error leyendo Firestore (perfil):', err);
  }

  if (nombreEl) nombreEl.textContent = displayName || fallbackName;
  if (emailEl) emailEl.textContent = email || 'email@ejemplo.com';
  if (profileImg && photoURL) profileImg.src = photoURL;
}

async function loadUserCows(uid) {
  const container = document.querySelector('#cows-tbody') || document.querySelector('#collapseVacas table tbody');
  if (!container) return;
  container.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
  try {
    console.log('[perfil.js] loadUserCows uid=', uid);
    let snap;
    // Intento subcolección users/{uid}/cows
    try {
      const q = query(collection(db, 'users', uid, 'cows'), orderBy('nombre', 'asc'));
      snap = await getDocs(q);
    } catch (e) {
      // fallback sin orderBy
      snap = await getDocs(collection(db, 'users', uid, 'cows'));
    }

    // Si vacío, probar colección top-level 'cows' filtrando ownerUid o userId
    if (!snap || snap.empty) {
      let q2 = query(collection(db, 'cows'), where('ownerUid', '==', uid));
      snap = await getDocs(q2);
      if (!snap || snap.empty) {
        q2 = query(collection(db, 'cows'), where('userId', '==', uid));
        snap = await getDocs(q2);
      }
    }

    if (!snap || snap.empty) {
      container.innerHTML = '<tr><td colspan="5">No hay vacas registradas.</td></tr>';
      return;
    }

    container.innerHTML = '';
    snap.forEach(docu => {
      const d = docu.data();
      const id = docu.id;
      const nombre = escapeHtml(d.nombre || d.name || d.nombreVaca || 'Sin nombre');
      const raza = escapeHtml(d.raza || d.breed || '-');
      const edad = escapeHtml(d.edad || d.age || '-');
      const estado = escapeHtml(d.estado || d.status || 'Desconocido');
      const estadoLower = String(estado).toLowerCase();
      const badgeClass = estadoLower.includes('enfer') ? 'bg-danger' : (estadoLower.includes('control') ? 'bg-warning text-dark' : 'bg-success');
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${id}</td><td>${nombre}</td><td>${raza}</td><td>${edad}</td><td><span class="badge ${badgeClass}">${estado}</span></td>`;
      container.appendChild(tr);
    });
  } catch (e) {
    console.error('Error cargando vacas:', e);
    if (e && e.code === 'permission-denied') {
      container.innerHTML = '<tr><td colspan="5">Permiso denegado: revisa las reglas de Firestore.</td></tr>';
    } else {
      container.innerHTML = '<tr><td colspan="5">Error cargando vacas.</td></tr>';
    }
  }
}

// Renderizar recordatorios como lista
async function loadUserReminders(uid) {
  const container = document.getElementById('reminders-list') || document.getElementById('reminders-tbody');
  if (!container) return;
  if (container.tagName === 'TBODY') container.innerHTML = '<tr><td colspan="4">Cargando recordatorios...</td></tr>';
  else container.innerHTML = '<div class="text-muted">Cargando recordatorios...</div>';

  try {
    console.log('[perfil.js] loadUserReminders uid=', uid);
    let snap;
    try {
      const q = query(collection(db, 'users', uid, 'reminders'), orderBy('createdAt', 'desc'));
      snap = await getDocs(q);
    } catch (e) {
      snap = await getDocs(collection(db, 'users', uid, 'reminders'));
    }

    if (!snap || snap.empty) {
      if (container.tagName === 'TBODY') container.innerHTML = '<tr><td colspan="4">No hay recordatorios.</td></tr>';
      else container.innerHTML = '<div class="text-muted">No hay recordatorios.</div>';
      return;
    }

    // construir lista (preferencia del usuario)
    if (container.tagName === 'TBODY') container.innerHTML = '';
    else container.innerHTML = '';

    const ul = document.createElement('ul');
    ul.className = 'list-group';
    snap.forEach(docu => {
      const d = docu.data();
      const title = escapeHtml(d.title || d.titulo || d.nombre || 'Recordatorio');
      const date = formatDate(d.date || d.fecha || d.createdAt);
      const note = escapeHtml(d.note || d.descripcion || '');

      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.innerHTML = `<div class="fw-semibold">${title}</div><div class="small text-muted">${date}</div>${note ? `<div class="mt-1">${note}</div>` : ''}`;
      ul.appendChild(li);
    });

    if (container.tagName === 'TBODY') {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.appendChild(ul);
      tr.appendChild(td);
      container.appendChild(tr);
    } else {
      container.appendChild(ul);
    }

  } catch (e) {
    console.error('Error cargando recordatorios:', e);
    if (e && e.code === 'permission-denied') {
      if (container.tagName === 'TBODY') container.innerHTML = '<tr><td colspan="4">Permiso denegado: revisa reglas Firestore.</td></tr>';
      else container.innerHTML = '<div>Permiso denegado: revisa reglas Firestore.</div>';
    } else {
      if (container.tagName === 'TBODY') container.innerHTML = '<tr><td colspan="4">Error cargando recordatorios.</td></tr>';
      else container.innerHTML = '<div>Error cargando recordatorios.</div>';
    }
  }
}

// Renderizar alertas como lista
async function loadUserAlerts(uid) {
  const container = document.getElementById('alerts-list') || document.getElementById('alerts-tbody');
  if (!container) return;
  if (container.tagName === 'TBODY') container.innerHTML = '<tr><td colspan="4">Cargando alertas...</td></tr>';
  else container.innerHTML = '<div class="text-muted">Cargando alertas...</div>';

  try {
    console.log('[perfil.js] loadUserAlerts uid=', uid);
    let snap;
    try {
      const q = query(collection(db, 'users', uid, 'alerts'), orderBy('createdAt', 'desc'));
      snap = await getDocs(q);
    } catch (e) {
      snap = await getDocs(collection(db, 'users', uid, 'alerts'));
    }

    if (!snap || snap.empty) {
      // fallback colección top-level
      const q2 = query(collection(db, 'alerts'), where('ownerUid', '==', uid));
      snap = await getDocs(q2);
    }

    if (!snap || snap.empty) {
      if (container.tagName === 'TBODY') container.innerHTML = '<tr><td colspan="4">No hay alertas.</td></tr>';
      else container.innerHTML = '<div class="text-muted">No hay alertas.</div>';
      return;
    }

    // render lista
    if (container.tagName === 'TBODY') container.innerHTML = '';
    else container.innerHTML = '';

    const ul = document.createElement('ul');
    ul.className = 'list-group';
    snap.forEach(docu => {
      const d = docu.data();
      const title = escapeHtml(d.title || d.titulo || d.motivo || 'Alerta');
      const date = formatDate(d.date || d.fecha || d.createdAt);
      const level = escapeHtml(d.level || d.severidad || 'info');
      const levelLower = level.toLowerCase();
      const badgeClass = levelLower.includes('crit') ? 'bg-danger' : (levelLower.includes('warn') ? 'bg-warning text-dark' : 'bg-info text-white');

      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-start';
      li.innerHTML = `<div><div class="fw-semibold">${title}</div><div class="small text-muted">${date}</div></div><span class="badge ${badgeClass}">${level}</span>`;
      ul.appendChild(li);
    });

    if (container.tagName === 'TBODY') {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.appendChild(ul);
      tr.appendChild(td);
      container.appendChild(tr);
    } else {
      container.appendChild(ul);
    }

  } catch (e) {
    console.error('Error cargando alertas:', e);
    if (e && e.code === 'permission-denied') {
      if (container.tagName === 'TBODY') container.innerHTML = '<tr><td colspan="4">Permiso denegado: revisa reglas Firestore.</td></tr>';
      else container.innerHTML = '<div>Permiso denegado: revisa reglas Firestore.</div>';
    } else {
      if (container.tagName === 'TBODY') container.innerHTML = '<tr><td colspan="4">Error cargando alertas.</td></tr>';
      else container.innerHTML = '<div>Error cargando alertas.</div>';
    }
  }
}

onAuthStateChanged(auth, (user) => {
  console.log('[perfil.js] onAuthStateChanged user:', user && { uid: user.uid, displayName: user && user.displayName });
  if (user) {
    actualizarPerfilUI(user);
    loadUserCows(user.uid);
    loadUserReminders(user.uid);
    loadUserAlerts(user.uid);
  }
});

// Manejo imagen de perfil y preview
document.addEventListener('DOMContentLoaded', () => {
  const profileImg = document.getElementById('profile-image');
  const fotoInput = document.getElementById('foto-input');

  try {
    const saved = localStorage.getItem('profile-image');
    if (saved && profileImg) profileImg.src = saved;
  } catch (e) { console.warn('localStorage inaccesible:', e); }

  if (fotoInput) {
    fotoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      mostrarVistaPrevia(file);
    });
  }

  const btnVer = document.getElementById('btn-ver-foto');
  const btnEliminar = document.getElementById('btn-eliminar-foto');
  if (btnVer) btnVer.addEventListener('click', verFoto);
  if (btnEliminar) btnEliminar.addEventListener('click', eliminarFoto);

  const pn = document.getElementById('profile-name');
  const pe = document.getElementById('profile-email');
  if (pn && (!pn.textContent || pn.textContent.trim() === '')) pn.textContent = 'Usuario';
  if (pe && (!pe.textContent || pe.textContent.trim() === '')) pe.textContent = 'email@ejemplo.com';
});

function mostrarVistaPrevia(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const imageData = e.target.result;
    const container = document.createElement('div');
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
    const modalNode = container.querySelector('#previewModal');
    const previewModal = new bootstrap.Modal(modalNode);
    previewModal.show();
    const confirmar = container.querySelector('#confirmar-foto');
    confirmar.onclick = () => {
      const profileImg = document.getElementById('profile-image');
      if (profileImg) profileImg.src = imageData;
      try { localStorage.setItem('profile-image', imageData); } catch (e) { console.warn('No se pudo usar localStorage:', e); }
      previewModal.hide();
    };
    modalNode.addEventListener('hidden.bs.modal', () => { setTimeout(() => { container.remove(); }, 300); });
  };
  reader.readAsDataURL(file);
}

function eliminarFoto() {
  const profileImg = document.getElementById('profile-image');
  if (profileImg) profileImg.src = 'img/avatar-placeholder.png';
  try { localStorage.removeItem('profile-image'); } catch (e) { console.warn(e); }
}

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

window.eliminarFoto = eliminarFoto;
window.verFoto = verFoto;
window.mostrarVistaPrevia = mostrarVistaPrevia;
