// js/ingresos.js
// Módulo de Ingresos (CU-03): registrar ingresos clasificados por origen.
// Cada ingreso guarda: id, monto, origen, fecha, nota, distribuido.
// Al registrar uno, se abre la propuesta de distribución inteligente (relación <<include>>).

function renderIngresos() {
  const tbody = document.getElementById('tablaIngresos');
  const lista = leerLista('ingresos')
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
    .slice(0, 30);

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-body-secondary py-4">Aún no registras ingresos. Anota el primero en el formulario.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(i => {
    const estado = i.distribuido
      ? '<span class="badge text-bg-success">Distribuido</span>'
      : '<span class="badge text-bg-warning">Por distribuir</span>';

    // Un ingreso ya distribuido no se puede borrar: su dinero ya se asignó a obligaciones
    const boton = i.distribuido
      ? ''
      : '<button class="btn btn-sm btn-outline-danger" data-id="' + i.id + '" aria-label="Eliminar"><i class="bi bi-trash"></i></button>';

    return '<tr>' +
      '<td>' + formatearFecha(i.fecha) + '</td>' +
      '<td>' + escaparHTML(i.origen) + '</td>' +
      '<td class="text-end">' + formatearMoneda(i.monto) + '</td>' +
      '<td>' + estado + '</td>' +
      '<td class="text-body-secondary">' + escaparHTML(i.nota || '') + '</td>' +
      '<td class="text-end">' + boton + '</td>' +
    '</tr>';
  }).join('');
}

function registrarIngreso() {
  const form = document.getElementById('formIngreso');
  const monto = Number(form.elements.monto.value);
  const origen = form.elements.origen.value;
  const fecha = form.elements.fecha.value;
  const nota = form.elements.nota.value.trim();

  let esValido = true;

  if (!marcarCampo(form.elements.monto, Number.isInteger(monto) && monto > 0 && monto <= 1000000000 ? '' : 'Ingresa un monto entero mayor a 0.')) esValido = false;
  if (!marcarCampo(form.elements.origen, origen ? '' : 'Selecciona el origen del ingreso.')) esValido = false;

  let mensajeFecha = '';
  if (!fecha) mensajeFecha = 'Ingresa la fecha.';
  else if (fecha > hoyISO()) mensajeFecha = 'La fecha no puede ser futura.';
  if (!marcarCampo(form.elements.fecha, mensajeFecha)) esValido = false;

  if (!esValido) return;

  const ingreso = { id: generarId(), monto, origen, fecha, nota, distribuido: false };
  const ingresos = leerLista('ingresos');
  ingresos.push(ingreso);
  guardarLista('ingresos', ingresos);

  form.reset();
  limpiarCampos(form);
  form.elements.fecha.value = hoyISO();

  refrescarTodo();
  mostrarAviso('Ingreso registrado. Revisa la propuesta de distribución.');

  // <<include>>: el ingreso dispara la distribución inteligente
  mostrarSeccion('distribucion');
  mostrarPropuesta(ingreso.id);
}

function iniciarIngresos() {
  const form = document.getElementById('formIngreso');
  form.elements.fecha.value = hoyISO();
  form.elements.fecha.max = hoyISO();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    registrarIngreso();
  });

  document.getElementById('tablaIngresos').addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-id]');
    if (!boton) return;
    const id = Number(boton.dataset.id);

    pedirConfirmacion('Eliminar ingreso', '¿Seguro que quieres eliminar este ingreso?', () => {
      guardarLista('ingresos', leerLista('ingresos').filter(i => i.id !== id));
      mostrarAviso('Ingreso eliminado.');
      refrescarTodo();
    });
  });
}
