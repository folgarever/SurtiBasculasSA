const { obtenerBanco } = require('./evaluacionesConocimiento');

const aptitudes = [
  ['Debes priorizar una tarea urgente sin afectar otras entregas. ¿Qué haces primero?', [
    'Revisas urgencia, impacto, plazo y recursos antes de reordenar el trabajo.',
    'Atiendes la última solicitud recibida sin revisar plazos.',
    'Suspendes todas las tareas hasta recibir instrucciones.',
    'Delegas la decisión sin informar a las personas afectadas.',
  ], 0],
  ['Detectas que dos registros tienen montos distintos. ¿Cuál es el primer paso?', [
    'Identificas las fuentes y verificas los documentos de respaldo.',
    'Cambias el monto menor para igualarlo.',
    'Eliminas uno de los registros.',
    'Promedias los dos montos.',
  ], 0],
  ['Una actividad toma 40 minutos y otra 25 minutos; ambas vencen en una hora. ¿Qué información necesitas para organizarte?', [
    'Sus vencimientos, dependencias y si alguna puede dividirse o delegarse.',
    'Solo el orden en que llegaron.',
    'Cuál es más sencilla, sin revisar la fecha límite.',
    'El nombre de quien solicitó cada una.',
  ], 0],
  ['Un resultado cambia al repetir una medición o revisión. ¿Qué conviene hacer?', [
    'Conservar ambas observaciones, comprobar las condiciones y documentar la diferencia.',
    'Elegir el resultado que favorece el cierre.',
    'Borrar la primera observación.',
    'Repetir hasta obtener el resultado esperado.',
  ], 0],
  ['Recibes una instrucción que contradice un procedimiento vigente. ¿Cómo procedes?', [
    'Detienes el paso afectado, verificas la versión vigente y consultas al responsable.',
    'Sigues la instrucción verbal para evitar retrasos.',
    'Combinas ambas instrucciones sin dejar constancia.',
    'Cambias el procedimiento por tu cuenta.',
  ], 0],
];

const valores = [
  ['Te solicitan alterar un dato para que un reporte coincida. ¿Qué haces?', [
    'Conservas el dato original, verificas la fuente y reportas la discrepancia.',
    'Lo cambias si el solicitante tiene más antigüedad.',
    'Lo modificas y eliminas el respaldo anterior.',
    'Lo dejas así sin informar.',
  ], 0],
  ['Recibes información personal que no necesitas para tu tarea. ¿Cómo la manejas?', [
    'La mantienes restringida y la compartes solo por canales autorizados si es necesario.',
    'La reenvías al equipo completo para que todos estén informados.',
    'La guardas en una carpeta personal abierta.',
    'La incluyes en un reporte comercial.',
  ], 0],
  ['Cometes un error en un registro que ya fue enviado. ¿Qué corresponde?', [
    'Notificas a los destinatarios, corriges con trazabilidad y conservas la versión previa.',
    'Reemplazas el archivo sin avisar.',
    'Esperas a que alguien lo detecte.',
    'Eliminas el historial de cambios.',
  ], 0],
  ['Una persona solicita omitir una aprobación para acelerar el trabajo. ¿Qué haces?', [
    'Mantienes el control y solicitas la autorización por el canal establecido.',
    'Omites la aprobación si existe confianza.',
    'Registras la aprobación después de ejecutar la tarea.',
    'Pides a un compañero que apruebe en nombre del responsable.',
  ], 0],
  ['Detectas un riesgo para una persona o un equipo durante una actividad. ¿Qué haces?', [
    'Detienes o controlas la actividad y comunicas el riesgo al responsable.',
    'Continúas si el cliente tiene prisa.',
    'Esperas a que termine el turno.',
    'Lo reportas solo si ocurre un incidente.',
  ], 0],
];

const puestos = Object.freeze({
  GG: {
    titulo: 'Evaluación de selección de Gerente General',
    tiempo: 75,
    caso: ['Varias órdenes de servicio compiten por capacidad técnica; una falla urgente afecta al cliente y hay tareas preventivas programadas. ¿Qué plan de coordinación presenta?', [
      'Prioriza por impacto y urgencia, verifica competencias y recursos, asigna responsables y plazos, comunica cambios y revisa hitos y pendientes.',
      'Asigna al primer técnico disponible y cancela el resto sin revisar necesidades.',
      'Deja que cada técnico elija su orden y consulta los resultados al cierre del mes.',
      'Cierra la solicitud urgente porque ya existe una visita programada.',
    ], 0],
  },
  AC: {
    titulo: 'Evaluación de selección de Asistente Comercial y Recursos Humanos',
    tiempo: 75,
    caso: ['Coinciden una solicitud de seguimiento de cotización y una actualización de expediente laboral; falta confirmar un dato con el área responsable. ¿Cómo organiza y documenta el trabajo?', [
      'Registra responsables, fechas y acuerdos; verifica el alcance de la cotización, protege el expediente y confirma el dato con la fuente autorizada antes de comunicarlo.',
      'Comparte el expediente en un grupo abierto y promete al cliente una condición sin confirmación.',
      'Actualiza el dato por intuición y envía la cotización anterior para cumplir el plazo.',
      'Deja ambas solicitudes sin registro hasta que regrese el responsable.',
    ], 0],
  },
  VEN: {
    titulo: 'Evaluación de selección de Vendedor',
    tiempo: 75,
    caso: ['Un cliente solicita una báscula para una aplicación no especificada, pide una característica que no está confirmada y requiere fecha de entrega. ¿Qué respuesta comercial es adecuada?', [
      'Aclara aplicación y capacidad requerida, valida la característica con el área responsable y prepara una propuesta con alcance, condiciones, entrega y seguimiento registrados.',
      'Garantiza la característica y el plazo para asegurar la venta.',
      'Envía el catálogo completo y marca la oportunidad como cerrada.',
      'Cotiza el equipo de menor precio sin consultar la aplicación.',
    ], 0],
  },
  AUXC: {
    titulo: 'Evaluación de selección de Auxiliar Contable',
    tiempo: 75,
    caso: ['Durante el cierre recibes facturas de proveedor, una diferencia con el soporte y un reporte financiero por preparar. ¿Qué secuencia mantiene la trazabilidad?', [
      'Verifica datos y autorizaciones, relaciona cada registro con su soporte, detiene la diferencia para revisión y comprueba periodo y conciliaciones antes de entregar el reporte.',
      'Registra todos los montos para cerrar el periodo y corrige las diferencias después.',
      'Ajusta el soporte para que coincida con el sistema y elimina los borradores.',
      'Entrega el reporte como definitivo sin identificar documentos pendientes.',
    ], 0],
  },
  JM: {
    titulo: 'Evaluación de selección de Jefe de Mantenimiento',
    tiempo: 75,
    caso: ['Debes coordinar trabajos preventivos y correctivos; una orden urgente presenta un riesgo de seguridad y falta confirmar la compatibilidad de un repuesto. ¿Cómo diriges la operación?', [
      'Controla el riesgo antes de continuar, prioriza por impacto y competencia, verifica alcance y compatibilidad del repuesto, asigna responsables y comunica el plan y pendientes.',
      'Mantiene la prioridad original y pide al equipo terminar rápido.',
      'Autoriza cualquier repuesto disponible para cumplir la fecha.',
      'Cierra la orden y deja la comunicación para después.',
    ], 0],
  },
  TEC: {
    titulo: 'Evaluación de selección de Técnico',
    tiempo: 75,
    caso: ['En un servicio de un equipo de pesaje, la lectura es inestable y no está disponible el procedimiento o patrón requerido. ¿Qué actuación demuestra control técnico?', [
      'Identifica equipo y alcance, revisa seguridad, registra la condición, consulta al responsable y no declara un resultado que no pudo verificar.',
      'Promedia lecturas hasta obtener un valor conveniente.',
      'Ajusta el equipo con la herramienta disponible y completa el reporte como conforme.',
      'Copia el resultado de una visita anterior para cerrar la orden.',
    ], 0],
  },
  AUXTEC: {
    titulo: 'Evaluación de selección de Auxiliar Técnico',
    tiempo: 75,
    caso: ['Antes y durante una intervención, encuentras una herramienta faltante, una condición insegura y un componente dañado. ¿Cuál es la respuesta correcta dentro de tu función de apoyo?', [
      'Verifica herramientas y materiales de la orden, informa la condición insegura y el daño al técnico responsable y apoya el registro sin cambiar el alcance.',
      'Sustituye el componente por otro disponible y continúa para no retrasar el servicio.',
      'Resuelve por cuenta propia la condición y registra el trabajo como terminado.',
      'Retira el componente dañado sin identificarlo y comunica el faltante al final.',
    ], 0],
  },
  DC: {
    titulo: 'Evaluación de selección de Director de Calidad',
    tiempo: 75,
    caso: ['Una auditoría identifica una no conformidad repetida y documentos obsoletos disponibles en el área. ¿Qué plan de calidad corresponde?', [
      'Controla la versión obsoleta, registra evidencia verificable, analiza la causa, asigna acciones y responsables y comprueba su eficacia.',
      'Cierra el hallazgo al corregir solo el caso visible.',
      'Cambia el criterio de aceptación para que el resultado cumpla.',
      'Retira documentos sin registrar el cambio y deja el hallazgo para la siguiente auditoría.',
    ], 0],
  },
  MET: {
    titulo: 'Evaluación de selección de Metrológico',
    tiempo: 75,
    caso: ['Debes verificar un equipo y detectas que el patrón está fuera de vigencia y las condiciones ambientales exceden el procedimiento. ¿Qué haces?', [
      'No usas el patrón para el resultado previsto, controlas y registras las condiciones, consultas el procedimiento y gestionas una referencia vigente antes de reportar.',
      'Usas el patrón si la lectura parece estable y ajustas el resultado manualmente.',
      'Cambias la fecha de la etiqueta y continúas la verificación.',
      'Usas datos de otra fecha para completar el certificado.',
    ], 0],
  },
  AUXLAB: {
    titulo: 'Evaluación de selección de Auxiliar de Laboratorio',
    tiempo: 75,
    caso: ['Recibes varios instrumentos para evaluación; uno presenta daño y una instrucción verbal contradice el procedimiento vigente. ¿Cómo apoyas el proceso?', [
      'Verifica identificación y estado recibido, conserva la asociación con sus registros, informa el daño y consulta al responsable antes de continuar con la instrucción.',
      'Retira las etiquetas para agilizar el trabajo y sigue la instrucción verbal.',
      'Repara el instrumento sin autorización y registra que llegó en buen estado.',
      'Agrupa instrumentos y documentos sin identificar para ahorrar espacio.',
    ], 0],
  },
});

function crearOpciones(opciones, correcta, parcial = -1, puntosParciales = 0, puntosCorrectos) {
  return opciones.map((texto, indice) => ({
    id: String.fromCharCode(65 + indice),
    texto,
    puntos: indice === correcta ? puntosCorrectos : indice === parcial ? puntosParciales : 0,
    correcta: indice === correcta,
  }));
}

function crearBancoSeccion(codigo) {
  const banco = obtenerBanco(codigo) || [];
  return banco.map(([enunciado, opciones, correcta], indice) => ({
    enunciado: `${indice + 1}. ${enunciado}`,
    rubrica: [{ criterio: 'Selecciona la respuesta alineada con el proceso y los controles del puesto.', puntos: 4 }],
    opciones: crearOpciones(opciones, correcta, -1, 0, 4),
  }));
}

function crearPlantilla(codigo) {
  const puesto = puestos[codigo];
  if (!puesto) return null;
  return {
    titulo: puesto.titulo,
    tiempo_total_minutos: puesto.tiempo,
    puntaje_total: 100,
    umbrales: {
      recomendable: 80,
      revision_adicional: 70,
      minimo_practica: 33,
      minimo_conocimientos: 12,
      minimo_valores: 9,
    },
    verificacion_en_vivo: {
      tiempo_minutos: 0,
      instrucciones: 'La prueba de opción múltiple se califica automáticamente; la verificación adicional es opcional y no modifica la calificación registrada.',
      actividades: [],
    },
    secciones: [
      {
        id: 'aptitudes',
        nombre: 'Aptitudes y razonamiento',
        tiempo_minutos: 15,
        puntaje_maximo: 10,
        instrucciones: 'Seleccione una respuesta por pregunta. Cada pregunta vale 2 puntos.',
        items: aptitudes.map(([enunciado, opciones, correcta], indice) => ({
          enunciado: `A${indice + 1}. ${enunciado}`,
          rubrica: [{ criterio: 'Aplica razonamiento, priorización y verificación.', puntos: 2 }],
          opciones: crearOpciones(opciones, correcta, -1, 0, 2),
        })),
      },
      {
        id: 'conocimientos',
        nombre: 'Conocimientos específicos del puesto',
        tiempo_minutos: 20,
        puntaje_maximo: 20,
        instrucciones: 'Seleccione la respuesta más adecuada para las funciones y controles del puesto. Cada pregunta vale 4 puntos.',
        items: crearBancoSeccion(codigo),
      },
      {
        id: 'practica',
        nombre: 'Caso práctico del puesto',
        tiempo_minutos: 25,
        puntaje_maximo: 55,
        instrucciones: 'Analice la situación realista y seleccione la actuación que integra los pasos críticos de la función.',
        items: [{
          enunciado: 'Caso práctico integrado',
          detalle: puesto.caso[0],
          rubrica: [{ criterio: 'Integra priorización, procedimiento, comunicación y documentación propios del puesto.', puntos: 55 }],
          opciones: crearOpciones(puesto.caso[1], puesto.caso[2], -1, 0, 55),
        }],
      },
      {
        id: 'valores',
        nombre: 'Valores y responsabilidad',
        tiempo_minutos: 15,
        puntaje_maximo: 15,
        instrucciones: 'Seleccione la respuesta que mantiene la integridad, la confidencialidad, la seguridad y la trazabilidad. Cada pregunta vale 3 puntos.',
        items: valores.map(([enunciado, opciones, correcta], indice) => ({
          enunciado: `V${indice + 1}. ${enunciado}`,
          rubrica: [{ criterio: 'Protege los controles, comunica y conserva evidencia.', puntos: 3 }],
          opciones: crearOpciones(opciones, correcta, -1, 0, 3),
        })),
      },
    ],
  };
}

function obtenerEvaluacion(codigo) {
  return crearPlantilla(codigo);
}

function codigosPuestosConPrueba() {
  return Object.keys(puestos);
}

module.exports = { obtenerEvaluacion, codigosPuestosConPrueba };
