// js/registro.js
// Formulario de registro: validación en vivo por campo y guardado en localStorage.
// localStorage simula la base de datos mientras no hay conexión real.

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('formRegistro');
  const alerta = document.getElementById('alertaRegistro');

  form.elements.fecha_nacimiento.max = hoyISO();

  // Reglas por campo: patrón (regex) y mensaje de error
  const reglas = {
    doc_identidad: { patron: /^[0-9]{6,10}$/, error: 'Debe tener entre 6 y 10 dígitos.' },
    nombres:       { patron: /^[A-Za-zÀ-ÿ\s]{2,50}$/, error: 'Solo letras (2 a 50 caracteres).' },
    apellidos:     { patron: /^[A-Za-zÀ-ÿ\s]{2,50}$/, error: 'Solo letras (2 a 50 caracteres).' },
    telefono:      { patron: /^[0-9]{7,10}$/, error: 'Debe tener entre 7 y 10 dígitos.', opcional: true },
    direccion:     { patron: /^.{5,255}$/, error: 'Debe tener al menos 5 caracteres.', opcional: true },
    correo:        { patron: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, error: 'Ingresa un correo válido.' },
    contrasena:    { patron: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/, error: 'Mínimo 8 caracteres, con letras y números.' }
  };

  function validarCampo(nombre) {
    const regla = reglas[nombre];
    const input = form.elements[nombre];
    const valor = input.value.trim();

    if (valor === '') {
      return marcarCampo(input, regla.opcional ? '' : 'Este campo es obligatorio.');
    }
    return marcarCampo(input, regla.patron.test(valor) ? '' : regla.error);
  }

  function validarFecha() {
    const input = form.elements.fecha_nacimiento;
    if (!input.value) return marcarCampo(input, 'Ingresa tu fecha de nacimiento.');

    const hoy = new Date();
    const nacimiento = fechaDesdeISO(input.value);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;

    if (edad < 18) return marcarCampo(input, 'Debes ser mayor de edad para registrarte.');
    return marcarCampo(input, '');
  }

  function validarTodo() {
    let esValido = true;
    Object.keys(reglas).forEach(nombre => {
      if (!validarCampo(nombre)) esValido = false;
    });
    if (!validarFecha()) esValido = false;
    return esValido;
  }

  // Validación en vivo: cada input revisa su regla mientras se escribe
  Object.keys(reglas).forEach(nombre => {
    form.elements[nombre].addEventListener('input', () => validarCampo(nombre));
  });
  form.elements.fecha_nacimiento.addEventListener('change', validarFecha);

  // Mostrar / ocultar contraseña
  const botonVer = document.getElementById('verContrasena');
  botonVer.addEventListener('click', () => {
    const input = form.elements.contrasena;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    botonVer.querySelector('i').className = visible ? 'bi bi-eye' : 'bi bi-eye-slash';
  });

  function mostrarAlerta(texto) {
    alerta.textContent = texto;
    alerta.classList.remove('d-none');
  }

  function obtenerUsuarios() {
    return JSON.parse(localStorage.getItem('usuarios')) || [];
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alerta.classList.add('d-none');

    if (!validarTodo()) {
      mostrarAlerta('Revisa los campos marcados en rojo.');
      return;
    }

    const datos = {
      doc_identidad: form.elements.doc_identidad.value.trim(),
      nombres: form.elements.nombres.value.trim(),
      apellidos: form.elements.apellidos.value.trim(),
      telefono: form.elements.telefono.value.trim(),
      correo: form.elements.correo.value.trim().toLowerCase(),
      direccion: form.elements.direccion.value.trim(),
      fecha_nacimiento: form.elements.fecha_nacimiento.value,
      fecha_registro: new Date().toISOString(),
      contrasena: form.elements.contrasena.value,
      rol: 'cliente'
    };

    const usuarios = obtenerUsuarios();

    if (usuarios.some(u => u.doc_identidad === datos.doc_identidad)) {
      mostrarAlerta('Ese número de documento ya está registrado.');
      return;
    }
    if (usuarios.some(u => u.correo === datos.correo)) {
      mostrarAlerta('Ese correo ya está registrado.');
      return;
    }

    usuarios.push(datos);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    sessionStorage.setItem('registroExitoso', '1');
    window.location.href = 'login.html';
  });

});
