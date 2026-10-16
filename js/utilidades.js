// js/utilidades.js
// Funciones compartidas por todas las páginas:
// sesión, datos en localStorage, fechas, dinero y validación visual con Bootstrap.

/* ===== Sesión ===== */
function obtenerUsuarioActual() {
  return JSON.parse(localStorage.getItem('usuarioActual'));
}

/* ===== Datos de cada usuario en localStorage =====
   Cada usuario guarda sus listas con su número de documento en la clave,
   así dos usuarios en el mismo navegador no se mezclan. */
function claveDatos(nombre) {
  return 'ff_' + obtenerUsuarioActual().doc_identidad + '_' + nombre;
}

function leerLista(nombre) {
  return JSON.parse(localStorage.getItem(claveDatos(nombre))) || [];
}

function guardarLista(nombre, lista) {
  localStorage.setItem(claveDatos(nombre), JSON.stringify(lista));
}

function generarId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function sumar(lista, campo) {
  return lista.reduce((total, item) => total + Number(item[campo]), 0);
}

/* ===== Fechas (siempre en formato AAAA-MM-DD) ===== */
function armarISO(anio, mes, dia) {
  return anio + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
}

function hoyISO() {
  const hoy = new Date();
  return armarISO(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
}

function fechaDesdeISO(iso) {
  const partes = iso.split('-').map(Number);
  return new Date(partes[0], partes[1] - 1, partes[2]);
}

function sumarDias(iso, dias) {
  const fecha = fechaDesdeISO(iso);
  fecha.setDate(fecha.getDate() + dias);
  return armarISO(fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate());
}

function diasEntre(desdeISO, hastaISO) {
  return Math.round((fechaDesdeISO(hastaISO) - fechaDesdeISO(desdeISO)) / 86400000);
}

function formatearFecha(iso) {
  return fechaDesdeISO(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function textoVencimiento(iso) {
  const dias = diasEntre(hoyISO(), iso);
  if (dias < 0) return 'Venció hace ' + Math.abs(dias) + (Math.abs(dias) === 1 ? ' día' : ' días');
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return 'Vence en ' + dias + ' días';
}

/* ===== Dinero ===== */
function formatearMoneda(valor) {
  return Number(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

/* ===== Texto seguro para insertar en el HTML ===== */
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function badgePrioridad(prioridad) {
  const clases = { Alta: 'text-bg-danger', Media: 'text-bg-warning', Baja: 'text-bg-secondary' };
  return '<span class="badge ' + clases[prioridad] + '">' + prioridad + '</span>';
}

/* ===== Validación visual con Bootstrap =====
   Cada input vive dentro de un contenedor con la clase "campo"
   que tiene un <div class="invalid-feedback"> para el mensaje de error.
   Devuelve true si el campo es válido (mensaje vacío) y false si no. */
function marcarCampo(input, mensaje) {
  const contenedor = input.closest('.campo');
  const feedback = contenedor ? contenedor.querySelector('.invalid-feedback') : null;

  if (mensaje) {
    input.classList.add('is-invalid');
    if (feedback) feedback.textContent = mensaje;
    return false;
  }

  input.classList.remove('is-invalid');
  if (feedback) feedback.textContent = '';
  return true;
}

function limpiarCampos(form) {
  form.querySelectorAll('.is-invalid').forEach(input => input.classList.remove('is-invalid'));
}

/* ===== Avisos (toast de Bootstrap) ===== */
function mostrarAviso(texto, tipo) {
  const toast = document.getElementById('toastAviso');
  if (!toast) return;
  document.getElementById('toastTexto').textContent = texto;
  toast.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-warning');
  toast.classList.add('text-bg-' + (tipo || 'success'));
  bootstrap.Toast.getOrCreateInstance(toast).show();
}

/* ===== Ventana de confirmación (modal de Bootstrap) ===== */
let accionConfirmada = null;

function pedirConfirmacion(titulo, texto, accion) {
  document.getElementById('confirmarTitulo').textContent = titulo;
  document.getElementById('confirmarTexto').textContent = texto;
  accionConfirmada = accion;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modalConfirmar')).show();
}

function iniciarConfirmacion() {
  document.getElementById('btnConfirmar').addEventListener('click', () => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalConfirmar')).hide();
    if (accionConfirmada) accionConfirmada();
    accionConfirmada = null;
  });
}
