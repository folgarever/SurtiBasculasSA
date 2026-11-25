import { jsPDF } from 'jspdf';
import { DetalleEmpleado } from '../../services/rrhh.service';

const AZUL = '#1c304c';
const ROJO = '#ad252b';
const FONDO = '#f1f4f8';
const TEXTO_SECUNDARIO = '#56677d';

function fecha(valor: string | null): string {
  if (!valor) return 'Sin registrar';
  const partes = valor.slice(0, 10).split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor;
}

function edad(valor: string | null): string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return 'Sin registrar';
  const [anio, mes, dia] = valor.slice(0, 10).split('-').map(Number);
  const [anioActual, mesActual, diaActual] = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }).split('-').map(Number);
  const anios = anioActual - anio - (mesActual < mes || (mesActual === mes && diaActual < dia) ? 1 : 0);
  return anios >= 0 ? `${anios} ${anios === 1 ? 'año' : 'años'}` : 'Sin registrar';
}

async function imagenCircular(archivo: Blob): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const imagen = new Image();
    await new Promise<void>((resolve, reject) => {
      imagen.onload = () => resolve();
      imagen.onerror = () => reject(new Error('No se pudo leer la foto del empleado.'));
      imagen.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('No se pudo preparar la foto del empleado.');
    contexto.beginPath();
    contexto.arc(150, 150, 150, 0, Math.PI * 2);
    contexto.clip();
    const lado = Math.min(imagen.naturalWidth, imagen.naturalHeight);
    if (!lado) throw new Error('La foto del empleado no tiene dimensiones válidas.');
    contexto.drawImage(imagen, (imagen.naturalWidth - lado) / 2, (imagen.naturalHeight - lado) / 2, lado, lado, 0, 0, 300, 300);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function generarFichaPdf(detalle: DetalleEmpleado, foto: Blob | null): Promise<Blob> {
  const { empleado, ficha } = detalle;
  const imagen = foto ? await imagenCircular(foto) : null;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = pdf.internal.pageSize.getWidth();
  const alto = pdf.internal.pageSize.getHeight();
  const margen = 18;
  const anchoTarjeta = ancho - margen * 2;

  pdf.setFillColor(AZUL);
  pdf.rect(0, 0, ancho, 25, 'F');
  pdf.setTextColor('#ffffff');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('SURTIBÁSCULAS S.A.', margen, 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('GESTIÓN DE PERSONAL', margen, 19);
  pdf.setFillColor(ROJO);
  pdf.rect(0, 25, ancho, 1.5, 'F');

  pdf.setTextColor(AZUL);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('FICHA DEL EMPLEADO', margen, 39);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  const nombre = pdf.splitTextToSize(empleado.nombre, anchoTarjeta - 63) as string[];
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const puesto = pdf.splitTextToSize(empleado.nombre_puesto || 'Puesto sin registrar', anchoTarjeta - 63) as string[];
  const identidad = pdf.splitTextToSize(
    `${empleado.codigo_empleado} · ${empleado.rol} · ${empleado.activo ? 'Activo' : 'Inactivo'}`,
    anchoTarjeta - 63
  ) as string[];
  const alturaEncabezado = Math.max(43, 16 + nombre.length * 6 + puesto.length * 5 + identidad.length * 5);
  pdf.setFillColor(FONDO);
  pdf.roundedRect(margen, 45, anchoTarjeta, alturaEncabezado, 4, 4, 'F');
  if (imagen) {
    pdf.addImage(imagen, 'PNG', margen + 7, 52, 29, 29);
  } else {
    pdf.setFillColor(AZUL);
    pdf.circle(margen + 21.5, 66.5, 14.5, 'F');
    pdf.setTextColor('#ffffff');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(empleado.nombre.trim().slice(0, 1).toUpperCase() || 'U', margen + 21.5, 69, { align: 'center' });
  }

  const textoX = margen + 44;
  pdf.setTextColor(AZUL);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(nombre, textoX, 56);
  let posicion = 56 + nombre.length * 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(TEXTO_SECUNDARIO);
  pdf.text(puesto, textoX, posicion);
  posicion += puesto.length * 5;
  pdf.text(identidad, textoX, posicion);

  let y = 45 + alturaEncabezado + 12;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(ROJO);
  pdf.text('DATOS PERSONALES', margen, y);
  y += 5;

  const filas: [string, string][] = [
    ['Nombre completo', ficha.nombre_completo || 'Sin registrar'],
    ['Número de DPI', ficha.dpi || 'Sin registrar'],
    ['Fecha de nacimiento', fecha(ficha.fecha_nacimiento)],
    ['Edad', edad(ficha.fecha_nacimiento)],
    ['Correo electrónico', ficha.correo || 'Sin registrar'],
    ['Teléfono', ficha.telefono || 'Sin registrar'],
    ['Fecha de ingreso', fecha(ficha.fecha_ingreso)],
  ];

  for (const [etiqueta, valor] of filas) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    const lineas = pdf.splitTextToSize(valor, anchoTarjeta - 77) as string[];
    const altura = Math.max(13, 7 + lineas.length * 5);
    if (y + altura > alto - 20) {
      pdf.addPage();
      y = margen;
    }
    pdf.setFillColor(FONDO);
    pdf.roundedRect(margen, y, anchoTarjeta, altura, 2, 2, 'F');
    pdf.setTextColor(TEXTO_SECUNDARIO);
    pdf.setFont('helvetica', 'normal');
    pdf.text(etiqueta, margen + 5, y + 8);
    pdf.setTextColor(AZUL);
    pdf.setFont('helvetica', 'bold');
    pdf.text(lineas, margen + 70, y + 8);
    y += altura + 2;
  }

  return pdf.output('blob');
}
