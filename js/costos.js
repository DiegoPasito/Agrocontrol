// js/costos.js
// Requiere: Firebase inicializado en otra parte de la app (auth + firestore)


(() => {
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Colección por usuario:
  function costosRefForUid(uid) {
    return db.collection("users").doc(uid).collection("costos");
  }

  // Estado UI
  let filtro = "mes";
  let desde = null;
  let hasta = null;
  let uidActual = null;
  let chartInstance = null;

  // Elementos
  const tbody = document.getElementById("tbodyCostos");
  const totalGastosEl = document.getElementById("totalGastos");
  const totalIngresosEl = document.getElementById("totalIngresos");
  const rangoLabel = document.getElementById("rangoLabel");
  const modalNuevo = new bootstrap.Modal(document.getElementById("modalNuevoCosto"));
  const modalRango = new bootstrap.Modal(document.getElementById("modalRango"));

  // Form elementos
  const formCosto = document.getElementById("formCosto");
  const inputTipo = document.getElementById("inputTipo");
  const inputCategoria = document.getElementById("inputCategoria");
  const inputMonto = document.getElementById("inputMonto");
  const inputFecha = document.getElementById("inputFecha");
  const inputNota = document.getElementById("inputNota");
  const inputCostoId = document.getElementById("costoId");
  const btnGuardar = document.getElementById("btnGuardar");
  const btnEliminar = document.getElementById("btnEliminar");

  // Filtros botones
  document.getElementById("filtro-dia").addEventListener("click", () => _aplicarFiltro("día"));
  document.getElementById("filtro-semana").addEventListener("click", () => _aplicarFiltro("semana"));
  document.getElementById("filtro-mes").addEventListener("click", () => _aplicarFiltro("mes"));
  document.getElementById("filtro-ano").addEventListener("click", () => _aplicarFiltro("año"));
  document.getElementById("btn-rango").addEventListener("click", () => modalRango.show());

  document.getElementById("btnAplicarRango").addEventListener("click", () => {
    const d = document.getElementById("rangoDesde").value;
    const h = document.getElementById("rangoHasta").value;
    if (!d || !h) {
      alert("Selecciona ambas fechas");
      return;
    }
    const start = new Date(d);
    const end = new Date(h);
    // incluir final del día
    end.setHours(23,59,59,999);
    _aplicarFiltroPersonalizado(start, end);
    modalRango.hide();
  });

  // abrir modal nuevo: limpiar campos
  document.querySelector('[data-bs-target="#modalNuevoCosto"]').addEventListener("click", () => {
    _limpiarModal();
    document.getElementById("modalTitle").textContent = "Nuevo costo";
    btnEliminar.classList.add("d-none");
  });

  // Guardar / editar
  btnGuardar.addEventListener("click", async () => {
    if (!auth.currentUser) { alert("Usuario no autenticado"); return; }

    if (!formCosto.checkValidity()) {
      formCosto.reportValidity();
      return;
    }

    const docId = inputCostoId.value;
    const data = {
      userId: auth.currentUser.uid,
      monto: Number(parseFloat(inputMonto.value) || 0),
      tipo: inputTipo.value,
      categoria: inputCategoria.value || "Otros",
      nota: inputNota.value || "",
      fecha: firebase.firestore.Timestamp.fromDate(new Date(inputFecha.value)),
      createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
    };

    const ref = costosRefForUid(auth.currentUser.uid);

    try {
      if (docId) {
        // UPDATE: no sobrescribimos createdAt si existe
        const docRef = ref.doc(docId);
        const existing = await docRef.get();
        if (existing.exists) {
          const existingData = existing.data();
          data.createdAt = existingData.createdAt || data.createdAt;
        }
        await docRef.update(data);
      } else {
        // CREATE: crear documento con ID generado y guardar su id dentro del doc (opcional)
        const newDocRef = ref.doc();
        // incluir el id real en el mapa (consistencia)
        await newDocRef.set({...data, id: newDocRef.id});
      }

      modalNuevo.hide();
      _aplicarFiltro(filtro); // refrescar
    } catch (e) {
      console.error(e);
      alert("Error guardando el costo");
    }
  });

  // Eliminar
  btnEliminar.addEventListener("click", async () => {
    const id = inputCostoId.value;
    if (!id) return;
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      await costosRefForUid(auth.currentUser.uid).doc(id).delete();
      modalNuevo.hide();
      _aplicarFiltro(filtro);
    } catch (e) {
      console.error(e);
      alert("Error eliminando");
    }
  });

  // Escuchar auth y luego inicializar
  auth.onAuthStateChanged(user => {
    if (!user) {
      // Si no hay usuario, limpiar UI
      uidActual = null;
      tbody.innerHTML = "";
      _mostrarTotales(0,0);
      _actualizarChart(0,0);
      return;
    }
    uidActual = user.uid;
    _aplicarFiltro("mes");
  });

  // ---------------------------
  // Funciones de filtro / consulta
  // ---------------------------

  async function _aplicarFiltro(tipo) {
    filtro = tipo;
    const now = new Date();
    let fDesde, fHasta;

    if (tipo === "día") {
      fDesde = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0);
      fHasta = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
      rangoLabel.textContent = "Filtro: Hoy";
    } else if (tipo === "semana") {
      const startOfWeek = new Date(now);
      const diff = now.getDay() === 0 ? 6 : now.getDay() - 1; // lunes=0
      startOfWeek.setDate(now.getDate() - diff);
      startOfWeek.setHours(0,0,0,0);
      fDesde = startOfWeek;
      fHasta = new Date(startOfWeek);
      fHasta.setDate(fDesde.getDate() + 6);
      fHasta.setHours(23,59,59,999);
      rangoLabel.textContent = "Filtro: Semana";
    } else if (tipo === "mes") {
      fDesde = new Date(now.getFullYear(), now.getMonth(), 1,0,0,0,0);
      fHasta = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999); // último día del mes
      rangoLabel.textContent = "Filtro: Mes actual";
    } else if (tipo === "año") {
      fDesde = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
      fHasta = new Date(now.getFullYear(), 11, 31, 23,59,59,999);
      rangoLabel.textContent = "Filtro: Año actual";
    }

    desde = fDesde;
    hasta = fHasta;

    await _cargarDatos(fDesde, fHasta);
  }

  async function _aplicarFiltroPersonalizado(start, end) {
    filtro = "personalizado";
    desde = start;
    hasta = end;
    rangoLabel.textContent = `Filtro: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    await _cargarDatos(start, end);
  }

  // Cargar datos desde Firestore y render
  async function _cargarDatos(fDesde, fHasta) {
    if (!uidActual) return;

    // Ajustar límites de tiempo
    const startTs = firebase.firestore.Timestamp.fromDate(new Date(fDesde));
    const endTs = firebase.firestore.Timestamp.fromDate(new Date(fHasta));

    // Query por rango de fecha
    const ref = costosRefForUid(uidActual);
    try {
      const q = ref
        .where("fecha", ">=", startTs)
        .where("fecha", "<=", endTs)
        .orderBy("fecha", "desc");

      const snap = await q.get();
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Mapear y mostrar
      _renderTabla(docs);
      const totals = _calcularTotales(docs);
      _mostrarTotales(totals.gastos, totals.ingresos);
      _actualizarChart(totals.ingresos, totals.gastos);

    } catch (e) {
      console.error(e);
      alert("Error al cargar costos. Revisa índices de Firestore si es necesario.");
    }
  }

  // ---------------------------
  // Render UI
  // ---------------------------

  function _renderTabla(docs) {
    tbody.innerHTML = "";
    if (!docs.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay registros en este rango</td></tr>`;
      return;
    }

    // Orden: ya ordenado por fecha desc
    docs.forEach(d => {
      // d.fecha puede ser Timestamp
      let fecha = d.fecha;
      if (fecha && fecha.toDate) fecha = fecha.toDate();
      else fecha = new Date();

      const tr = document.createElement("tr");

      const tipoBadge = d.tipo === "gasto"
        ? `<span class="badge rounded-pill" style="background:#F8D7DA;color:#842029;">Gasto</span>`
        : `<span class="badge rounded-pill" style="background:#D1E7DD;color:#0F5132;">Ingreso</span>`;

      tr.innerHTML = `
        <td style="width:100px;">${tipoBadge}</td>
        <td>${escapeHtml(d.categoria || "Otros")}</td>
        <td>${escapeHtml(d.nota || "")}</td>
        <td>${formatDate(fecha)}</td>
        <td class="text-end" style="width:140px;">${formatMoney(d.monto || 0)}</td>
        <td class="text-center" style="width:120px;">
          <button class="btn btn-sm btn-outline-primary me-1 btn-editar" data-id="${d.id}">✏️</button>
          <button class="btn btn-sm btn-outline-danger btn-borrar" data-id="${d.id}">🗑️</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Asignar listeners botones
    document.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = btn.getAttribute("data-id");
        await _abrirEditar(id);
      });
    });

    document.querySelectorAll(".btn-borrar").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = btn.getAttribute("data-id");
        if (!confirm("¿Eliminar este registro?")) return;
        try {
          await costosRefForUid(uidActual).doc(id).delete();
          await _cargarDatos(desde, hasta);
        } catch (err) {
          console.error(err);
          alert("Error al eliminar");
        }
      });
    });
  }

  async function _abrirEditar(id) {
    const doc = await costosRefForUid(uidActual).doc(id).get();
    if (!doc.exists) { alert("Registro no encontrado"); return; }
    const d = doc.data();

    inputCostoId.value = id;
    inputTipo.value = d.tipo || "gasto";
    inputCategoria.value = d.categoria || "";
    inputMonto.value = Number(d.monto || 0);
    inputNota.value = d.nota || "";
    // fecha: Timestamp
    const fecha = d.fecha && d.fecha.toDate ? d.fecha.toDate() : new Date();
    inputFecha.value = fecha.toISOString().slice(0,10);

    document.getElementById("modalTitle").textContent = "Editar costo";
    btnEliminar.classList.remove("d-none");
    modalNuevo.show();
  }

  function _limpiarModal() {
    inputCostoId.value = "";
    inputTipo.value = "gasto";
    inputCategoria.value = "";
    inputMonto.value = "";
    inputNota.value = "";
    inputFecha.value = new Date().toISOString().slice(0,10);
    document.getElementById("modalTitle").textContent = "Nuevo costo";
    btnEliminar.classList.add("d-none");
  }

  function _calcularTotales(items) {
    let gastos = 0;
    let ingresos = 0;
    items.forEach(i => {
      const m = Number(i.monto || 0);
      if (i.tipo === "gasto") gastos += m;
      else ingresos += m;
    });
    return { gastos, ingresos };
  }

  function _mostrarTotales(gastos, ingresos) {
    totalGastosEl.textContent = formatMoney(gastos);
    totalIngresosEl.textContent = formatMoney(ingresos);
  }

  function _actualizarChart(ingresos, gastos) {
    const ctx = document.getElementById("chartIngresosGastos").getContext("2d");
    const data = {
      labels: ["Ingresos", "Gastos"],
      datasets: [{
        data: [ingresos, gastos],
        backgroundColor: ["#B2E2B1", "#F5B7B1"],
        borderWidth: 0
      }]
    };

    if (chartInstance) {
      chartInstance.data = data;
      chartInstance.update();
      return;
    }

    chartInstance = new Chart(ctx, {
      type: "doughnut",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatMoney(ctx.raw)}` } }
        }
      }
    });
  }

  // helpers
  function formatDate(d) {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString();
  }
  function formatMoney(n) {
    return `$${Number(n || 0).toFixed(2)}`;
  }
  function escapeHtml(text) {
    return String(text || "").replace(/[&<>"'`=\/]/g, function (s) {
      return ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
        "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
      })[s];
    });
  }

})();
