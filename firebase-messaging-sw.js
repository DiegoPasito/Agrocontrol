// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAzonIFbhlOnnIs9xG9Lb4uBJHLrhCi3qU",
    authDomain: "web-y-movil-agroncontrol.firebaseapp.com",
    projectId: "web-y-movil-agroncontrol",
    storageBucket: "web-y-movil-agroncontrol.firebasestorage.app",
    messagingSenderId: "180502593551",
    appId: "1:180502593551:web:f4ae5111ac99ec70fa237a",
    measurementId: "G-BJ9G9WSKNY"
});

const messaging = firebase.messaging();

// Escucha cuando llega una notificación en segundo plano (app cerrada)
messaging.onBackgroundMessage((payload) => {
  console.log("📨 Notificación recibida en segundo plano:", payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icons/Icon-192.png", // puedes usar tu propio ícono
  });
});