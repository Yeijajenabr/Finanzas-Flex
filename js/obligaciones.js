// js/obligaciones.js
// Módulo de Obligaciones (CU-02): registrar, editar, consultar y eliminar.
// Cada obligación guarda: id, nombre, monto, aportado, vencimiento, prioridad.
// "aportado" es lo que la distribución inteligente ya le asignó.

let obligacionEnEdicion = null;

function renderObligaciones() {
  const tbody = document.getElementById('tablaObligaciones');
  const hoy = hoyISO();
  const lista = leerLista('obligaciones').sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-body-secondary py-4">Aún no tienes obligaciones. Agrega la primera con el botón "Nueva obligación".</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(o => {
    const cubierta = o.aportado >= o.monto;
    const porcentaje = Math.min(100, Math.round((o.aportado / o.monto) * 100));

    let estado = '<span class="badge text-bg-secondary">Pendiente</span>';
    if (cubierta) estado = '<span class="badge text-bg-success">Cubierta</span>';
    else if (o.vencimiento < hoy) estado = '<span class="badge text-bg-danger">Vencida</span>';

    return '<tr>' +
      '<td>' + escaparHTML(o.nombre) + '</td>' +
      '<td class="text-end">' + formatearMoneda(o.monto) + '</td>' +
      '<td class="col-progreso">' +
        '<div class="progress progress-delgado" role="progressbar" aria-valuenow="' + porcentaje + '" aria-valuemin="0" aria-valuemax="100">' +
          '<div class="progress-bar" data-ancho="' + porcentaje + '"></div>' +
        '</div>' +
        '<small class="text-body-secondary">' + formatearMoneda(o.aportado) + ' (' + porcentaje + '%)</small>' +
      '</td>' +
      '<td>' + formatearFecha(o.vencimiento) + '<br><small class="text-body-secondary">' + textoVencimiento(o.vencimiento) + '</small></td>' +
      '<td>' + badgePrioridad(o.prioridad) + '</td>' +
      '<td>' + estado + '</td>' +
      '<td class="text-end text-nowrap">' +
        '<button class="btn btn-sm btn-outline-secondary me-1" data-accion="editar" data-id="' + o.id + '" aria-label="Editar"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger" data-accion="eliminar" data-id="' + o.id + '" aria-label="Eliminar"><i class="bi bi-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');

  // El ancho de cada barra de progreso lo pone JavaScript
  tbody.querySelectorAll('.progress-bar[data-ancho]').forEach(barra => {
    barra.style.width = barra.dataset.ancho + '%';
  });
}

function abrirModalObligacion(id) {
  const form = document.getElementById('formObligacion');
  form.reset();
  limpiarCampos(form);

  obligacionEnEdicion = id ? leerLista('obligaciones').find(o => o.id === id) : null;
  document.getElementById('tituloModalObligacion').textContent = obligacionEnEdicion ? 'Editar obligación' : 'Nueva obligación';

  if (obligacionEnEdicion) {
    form.elements.nombre.value = obligacionEnEdicion.nombre;
    form.elements.monto.value = obligacionEnEdicion.monto;
    form.elements.vencimiento.value = obligacionEnEdicion.vencimiento;
    form.elements.prioridad.value = obligacionEnEdicion.prioridad;
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById('modalObligacion')).show();
}

function guardarObligacion() {
  const form = document.getElementById('formObligacion');
  const nombre = form.elements.nombre.value.trim();
  const monto = Number(form.elements.monto.value);
  const vencimiento = form.elements.vencimiento.value;
  const prioridad = form.elements.prioridad.value;

  let esValido = true;

  if (!marcarCampo(form.elements.nombre, nombre.length >= 3 && nombre.length <= 60 ? '' : 'Escribe un nombre de 3 a 60 caracteres.')) esValido = false;

  if (!marcarCampo(form.elements.monto, Number.isInteger(monto) && monto > 0 && monto <= 1000000000 ? '' : 'Ingresa un monto entero mayor a 0.')) esValido = false;

  // La fecha no puede estar en el pasado, salvo que sea una edición que no la cambió
  let mensajeFecha = '';
  if (!vencimiento) {
    mensajeFecha = 'Ingresa la fecha de vencimiento.';
  } else {
    const cambioFecha = !obligacionEnEdicion || obligacionEnEdicion.vencimiento !== vencimiento;
    if (cambioFecha && vencimiento < hoyISO()) mensajeFecha = 'La fecha no puede ser anterior a hoy.';
  }
  if (!marcarCampo(form.elements.vencimiento, mensajeFecha)) esValido = false;

  if (!marcarCampo(form.elements.prioridad, ['Alta', 'Media', 'Baja'].includes(prioridad) ? '' : 'Selecciona una prioridad.')) esValido = false;

  if (!esValido) return;

  const obligaciones = leerLista('obligaciones');

  if (obligacionEnEdicion) {
    const existente = obligaciones.find(o => o.id === obligacionEnEdicion.id);
    existente.nombre = nombre;
    existente.monto = monto;
    existente.vencimiento = vencimiento;
    existente.prioridad = prioridad;
  } else {
    obligaciones.push({ id: generarId(), nombre, monto, aportado: 0, vencimiento, prioridad });
  }

  guardarLista('obligaciones', obligaciones);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modalObligacion')).hide();
  mostrarAviso(obligacionEnEdicion ? 'Obligación actualizada.' : 'Obligación registrada.');
  obligacionEnEdicion = null;

  // Al crear, editar o eliminar se recalcula la distribución inteligente
  refrescarTodo();
}

function pedirEliminarObligacion(id) {
  const obligacion = leerLista('obligaciones').find(o => o.id === id);
  if (!obligacion) return;

  const aportes = leerLista('aportes').filter(a => a.obligacionId === id);
  let texto = '¿Eliminar "' + obligacion.nombre + '"?';
  if (aportes.length > 0) {
    texto += ' También se eliminarán sus aportes (' + formatearMoneda(sumar(aportes, 'monto')) + ') y ese dinero volverá a tu saldo disponible.';
  }

  pedirConfirmacion('Eliminar obligación', texto, () => {
    guardarLista('obligaciones', leerLista('obligaciones').filter(o => o.id !== id));
    guardarLista('aportes', leerLista('aportes').filter(a => a.obligacionId !== id));
    mostrarAviso('Obligación eliminada.');
    refrescarTodo();
  });
}

function iniciarObligaciones() {
  document.getElementById('btnNuevaObligacion').addEventListener('click', () => abrirModalObligacion());

  document.getElementById('formObligacion').addEventListener('submit', (e) => {
    e.preventDefault();
    guardarObligacion();
  });

  document.getElementById('tablaObligaciones').addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-accion]');
    if (!boton) return;
    const id = Number(boton.dataset.id);
    if (boton.dataset.accion === 'editar') abrirModalObligacion(id);
    if (boton.dataset.accion === 'eliminar') pedirEliminarObligacion(id);
  });
}
