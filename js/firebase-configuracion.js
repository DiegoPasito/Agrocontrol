  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
  import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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