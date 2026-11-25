const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EDAD_MINIMA = 16;
const EDAD_MAXIMA = 100;

function hoyISO(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
  return partes;
}

function fechaValida(texto) {
  if (typeof texto !== 'string' || !REGEX_FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto;
}

function calcularEdad(fechaNacimiento, hoy = hoyISO()) {
  const [a, m, d] = fechaNacimiento.split('-').map(Number);
  const [ha, hm, hd] = hoy.split('-').map(Number);
  let edad = ha - a;
  if (hm < m || (hm === m && hd < d)) edad -= 1;
  return edad;
}

function textoOpcional(valor) {
  if (valor === undefined || valor === null) return '';
  return typeof valor === 'string' ? valor.trim() : null;
}

// Cada campo es opcional para poder completar la ficha poco a poco; lo que llega vacío queda en NULL.
function validarFicha(body, hoy = hoyISO()) {
  const datos = body || {};
  const errores = [];

  const nombre = textoOpcional(datos.nombre_completo);
  if (nombre === null || nombre.length > 150 || (nombre && nombre.length < 2)) {
    errores.push('El nombre completo debe tener entre 2 y 150 caracteres.');
  }

  const dpiCrudo = textoOpcional(datos.dpi);
  const dpi = dpiCrudo === null ? null : dpiCrudo.replace(/[\s-]/g, '');
  if (dpi === null || (dpi && !/^\d{13}$/.test(dpi))) {
    errores.push('El DPI debe tener 13 dígitos.');
  }

  const nacimiento = textoOpcional(datos.fecha_nacimiento);
  if (nacimiento === null || (nacimiento && !fechaValida(nacimiento))) {
    errores.push('La fecha de nacimiento no es válida.');
  } else if (nacimiento) {
    const edad = calcularEdad(nacimiento, hoy);
    if (nacimiento > hoy || edad < EDAD_MINIMA || edad > EDAD_MAXIMA) {
      errores.push(`La fecha de nacimiento debe corresponder a una edad entre ${EDAD_MINIMA} y ${EDAD_MAXIMA} años.`);
    }
  }

  const correo = textoOpcional(datos.correo);
  if (correo === null || (correo && (correo.length > 120 || !REGEX_CORREO.test(correo)))) {
    errores.push('El correo electrónico no es válido.');
  }

  const telefonoCrudo = textoOpcional(datos.telefono);
  const telefono = telefonoCrudo === null ? null : telefonoCrudo.replace(/[\s-]/g, '');
  if (telefono === null || (telefono && !/^\+?\d{8,15}$/.test(telefono))) {
    errores.push('El teléfono debe tener entre 8 y 15 dígitos.');
  }

  const ingreso = textoOpcional(datos.fecha_ingreso);
  if (ingreso === null || (ingreso && !fechaValida(ingreso))) {
    errores.push('La fecha de ingreso no es válida.');
  } else if (ingreso) {
    if (ingreso > hoy) errores.push('La fecha de ingreso no puede ser futura.');
    else if (ingreso < '1950-01-01') errores.push('La fecha de ingreso no es válida.');
    else if (nacimiento && fechaValida(nacimiento) && ingreso <= nacimiento) {
      errores.push('La fecha de ingreso debe ser posterior a la de nacimiento.');
    }
  }

  if (errores.length) return { errores };
  return {
    errores,
    valores: {
      nombre_completo: nombre || null,
      dpi: dpi || null,
      fecha_nacimiento: nacimiento || null,
      correo: correo || null,
      telefono: telefono || null,
      fecha_ingreso: ingreso || null,
    },
  };
}

function esPdf(buffer) {
  return Buffer.isBuffer(buffer)
    && buffer.length > 4
    && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

function tipoImagen(buffer, mime) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([255,216,255]))) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/webp' ? null : null;
}

module.exports = { validarFicha, calcularEdad, esPdf, tipoImagen, hoyISO, fechaValida };
