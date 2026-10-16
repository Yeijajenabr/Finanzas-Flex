// js/reportes.js
// Módulo de Reportes (CU-06): compara ingresos variables contra lo aportado a obligaciones,
// por semana (últimos 7 días) o por mes (mes actual, agrupado de 7 en 7 días).

// Arma los grupos de fechas del periodo: cada grupo es una pareja de barras
function construirGrupos(tipo) {
  const hoy = hoyISO();
  const grupos = [];

  if (tipo === 'semana') {
    for (let i = 6; i >= 0; i--) {
      const fecha = sumarDias(hoy, -i);
      const etiqueta = fechaDesdeISO(fecha).toLocaleDateString('es-CO', { weekday: 'short' });
      grupos.push({ etiqueta, desde: fecha, hasta: fecha, ingresos: 0, aportes: 0 });
    }
    return grupos;
  }

  const partes = hoy.split('-').map(Number);
  const ultimoDia = new Date(partes[0], partes[1], 0).getDate();
  for (let inicio = 1; inicio <= ultimoDia; inicio += 7) {
    const fin = Math.min(inicio + 6, ultimoDia);
    grupos.push({
      etiqueta: inicio + '-' + fin,
      desde: armarISO(partes[0], partes[1], inicio),
      hasta: armarISO(partes[0], partes[1], fin),
      ingresos: 0,
      aportes: 0
    });
  }
  return grupos;
}

function renderReportes() {
  const tipo = document.getElementById('periodoReporte').value;
  const grupos = construirGrupos(tipo);
  const desde = grupos[0].desde;
  const hasta = grupos[grupos.length - 1].hasta;

  const ingresos = leerLista('ingresos').filter(i => i.fecha >= desde && i.fecha <= hasta);
  const aportes = leerLista('aportes').filter(a => a.fecha >= desde && a.fecha <= hasta);

  // Flujo alterno: sin datos suficientes en el periodo
  const vacio = ingresos.length === 0 && aportes.length === 0;
  document.getElementById('reporteVacio').classList.toggle('d-none', !vacio);
  document.getElementById('reporteContenido').classList.toggle('d-none', vacio);
  if (vacio) return;

  grupos.forEach(grupo => {
    grupo.ingresos = sumar(ingresos.filter(i => i.fecha >= grupo.desde && i.fecha <= grupo.hasta), 'monto');
    grupo.aportes = sumar(aportes.filter(a => a.fecha >= grupo.desde && a.fecha <= grupo.hasta), 'monto');
  });

  // Indicadores
  const totalIngresos = sumar(ingresos, 'monto');
  const totalAportes = sumar(aportes, 'monto');
  const porcentaje = totalIngresos > 0 ? Math.round((totalAportes / totalIngresos) * 100) : 0;

  const obligaciones = leerLista('obligaciones');
  const totalesPorObligacion = {};
  aportes.forEach(a => {
    totalesPorObligacion[a.obligacionId] = (totalesPorObligacion[a.obligacionId] || 0) + a.monto;
  });
  let mayorNombre = 'Sin aportes';
  let mayorMonto = 0;
  Object.keys(totalesPorObligacion).forEach(id => {
    const obligacion = obligaciones.find(o => o.id === Number(id));
    if (obligacion && totalesPorObligacion[id] > mayorMonto) {
      mayorMonto = totalesPorObligacion[id];
      mayorNombre = obligacion.nombre;
    }
  });

  document.getElementById('repIngresos').textContent = formatearMoneda(totalIngresos);
  document.getElementById('repAportes').textContent = formatearMoneda(totalAportes);
  document.getElementById('repPorcentaje').textContent = porcentaje + '%';
  document.getElementById('repMayor').textContent = mayorNombre;

  const alerta = document.getElementById('repAlerta');
  if (porcentaje > 80) {
    alerta.textContent = 'Más del 80% de tus ingresos de este periodo se fue a obligaciones. Revisa si alguna se puede reducir o renegociar.';
    alerta.classList.remove('d-none');
  } else {
    alerta.classList.add('d-none');
  }

  // Gráfico de barras: la altura de cada barra la calcula JavaScript
  const maximo = Math.max.apply(null, grupos.map(g => Math.max(g.ingresos, g.aportes)));
  const grafico = document.getElementById('graficoBarras');

  grafico.innerHTML = grupos.map(g =>
    '<div class="grupo-barras">' +
      '<div class="barras">' +
        '<span class="barra barra-ingreso" data-alto="' + (maximo ? Math.round((g.ingresos / maximo) * 100) : 0) + '" title="Ingresos: ' + formatearMoneda(g.ingresos) + '"></span>' +
        '<span class="barra barra-gasto" data-alto="' + (maximo ? Math.round((g.aportes / maximo) * 100) : 0) + '" title="Aportes: ' + formatearMoneda(g.aportes) + '"></span>' +
      '</div>' +
      '<span class="etiqueta-barra">' + g.etiqueta + '</span>' +
    '</div>'
  ).join('');

  grafico.querySelectorAll('.barra[data-alto]').forEach(barra => {
    barra.style.height = barra.dataset.alto + '%';
  });
}

function iniciarReportes() {
  document.getElementById('periodoReporte').addEventListener('change', renderReportes);
}
