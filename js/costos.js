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
    const modalConfirmarEliminar = new bootstrap.Modal(document.getElementById("modalConfirmarEliminar"));

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
    const btnConfirmarEliminar = document.getElementById("confirmarEliminar"); // Nuevo

    // ---------------------------
    // FUNCIONES NUEVAS (AGREGADAS)
    // ---------------------------

    // Marca botón activo visualmente
    function _marcarFiltroActivo(idBoton) {
        document
            .querySelectorAll("#filtro-dia, #filtro-semana, #filtro-mes, #filtro-ano")
            .forEach(btn => btn.classList.remove("active"));

        const btn = document.getElementById(idBoton);
        if (btn) btn.classList.add("active");
    }

    // ---------------------------
    // EVENTOS DE LOS BOTONES
    // ---------------------------

    document.getElementById("filtro-dia").addEventListener("click", () => {
        _marcarFiltroActivo("filtro-dia");
        _aplicarFiltro("día");
    });

    document.getElementById("filtro-semana").addEventListener("click", () => {
        _marcarFiltroActivo("filtro-semana");
        _aplicarFiltro("semana");
    });

    document.getElementById("filtro-mes").addEventListener("click", () => {
        _marcarFiltroActivo("filtro-mes");
        _aplicarFiltro("mes");
    });

    document.getElementById("filtro-ano").addEventListener("click", () => {
        _marcarFiltroActivo("filtro-ano");
        _aplicarFiltro("año");
    });

    document.getElementById("btn-rango").addEventListener("click", () => {
        modalRango.show();
    });

    document.getElementById("btnAplicarRango").addEventListener("click", () => {
        const d = document.getElementById("rangoDesde").value;
        const h = document.getElementById("rangoHasta").value;

        if (!d || !h) {
            alert("Selecciona ambas fechas");
            return;
        }

        const start = new Date(d);
        const end = new Date(h);
        // Asegura que el rango hasta incluya todo el día
        end.setHours(23, 59, 59, 999);

        _marcarFiltroActivo(""); // limpiar botones
        _aplicarFiltroPersonalizado(start, end);

        modalRango.hide();
    });

    // Abrir modal nuevo
    document.querySelector('[data-bs-target="#modalNuevoCosto"]').addEventListener("click", () => {
        _limpiarModal();
        document.getElementById("modalTitle").textContent = "Nuevo costo";
        btnEliminar.classList.add("d-none");
    });

    // ---------------------------
    // GUARDAR / EDITAR
    // ---------------------------

    btnGuardar.addEventListener("click", async () => {
        if (!auth.currentUser) {
            alert("Usuario no autenticado");
            return;
        }

        // Validación de formulario
        if (!formCosto.checkValidity()) {
            formCosto.reportValidity();
            return;
        }
        
        // Obtener la fecha del input
        const fechaInput = inputFecha.value;
        // Crear un objeto Date para la fecha seleccionada
        const selectedDate = new Date(fechaInput + "T00:00:00"); // Asegura que sea el inicio del día local

        const docId = inputCostoId.value;
        const data = {
            userId: auth.currentUser.uid,
            // Asegura que el monto sea un número válido y lo convierte a tipo number
            monto: Number(parseFloat(inputMonto.value) || 0), 
            tipo: inputTipo.value,
            categoria: inputCategoria.value || "Otros",
            nota: inputNota.value || "",
            // Usa la fecha seleccionada del input
            fecha: firebase.firestore.Timestamp.fromDate(selectedDate), 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // Agregar timestamp de actualización
        };

        const ref = costosRefForUid(auth.currentUser.uid);

        try {
            if (docId) {
                // Editar existente
                const docRef = ref.doc(docId);
                const existing = await docRef.get();
                if (existing.exists) {
                    const existingData = existing.data();
                    // Preservar createdAt
                    data.createdAt = existingData.createdAt || data.updatedAt; 
                }
                await docRef.update(data);
                
            } else {
                // Nuevo registro
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const newDocRef = await ref.add(data); // Usar .add() para que Firestore genere el ID
            }

            modalNuevo.hide();
            // Recargar datos con el filtro actual
            filtro === "personalizado" 
                ? _aplicarFiltroPersonalizado(desde, hasta) 
                : _aplicarFiltro(filtro);

        } catch (e) {
            console.error(e);
            alert("Error guardando el costo");
        }
    });

    // ---------------------------
    // ELIMINAR (Modal de Edición)
    // ---------------------------

    // Muestra el modal de confirmación
    btnEliminar.addEventListener("click", () => {
        if (!inputCostoId.value) return;
        modalNuevo.hide();
        modalConfirmarEliminar.show();
    });
    
    // Función central de eliminación
    btnConfirmarEliminar.addEventListener("click", async () => {
        const id = inputCostoId.value;
        if (!id || !auth.currentUser) {
            modalConfirmarEliminar.hide();
            return;
        }

        try {
            await costosRefForUid(auth.currentUser.uid).doc(id).delete();
            modalConfirmarEliminar.hide();
            // Recargar datos con el filtro actual
            filtro === "personalizado" 
                ? _aplicarFiltroPersonalizado(desde, hasta) 
                : _aplicarFiltro(filtro);
        } catch (e) {
            console.error(e);
            alert("Error eliminando");
        }
    });


    // ---------------------------
    // AUTH
    // ---------------------------

    auth.onAuthStateChanged(user => {
        if (!user) {
            uidActual = null;
            tbody.innerHTML = "";
            _mostrarTotales(0, 0);
            _actualizarChart(0, 0);
            return;
        }
        uidActual = user.uid;

        // marcar filtro inicial (mes)
        _marcarFiltroActivo("filtro-mes");
        _aplicarFiltro("mes");
    });

    // ---------------------------
    // FUNCIONES DE FILTRO
    // ---------------------------
    
    // CORRECCIÓN: La lógica para obtener el rango de fechas en el filtro "día" y otros fue ajustada.
    async function _aplicarFiltro(tipo) {
        filtro = tipo;
        const now = new Date();
        let fDesde, fHasta;

        if (tipo === "día") {
            // Se asegura de que fDesde sea el inicio del día actual (00:00:00)
            fDesde = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            // Se asegura de que fHasta sea el final del día actual (23:59:59.999)
            fHasta = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); 
            rangoLabel.textContent = "Filtro: Hoy";

        } else if (tipo === "semana") {
            const startOfWeek = new Date(now);
            // El lunes es el día 1, el domingo es el día 0. Ajuste para empezar en Lunes.
            const diff = now.getDay() === 0 ? 6 : now.getDay() - 1; 
            startOfWeek.setDate(now.getDate() - diff);
            startOfWeek.setHours(0, 0, 0, 0);

            fDesde = startOfWeek;
            fHasta = new Date(fDesde);
            fHasta.setDate(fDesde.getDate() + 6); // Lunes + 6 días = Domingo
            fHasta.setHours(23, 59, 59, 999);

            rangoLabel.textContent = "Filtro: Semana";

        } else if (tipo === "mes") {
            // Primer día del mes (00:00:00)
            fDesde = new Date(now.getFullYear(), now.getMonth(), 1); 
            // Último día del mes (23:59:59.999)
            fHasta = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); 
            rangoLabel.textContent = "Filtro: Mes actual";

        } else if (tipo === "año") {
            // Primer día del año (00:00:00)
            fDesde = new Date(now.getFullYear(), 0, 1);
            // Último día del año (23:59:59.999)
            fHasta = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            rangoLabel.textContent = "Filtro: Año actual";
        }

        // Se ajustan las fechas globales para que _cargarDatos pueda usarlas al recargar
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

    // ---------------------------
    // OBTENER Y RENDERIZAR DATOS
    // ---------------------------

    async function _cargarDatos(fDesde, fHasta) {
        if (!uidActual) return;

        // Asegúrate de que las fechas sean objetos Date antes de convertirlas
        const fDesdeDate = new Date(fDesde);
        const fHastaDate = new Date(fHasta);
        
        const startTs = firebase.firestore.Timestamp.fromDate(fDesdeDate);
        const endTs = firebase.firestore.Timestamp.fromDate(fHastaDate);

        const ref = costosRefForUid(uidActual);

        try {
            // Consulta a Firestore
            const q = ref
            .where("fecha", ">=", startTs)
            .where("fecha", "<=", endTs) // Usar <= para incluir el final del día de la fecha de fin
            .orderBy("fecha", "desc"); // Ordenar en descendente (más recientes primero)

            const snap = await q.get();

            const docs = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                // Filtrar por si acaso (aunque la consulta debería manejarlo)
                .filter(d => d.fecha && d.fecha.toDate); 

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
    // RENDER
    // ---------------------------

    function _renderTabla(docs) {
        tbody.innerHTML = "";

        if (!docs.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        No hay registros en este rango
                    </td>
                </tr>`;
            return;
        }

        docs.forEach(d => {
            // CORRECCIÓN: Asegurar el correcto manejo de la fecha
            let fecha = d.fecha?.toDate ? d.fecha.toDate() : new Date();

            const tr = document.createElement("tr");

            const tipoBadge =
                d.tipo === "gasto"
                    ? `<span class="badge rounded-pill" style="background:#F8D7DA;color:#842029;">Gasto</span>`
                    : `<span class="badge rounded-pill" style="background:#D1E7DD;color:#0F5132;">Ingreso</span>`;

            // Se agregó un atributo data-costo para simplificar la obtención del ID al hacer clic
            tr.innerHTML = `
                <td style="width:100px;">${tipoBadge}</td>
                <td>${escapeHtml(d.categoria || "Otros")}</td>
                <td>${escapeHtml(d.nota || "")}</td>
                <td>${formatDate(fecha)}</td>
                <td class="text-end" style="width:140px;">${formatMoney(d.monto)}</td>
                <td class="text-center" style="width:120px;">
                    <button class="btn btn-sm btn-outline-primary me-1 btn-editar" data-id="${d.id}">✏️</button>
                    <button class="btn btn-sm btn-outline-danger btn-borrar" data-id="${d.id}">🗑️</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Event listener para EDITAR
        document.querySelectorAll(".btn-editar").forEach(btn => {
            btn.addEventListener("click", () => _abrirEditar(btn.dataset.id));
        });

        // Event listener para ELIMINAR (usando el modal de confirmación)
        document.querySelectorAll(".btn-borrar").forEach(btn => {
            btn.addEventListener("click", () => _abrirConfirmarEliminar(btn.dataset.id));
        });
    }
    
    // Función para abrir la confirmación de eliminación desde la tabla
    function _abrirConfirmarEliminar(id) {
        inputCostoId.value = id; // Guarda el ID del costo a eliminar
        modalConfirmarEliminar.show();
    }

    async function _abrirEditar(id) {
        if (!uidActual) return;
        const doc = await costosRefForUid(uidActual).doc(id).get();
        if (!doc.exists) {
            alert("Registro no encontrado");
            return;
        }

        const d = doc.data();
        
        // Limpiar para asegurar que el formulario está en blanco
        _limpiarModal(); 
        
        // Cargar datos
        inputCostoId.value = id;
        inputTipo.value = d.tipo;
        inputCategoria.value = d.categoria;
        inputMonto.value = d.monto;
        inputNota.value = d.nota;

        const fecha = d.fecha?.toDate() || new Date();
        // Formato AAAA-MM-DD para input type="date"
        inputFecha.value = fecha.toISOString().slice(0, 10); 

        document.getElementById("modalTitle").textContent = "Editar costo";
        btnEliminar.classList.remove("d-none"); // Mostrar botón de eliminar

        modalNuevo.show();
    }

    function _limpiarModal() {
        // Reiniciar el formulario
        formCosto.reset(); 
        
        // Reiniciar campos especiales/ocultos
        inputCostoId.value = "";
        inputTipo.value = "gasto"; // Valor predeterminado
        // Establecer la fecha actual por defecto en el formato AAAA-MM-DD
        inputFecha.value = new Date().toISOString().slice(0, 10); 
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
            datasets: [
                {
                    data: [ingresos, gastos],
                    backgroundColor: ["#a0e29fff", "#f7a69fff"],
                    borderWidth: 0,
                },
            ],
        };

       if (chartInstance) {
            chartInstance.data = data;
            // Si cambias el tipo de gráfico, debes destruir la instancia anterior
            if (chartInstance.config.type !== 'bar') {
                chartInstance.destroy();
                chartInstance = null; // Reiniciar chartInstance para que se cree como 'bar'
            } else {
                 chartInstance.update();
                 return;
            }
        }
        
        // 🚀 NUEVO TIPO DE GRÁFICO: 'bar'
        chartInstance = new Chart(ctx, {
            type: "bar", // 👈 Cambiado a Bar Chart
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }, // Ocultar leyenda (el nombre ya está en la etiqueta)
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.label}: ${formatMoney(ctx.raw)}`,
                        },
                    },
                },
                scales: { // Agregar configuración de ejes para gráfico de barras
                    y: {
                        beginAtZero: true
                    }
                }
            },
        });
    }
    // ---------------------------
    // HELPERS
    // ---------------------------

    function formatDate(d) {
        const date = new Date(d);
        // Usa el formato local sin horas ni minutos
        return date.toLocaleDateString(); 
    }

    function formatMoney(n) {
        return `$${Number(n || 0).toFixed(2)}`;
    }

    function escapeHtml(text) {
        return String(text || "").replace(/[&<>"'`=\/]/g, s => {
            return (
                {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                    "/": "&#x2F;",
                    "`": "&#x60;",
                    "=": "&#x3D;",
                }[s] || s
            );
        });
    }
})();
