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

const profileImage = document.getElementById("profile-image");
const fileInput = document.getElementById("foto-input");

const updatePhotoBtn = document.getElementById("update-photo-btn");
const deletePhotoBtn = document.getElementById("delete-photo-btn");
const viewPhotoBtn = document.getElementById("view-photo-btn");

const previewContainer = document.getElementById("preview-container");
const previewImage = document.getElementById("preview-image");
const uploadBtn = document.getElementById("upload-btn");
const cancelPreviewBtn = document.getElementById("cancel-preview-btn");

const totalCowsEl = document.getElementById("vacas-registradas");
const totalRemindersEl = document.getElementById("recordatorios-activos");

let selectedFile = null;
let currentPhotoURL = null;

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

      if (data.photoURL) {
        profileImage.src = data.photoURL;
        currentPhotoURL = data.photoURL;
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

// ================================
//  EVENTOS DE FOTO
// ================================

// Abrir selector
updatePhotoBtn.addEventListener("click", () => fileInput.click());

// Vista previa
fileInput.addEventListener("change", (e) => {
  selectedFile = e.target.files[0];
  if (!selectedFile) return;

  previewImage.src = URL.createObjectURL(selectedFile);
  previewContainer.style.display = "block";
});

// Cancelar preview
cancelPreviewBtn.addEventListener("click", () => {
  previewContainer.style.display = "none";
  fileInput.value = "";
  selectedFile = null;
});

// SUBIR FOTO
uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  const user = auth.currentUser;
  const photoRef = ref(storage, `users/${user.uid}/profile.jpg`);

  await uploadBytes(photoRef, selectedFile);
  const downloadURL = await getDownloadURL(photoRef);

  await updateProfile(user, { photoURL: downloadURL });
  await updateDoc(doc(db, "users", user.uid), { photoURL: downloadURL });

  profileImage.src = downloadURL;
  currentPhotoURL = downloadURL;

  previewContainer.style.display = "none";
  fileInput.value = "";
  selectedFile = null;
});

// Ver foto
viewPhotoBtn.addEventListener("click", () => {
  if (!currentPhotoURL) return;
  window.open(currentPhotoURL, "_blank");
});

// Eliminar foto
deletePhotoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const photoRef = ref(storage, `users/${user.uid}/profile.jpg`);

  try {
    await deleteObject(photoRef);

    const defaultPhoto = "img/avatar-placeholder.png";

    await updateProfile(user, { photoURL: null });
    await updateDoc(doc(db, "users", user.uid), { photoURL: defaultPhoto });

    profileImage.src = defaultPhoto;
    currentPhotoURL = defaultPhoto;

    alert("Foto eliminada con éxito");

  } catch (error) {
    alert("Error eliminando la foto.");
  }
});