// js/distribucion.js
// Módulo de Distribución Inteligente (CU-04): el "motor" del sistema.
//
// Cómo funciona:
// 1. Toma las obligaciones que aún no están cubiertas.
// 2. Para cada una calcula cuántos días quedan hasta su vencimiento (hoy cuenta como un día).
// 3. Su cuota diaria es lo que falta pagar dividido entre esos días.
// 4. La meta diaria mínima es la suma de todas las cuotas diarias.
// 5. Al distribuir un ingreso, se reparte primero a las obligaciones de prioridad más alta
//    y más urgentes, hasta cubrir la cuota de hoy de cada una. Lo que sobra queda libre.
//
// Si un día no se alcanza la meta, lo que falta se reparte entre los días restantes
// automáticamente, porque la cuota siempre se calcula con lo que falta y los días que quedan.

const PESO_PRIORIDAD = { Alta: 3, Media: 2, Baja: 1 };

// Id del ingreso cuya propuesta se está mostrando (null si no hay ninguna)
let ingresoEnPropuesta = null;

function calcularPendientes() {
  const hoy = hoyISO();
  const aportesHoy = leerLista('aportes').filter(a => a.fecha === hoy);

  return leerLista('obligaciones')
    .filter(o => o.aportado < o.monto)
    .map(o => {
      const restante = o.monto - o.aportado;
      const diasParaVencer = diasEntre(hoy, o.vencimiento);
      const dias = Math.max(1, diasParaVencer + 1);

      // Lo que ya se aportó hoy a esta obligación cuenta para la cuota de hoy
      const aportadoHoy = sumar(aportesHoy.filter(a => a.obligacionId === o.id), 'monto');
      const cuotaDiaria = Math.ceil((restante + aportadoHoy) / dias);
      const cuotaHoy = Math.min(restante, Math.max(0, cuotaDiaria - aportadoHoy));

      return { obligacion: o, restante, dias, vencida: diasParaVencer < 0, cuotaDiaria, aportadoHoy, cuotaHoy };
    })
    .sort((a, b) =>
      PESO_PRIORIDAD[b.obligacion.prioridad] - PESO_PRIORIDAD[a.obligacion.prioridad] || a.dias - b.dias
    );
}

function calcularMetaDiaria() {
  return calcularPendientes().reduce((total, p) => total + p.cuotaDiaria, 0);
}

function calcularPropuesta(monto) {
  const pendientes = calcularPendientes();
  const metaHoy = pendientes.reduce((total, p) => total + p.cuotaHoy, 0);
  let disponible = monto;

  const asignaciones = pendientes.map(p => {
    const asignado = Math.min(p.cuotaHoy, disponible);
    disponible -= asignado;
    return Object.assign({}, p, { asignado });
  });

  return { monto, metaHoy, asignaciones, libre: disponible, cubreMeta: monto >= metaHoy };
}

function aplicarPropuesta(ingresoId) {
  const ingresos = leerLista('ingresos');
  const ingreso = ingresos.find(i => i.id === ingresoId);
  if (!ingreso || ingreso.distribuido) return;

  const propuesta = calcularPropuesta(ingreso.monto);
  const obligaciones = leerLista('obligaciones');
  const aportes = leerLista('aportes');

  propuesta.asignaciones.forEach(a => {
    if (a.asignado <= 0) return;
    const obligacion = obligaciones.find(o => o.id === a.obligacion.id);
    obligacion.aportado += a.asignado;
    aportes.push({ id: generarId(), ingresoId, obligacionId: obligacion.id, monto: a.asignado, fecha: hoyISO() });
  });

  ingreso.distribuido = true;
  ingreso.libre = propuesta.libre;

  guardarLista('obligaciones', obligaciones);
  guardarLista('aportes', aportes);
  guardarLista('ingresos', ingresos);
}

function mostrarPropuesta(ingresoId) {
  ingresoEnPropuesta = ingresoId;
  renderDistribucion();
}

// Avisos de la propuesta (flujo alterno del CU-04: ingresos bajos o atípicos)
function armarAvisosPropuesta(propuesta, ingresoId) {
  const avisos = [];

  if (propuesta.asignaciones.length === 0) {
    avisos.push('<div class="alert alert-info">No tienes obligaciones pendientes: todo este ingreso queda libre.</div>');
    return avisos.join('');
  }

  if (!propuesta.cubreMeta) {
    avisos.push('<div class="alert alert-warning">Este ingreso no alcanza la meta de hoy (' + formatearMoneda(propuesta.metaHoy) +
      '). Se reparte por prioridad y lo que falte se recalcula automáticamente entre los días restantes.</div>');
  }

  const previos = leerLista('ingresos').filter(i => i.id !== ingresoId);
  if (previos.length >= 3) {
    const promedio = sumar(previos, 'monto') / previos.length;
    if (propuesta.monto > promedio * 1.5) {
      avisos.push('<div class="alert alert-info">Este ingreso es mayor a lo habitual (promedio: ' + formatearMoneda(promedio) + '). Las metas de los días restantes se recalcularon.</div>');
    } else if (propuesta.monto < promedio * 0.5) {
      avisos.push('<div class="alert alert-warning">Este ingreso es menor a lo habitual (promedio: ' + formatearMoneda(promedio) + '). Las metas de los días restantes se recalcularon.</div>');
    }
  }

  return avisos.join('');
}

function renderDistribucion() {
  document.getElementById('metaDiariaDist').textContent = formatearMoneda(calcularMetaDiaria());

  // Ingresos que todavía no se han distribuido
  const pendientesIngreso = leerLista('ingresos').filter(i => !i.distribuido).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const lista = document.getElementById('listaPendientes');

  if (pendientesIngreso.length === 0) {
    lista.innerHTML = '<p class="text-body-secondary mb-0">No tienes ingresos por distribuir. Registra uno en la sección Ingresos.</p>';
  } else {
    lista.innerHTML = pendientesIngreso.map(i =>
      '<div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary-subtle">' +
        '<span>' + formatearMoneda(i.monto) + ' <small class="text-body-secondary">· ' + escaparHTML(i.origen) + ' · ' + formatearFecha(i.fecha) + '</small></span>' +
        '<button class="btn btn-sm btn-gold" data-ingreso="' + i.id + '">Ver propuesta</button>' +
      '</div>'
    ).join('');
  }

  // Desglose de la meta diaria
  const desglose = document.getElementById('tablaDesglose');
  const pendientes = calcularPendientes();

  if (pendientes.length === 0) {
    desglose.innerHTML = '<tr><td colspan="5" class="text-center text-body-secondary py-4">No hay obligaciones pendientes. Agrega una en la sección Obligaciones.</td></tr>';
  } else {
    desglose.innerHTML = pendientes.map(p =>
      '<tr>' +
        '<td>' + escaparHTML(p.obligacion.nombre) + (p.vencida ? ' <span class="badge text-bg-danger">Vencida</span>' : '') + '</td>' +
        '<td>' + badgePrioridad(p.obligacion.prioridad) + '</td>' +
        '<td class="text-end">' + formatearMoneda(p.restante) + '</td>' +
        '<td class="text-end">' + p.dias + '</td>' +
        '<td class="text-end">' + formatearMoneda(p.cuotaDiaria) + '</td>' +
      '</tr>'
    ).join('');
  }

  // Propuesta del ingreso seleccionado
  const tarjeta = document.getElementById('tarjetaPropuesta');
  const ingreso = ingresoEnPropuesta ? leerLista('ingresos').find(i => i.id === ingresoEnPropuesta && !i.distribuido) : null;

  if (!ingreso) {
    ingresoEnPropuesta = null;
    tarjeta.classList.add('d-none');
    return;
  }

  const propuesta = calcularPropuesta(ingreso.monto);
  tarjeta.classList.remove('d-none');
  document.getElementById('avisoPropuesta').innerHTML =
    '<p class="mb-3">Ingreso de <strong>' + formatearMoneda(ingreso.monto) + '</strong> (' + escaparHTML(ingreso.origen) + ')</p>' +
    armarAvisosPropuesta(propuesta, ingreso.id);

  document.getElementById('tablaPropuesta').innerHTML = propuesta.asignaciones.length === 0
    ? '<tr><td colspan="4" class="text-center text-body-secondary py-3">Sin obligaciones pendientes.</td></tr>'
    : propuesta.asignaciones.map(a =>
        '<tr>' +
          '<td>' + escaparHTML(a.obligacion.nombre) + '</td>' +
          '<td>' + badgePrioridad(a.obligacion.prioridad) + '</td>' +
          '<td class="text-end">' + formatearMoneda(a.cuotaHoy) + '</td>' +
          '<td class="text-end">' + formatearMoneda(a.asignado) + '</td>' +
        '</tr>'
      ).join('');

  document.getElementById('librePropuesta').textContent = formatearMoneda(propuesta.libre);
}

function iniciarDistribucion() {
  document.getElementById('listaPendientes').addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-ingreso]');
    if (boton) mostrarPropuesta(Number(boton.dataset.ingreso));
  });

  document.getElementById('btnAplicarPropuesta').addEventListener('click', () => {
    if (!ingresoEnPropuesta) return;
    aplicarPropuesta(ingresoEnPropuesta);
    ingresoEnPropuesta = null;
    mostrarAviso('Distribución aplicada.');
    refrescarTodo();
  });

  document.getElementById('btnCerrarPropuesta').addEventListener('click', () => {
    ingresoEnPropuesta = null;
    renderDistribucion();
  });
}
