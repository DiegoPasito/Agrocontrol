document.addEventListener("DOMContentLoaded", function () {
  // Fecha
  const hoy = new Date();
  const fechaFormateada = hoy.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const fechaElemento = document.getElementById("fecha-hoy");
  if (fechaElemento) {
    fechaElemento.textContent = `📅 Hoy es ${fechaFormateada}`;
  }

  // Saludo segun la hora
  const hora = hoy.getHours();
  let saludo = "👋 ¡Bienvenido!";
  if (hora >= 5 && hora < 12) {
    saludo = "🌅 ¡Buenos días!";
  } else if (hora >= 12 && hora < 18) {
    saludo = "🌞 ¡Buenas tardes!";
  } else {
    saludo = "🌙 ¡Buenas noches!";
  }
  const saludoElemento = document.getElementById("saludo-dinamico");
  if (saludoElemento) {
    saludoElemento.textContent = saludo;
  }
});