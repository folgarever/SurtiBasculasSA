const FRECUENCIAS_EVALUACION = ['mensual', 'quincenal', 'semanal'];

const PERIODOS = {
  mensual: /^\d{4}-(0[1-9]|1[0-2])$/,
  quincenal: /^\d{4}-(0[1-9]|1[0-2])-Q[12]$/,
  semanal: /^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/,
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function dosDigitos(valor) {
  return String(valor).padStart(2, '0');
}

function fechaGuatemala(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);
  const valor = (tipo) => Number(partes.find((parte) => parte.type === tipo)?.value);
  return { anio: valor('year'), mes: valor('month'), dia: valor('day') };
}

function lunesDeSemanaISO(anio, semana) {
  const jueves = new Date(Date.UTC(anio, 0, 4));
  const primerLunes = new Date(jueves);
  primerLunes.setUTCDate(jueves.getUTCDate() - ((jueves.getUTCDay() || 7) - 1));
  const lunes = new Date(primerLunes);
  lunes.setUTCDate(primerLunes.getUTCDate() + (semana - 1) * 7);
  return lunes;
}

function periodoDeFecha(fecha, frecuencia) {
  if (!FRECUENCIAS_EVALUACION.includes(frecuencia)) {
    throw new Error(`Frecuencia de evaluación no válida: ${frecuencia}`);
  }
  const { anio, mes, dia } = fechaGuatemala(fecha);
  if (frecuencia === 'mensual') return `${anio}-${dosDigitos(mes)}`;
  if (frecuencia === 'quincenal') return `${anio}-${dosDigitos(mes)}-Q${dia <= 15 ? 1 : 2}`;

  const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));
  const diaSemana = fechaUTC.getUTCDay() || 7;
  fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - diaSemana);
  const anioISO = fechaUTC.getUTCFullYear();
  const primerJueves = new Date(Date.UTC(anioISO, 0, 4));
  const primerLunesISO = new Date(primerJueves);
  primerLunesISO.setUTCDate(primerJueves.getUTCDate() - ((primerJueves.getUTCDay() || 7) - 1));
  const semana = Math.floor((fechaUTC - primerLunesISO) / MS_POR_DIA / 7) + 1;
  return `${anioISO}-W${dosDigitos(semana)}`;
}

function esPeriodoValido(periodo, frecuencia) {
  if (typeof periodo !== 'string') return false;
  if (frecuencia && !FRECUENCIAS_EVALUACION.includes(frecuencia)) return false;
  if (frecuencia) return PERIODOS[frecuencia].test(periodo);
  return Object.values(PERIODOS).some((patron) => patron.test(periodo));
}

function periodoSiguiente(periodo, frecuencia) {
  if (!esPeriodoValido(periodo, frecuencia)) {
    throw new Error(`Periodo o frecuencia no válidos: ${periodo} / ${frecuencia}`);
  }
  if (frecuencia === 'mensual') {
    const [anio, mes] = periodo.split('-').map(Number);
    return `${anio + (mes === 12 ? 1 : 0)}-${dosDigitos(mes === 12 ? 1 : mes + 1)}`;
  }
  if (frecuencia === 'quincenal') {
    const [anio, mes, quincena] = periodo.split('-');
    const numeroAnio = Number(anio);
    if (quincena === 'Q1') return `${anio}-${mes}-Q2`;
    const numeroMes = Number(mes);
    return `${numeroAnio + (numeroMes === 12 ? 1 : 0)}-${dosDigitos(numeroMes === 12 ? 1 : numeroMes + 1)}-Q1`;
  }

  const [anioTexto, semanaConPrefijo] = periodo.split('-');
  const lunes = lunesDeSemanaISO(Number(anioTexto), Number(semanaConPrefijo.slice(1)));
  lunes.setUTCDate(lunes.getUTCDate() + 7);
  lunes.setUTCHours(12, 0, 0, 0);
  return periodoDeFecha(lunes, 'semanal');
}

function periodosSiguientes(periodo, frecuencia, cantidad = 3) {
  const resultado = [];
  let actual = periodo;
  for (let indice = 0; indice < cantidad; indice += 1) {
    actual = periodoSiguiente(actual, frecuencia);
    resultado.push(actual);
  }
  return resultado;
}

function periodoAnterior(periodo, frecuencia) {
  if (!esPeriodoValido(periodo, frecuencia)) {
    throw new Error(`Periodo o frecuencia no válidos: ${periodo} / ${frecuencia}`);
  }
  if (frecuencia === 'mensual') {
    const [anio, mes] = periodo.split('-').map(Number);
    return `${mes === 1 ? anio - 1 : anio}-${dosDigitos(mes === 1 ? 12 : mes - 1)}`;
  }
  if (frecuencia === 'quincenal') {
    const [anio, mes, quincena] = periodo.split('-');
    const numeroAnio = Number(anio);
    const numeroMes = Number(mes);
    if (quincena === 'Q2') return `${anio}-${mes}-Q1`;
    return `${numeroMes === 1 ? numeroAnio - 1 : numeroAnio}-${dosDigitos(numeroMes === 1 ? 12 : numeroMes - 1)}-Q2`;
  }

  const [anioTexto, semanaConPrefijo] = periodo.split('-');
  const lunes = lunesDeSemanaISO(Number(anioTexto), Number(semanaConPrefijo.slice(1)));
  lunes.setUTCDate(lunes.getUTCDate() - 7);
  lunes.setUTCHours(12, 0, 0, 0);
  return periodoDeFecha(lunes, 'semanal');
}

module.exports = {
  FRECUENCIAS_EVALUACION,
  esPeriodoValido,
  periodoAnterior,
  periodoDeFecha,
  periodosSiguientes,
  periodoSiguiente,
};
