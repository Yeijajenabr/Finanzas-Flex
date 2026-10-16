// js/login.js
// Inicio de sesión: valida el formato y compara contra los usuarios guardados.

document.addEventListener('DOMContentLoaded', () => {

  // Si ya hay una sesión abierta, va directo al dashboard
  if (obtenerUsuarioActual()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('formLogin');
  const alerta = document.getElementById('alertaLogin');
  const alertaExito = document.getElementById('alertaExito');

  // Mensaje que deja la página de registro al terminar
  if (sessionStorage.getItem('registroExitoso')) {
    alertaExito.classList.remove('d-none');
    sessionStorage.removeItem('registroExitoso');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alerta.classList.add('d-none');
    alertaExito.classList.add('d-none');

    const correo = form.elements.correo.value.trim().toLowerCase();
    const contrasena = form.elements.contrasena.value;

    let esValido = true;
    if (!marcarCampo(form.elements.correo, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? '' : 'Ingresa un correo válido.')) esValido = false;
    if (!marcarCampo(form.elements.contrasena, contrasena ? '' : 'Ingresa tu contraseña.')) esValido = false;
    if (!esValido) return;

    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const usuario = usuarios.find(u => u.correo === correo && u.contrasena === contrasena);

    if (!usuario) {
      alerta.textContent = 'Correo o contraseña incorrectos.';
      alerta.classList.remove('d-none');
      return;
    }

    localStorage.setItem('usuarioActual', JSON.stringify(usuario));
    window.location.href = 'dashboard.html';
  });

});
