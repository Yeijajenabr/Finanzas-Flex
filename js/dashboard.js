// js/dashboard.js
// Une todos los módulos del dashboard: protege la página, cambia de sección,
// dibuja el resumen y vuelve a pintar todo cuando algún dato cambia.

function mostrarSeccion(nombre) {
  document.querySelectorAll('.seccion').forEach(seccion => {
    seccion.classList.toggle('d-none', seccion.id !== 'seccion-' + nombre);
  });
  document.querySelectorAll('[data-seccion]').forEach(enlace => {
    enlace.classList.toggle('active', enlace.dataset.seccion === nombre);
  });

  // En pantallas pequeñas el menú lateral es un panel que se cierra al elegir
  const menu = bootstrap.Offcanvas.getInstance(document.getElementById('sidebar'));
  if (menu) menu.hide();

  window.scrollTo(0, 0);
}

function renderResumen() {
  const ingresos = leerLista('ingresos');
  const aportes = leerLista('aportes');
  const pendientes = calcularPendientes();

  const prefijoMes = hoyISO().slice(0, 7);
  const ingresosMes = sumar(ingresos.filter(i => i.fecha.startsWith(prefijoMes)), 'monto');

  document.getElementById('cardSaldo').textContent = formatearMoneda(sumar(ingresos, 'monto') - sumar(aportes, 'monto'));
  document.getElementById('cardIngresosMes').textContent = formatearMoneda(ingresosMes);
  document.getElementById('cardPendiente').textContent = formatearMoneda(pendientes.reduce((total, p) => total + p.restante, 0));
  document.getElementById('cardMeta').textContent = formatearMoneda(calcularMetaDiaria());

  // Aviso si hay ingresos sin distribuir
  const sinDistribuir = ingresos.filter(i => !i.distribuido).length;
  const aviso = document.getElementById('avisoPendientes');
  aviso.classList.toggle('d-none', sinDistribuir === 0);
  aviso.classList.toggle('d-flex', sinDistribuir > 0);
  document.getElementById('textoPendientes').textContent =
    'Tienes ' + sinDistribuir + (sinDistribuir === 1 ? ' ingreso' : ' ingresos') + ' por distribuir.';

  // Próximos vencimientos (las 5 obligaciones pendientes que vencen primero)
  const proximas = pendientes
    .slice()
    .sort((a, b) => a.obligacion.vencimiento.localeCompare(b.obligacion.vencimiento))
    .slice(0, 5);

  const lista = document.getElementById('listaVencimientos');
  if (proximas.length === 0) {
    lista.innerHTML = '<p class="text-body-secondary mb-0">No tienes obligaciones pendientes. Agrega una en la sección Obligaciones.</p>';
    return;
  }

  lista.innerHTML = proximas.map(p =>
    '<div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary-subtle">' +
      '<div>' +
        '<div>' + escaparHTML(p.obligacion.nombre) + ' ' + badgePrioridad(p.obligacion.prioridad) + '</div>' +
        '<small class="text-body-secondary">' + textoVencimiento(p.obligacion.vencimiento) + '</small>' +
      '</div>' +
      '<strong>' + formatearMoneda(p.restante) + '</strong>' +
    '</div>'
  ).join('');
}

function renderPerfil() {
  const u = obtenerUsuarioActual();
  const filas = [
    ['Documento', u.doc_identidad],
    ['Nombres', u.nombres],
    ['Apellidos', u.apellidos],
    ['Correo', u.correo],
    ['Teléfono', u.telefono || 'No registrado'],
    ['Dirección', u.direccion || 'No registrada'],
    ['Fecha de nacimiento', formatearFecha(u.fecha_nacimiento)],
    ['Miembro desde', formatearFecha(u.fecha_registro.slice(0, 10))],
    ['Rol', u.rol]
  ];

  document.getElementById('datosPerfil').innerHTML = filas.map(f =>
    '<dt class="col-sm-4 text-body-secondary fw-normal">' + f[0] + '</dt>' +
    '<dd class="col-sm-8">' + escaparHTML(String(f[1])) + '</dd>'
  ).join('');
}

// Vuelve a pintar todas las secciones (se llama cada vez que cambia un dato)
function refrescarTodo() {
  renderResumen();
  renderIngresos();
  renderObligaciones();
  renderDistribucion();
  renderReportes();
}

document.addEventListener('DOMContentLoaded', () => {

  // Protección: solo entra un cliente con sesión abierta
  const usuario = obtenerUsuarioActual();
  if (!usuario || usuario.rol !== 'cliente') {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('saludo').textContent = 'Hola, ' + usuario.nombres;

  document.getElementById('btnSalir').addEventListener('click', () => {
    localStorage.removeItem('usuarioActual');
    window.location.href = 'login.html';
  });

  // Menú lateral
  document.querySelectorAll('[data-seccion]').forEach(enlace => {
    enlace.addEventListener('click', (e) => {
      e.preventDefault();
      mostrarSeccion(enlace.dataset.seccion);
    });
  });

  // Botones que llevan a otra sección (atributo data-ir)
  document.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-ir]');
    if (boton) mostrarSeccion(boton.dataset.ir);
  });

  iniciarConfirmacion();
  iniciarObligaciones();
  iniciarIngresos();
  iniciarDistribucion();
  iniciarReportes();

  renderPerfil();
  refrescarTodo();
});
