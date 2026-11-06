const BANCOS_POR_PUESTO = Object.freeze({
  GG: [
    ['Ante una solicitud urgente de mantenimiento y varios trabajos preventivos programados, ¿qué acción permite coordinar mejor el servicio?', ['Asignar el primer técnico disponible sin revisar el alcance', 'Priorizar por impacto y urgencia, confirmar recursos y comunicar el plan', 'Cancelar todos los trabajos programados', 'Dejar que cada técnico elija su orden'], 1],
    ['¿Qué información debe quedar clara al asignar una tarea?', ['Responsable, alcance, prioridad, recursos y plazo esperado', 'Solo el nombre del cliente', 'Únicamente la hora de salida', 'El costo estimado sin describir el trabajo'], 0],
    ['¿Cómo se confirma que un servicio técnico quedó atendido?', ['Con la salida del técnico de las instalaciones', 'Con el reporte del trabajo, revisión de pendientes y comunicación al cliente', 'Con una llamada informal sin registrar el resultado', 'Con la compra de repuestos'], 1],
    ['Si el cliente reporta que la falla continúa después del servicio, ¿qué corresponde?', ['Cerrar el caso porque ya hubo una visita', 'Revisar el reporte, coordinar diagnóstico y acordar seguimiento', 'Pedir al cliente que vuelva a solicitar el servicio otro mes', 'Cambiar al técnico sin recopilar información'], 1],
    ['¿Qué práctica mejora la supervisión de varios servicios simultáneos?', ['Solicitar actualizaciones en hitos y escalar desviaciones con datos', 'Esperar hasta fin de mes para preguntar', 'Evitar documentar cambios de prioridad', 'Asignar todo al equipo con menos trabajo sin verificar competencias'], 0],
  ],
  AC: [
    ['Al recibir información de una cotización para coordinarla internamente, ¿qué debe verificar primero?', ['Que el precio sea el menor, sin revisar el alcance', 'Cliente, requerimiento, alcance, vigencia y datos necesarios para seguimiento', 'Solo el nombre del vendedor', 'Que el documento tenga muchas páginas'], 1],
    ['¿Cómo debe compartir información del expediente de un colaborador?', ['En un grupo abierto para agilizar consultas', 'Solo con personas autorizadas y por los canales definidos', 'Con cualquier solicitante interno', 'En una cotización comercial'], 1],
    ['Un cliente solicita una actualización y el vendedor responsable no está disponible. ¿Qué apoyo es adecuado?', ['Prometer una fecha o condición sin confirmación', 'Registrar la solicitud, consultar el estado y comunicar información verificada', 'Eliminar la solicitud para evitar duplicados', 'Enviar una cotización anterior sin revisar'], 1],
    ['¿Qué ayuda a mantener ordenada la coordinación de actividades comerciales?', ['Registrar responsables, fechas y acuerdos en el medio interno establecido', 'Confiar únicamente en mensajes verbales', 'Guardar cada documento con nombres aleatorios', 'Compartir archivos sin identificar su versión'], 0],
    ['Si detecta un dato inconsistente en un documento de personal, ¿qué debe hacer?', ['Corregirlo sin confirmar la fuente', 'Verificarlo con la fuente autorizada y dejar constancia de la actualización', 'Ignorarlo si no afecta la agenda del día', 'Reenviar el documento a clientes'], 1],
  ],
  VEN: [
    ['¿Qué conviene hacer antes de preparar una cotización para un cliente?', ['Identificar aplicación, capacidad requerida, condiciones y necesidad de servicio', 'Enviar el catálogo completo sin preguntar', 'Ofrecer el precio más bajo sin definir el producto', 'Pedir una orden de compra antes de entender el requerimiento'], 0],
    ['Una cotización enviada no recibe respuesta. ¿Cuál es el seguimiento más útil?', ['Contactar al cliente en un plazo razonable, confirmar recepción y resolver dudas', 'Enviar la misma cotización diariamente', 'Marcarla como venta cerrada', 'Esperar indefinidamente sin registrar el contacto'], 0],
    ['El cliente pide una característica que no está confirmada. ¿Cómo debe responder?', ['Garantizarla para no perder la venta', 'Validar la especificación con el área responsable antes de comprometerla', 'Cambiarla por otra sin avisar', 'Omitir la pregunta en la propuesta'], 1],
    ['¿Qué información es importante registrar como oportunidad comercial?', ['Necesidad, contacto, etapa, próxima acción y fecha de seguimiento', 'Solo el nombre de la empresa', 'Únicamente el monto probable', 'La opinión personal sobre el cliente'], 0],
    ['¿Qué acción contribuye a una venta responsable?', ['Confirmar alcance, condiciones, entrega y servicio ofrecido antes del cierre', 'Prometer cualquier plazo para cerrar rápido', 'Ocultar exclusiones de la propuesta', 'Descontinuar el seguimiento después de enviar el precio'], 0],
  ],
  AUXC: [
    ['Antes de registrar una factura de proveedor, ¿qué control documental es prioritario?', ['Verificar datos fiscales, proveedor, fecha, importes y soporte de autorización', 'Registrar el total sin revisar el documento', 'Usar la factura de otro periodo como referencia', 'Esperar a que cierre el año contable'], 0],
    ['¿Qué permite que una operación contable sea trazable?', ['Relacionar el asiento con su documento soporte y una descripción clara', 'Guardar únicamente el monto', 'Eliminar los soportes una vez digitados', 'Usar una cuenta contable al azar'], 0],
    ['Al encontrar una diferencia entre un registro y su soporte, ¿qué procede?', ['Ajustar el dato para que coincida sin consultar', 'Detener la validación, revisar el origen y reportar la diferencia antes de corregir', 'Duplicar el asiento', 'Archivar el caso sin anotación'], 1],
    ['¿Qué debe hacerse antes de entregar un reporte financiero?', ['Revisar periodo, integridad de datos, conciliaciones y documentos pendientes', 'Cambiar cifras para que coincidan con el mes anterior', 'Enviar un borrador como definitivo sin identificarlo', 'Eliminar las cuentas con saldo inusual'], 0],
    ['¿Cómo se deben organizar los comprobantes de una operación?', ['Con criterios uniformes de fecha, tipo y referencia para recuperarlos', 'En una carpeta personal sin índice', 'Solo por el nombre de quien los recibió', 'Mezclados con documentos de personal'], 0],
  ],
  JM: [
    ['Al programar mantenimientos preventivos y correctivos concurrentes, ¿qué criterio debe orientar la asignación?', ['Impacto, urgencia, competencia requerida, disponibilidad y seguridad', 'Antigüedad del técnico únicamente', 'Orden alfabético de clientes', 'Preferencia personal del técnico'], 0],
    ['¿Qué debe incluir una orden de trabajo antes de asignarla?', ['Equipo, alcance, ubicación, prioridad, riesgos y resultado esperado', 'Solo una dirección', 'El nombre del técnico sin descripción', 'Únicamente una fecha tentativa'], 0],
    ['¿Cómo debe verificarse un servicio técnico terminado?', ['Revisar pruebas y reporte, confirmar pendientes y validar comunicación al cliente', 'Confiar solo en que la orden aparece cerrada', 'Esperar a que el cliente reclame', 'Solicitar la factura antes de revisar el trabajo'], 0],
    ['Si falta un repuesto crítico para una reparación, ¿qué acción es adecuada?', ['Sustituirlo por cualquier pieza disponible', 'Confirmar compatibilidad, disponibilidad y nuevo plan con el cliente', 'Cerrar la orden como completada', 'Enviar al auxiliar a comprar una pieza sin especificación'], 1],
    ['Ante un riesgo de seguridad detectado en campo, ¿qué debe hacer la jefatura?', ['Pedir que terminen rápido y reporten después', 'Detener o controlar la actividad, aplicar el procedimiento y coordinar una condición segura', 'Delegar la decisión al cliente', 'Omitir el riesgo si el servicio es urgente'], 1],
  ],
  TEC: [
    ['Antes de intervenir un equipo de pesaje, ¿qué paso es esencial?', ['Identificar el equipo y alcance, revisar condiciones de seguridad y seguir el procedimiento aplicable', 'Ajustarlo inmediatamente para ahorrar tiempo', 'Cambiar componentes sin registrar el estado inicial', 'Usar cualquier herramienta disponible'], 0],
    ['Después de un ajuste o mantenimiento, ¿qué evidencia permite verificar el resultado?', ['Pruebas funcionales y registros de resultados conforme al procedimiento', 'Una fotografía del vehículo', 'La firma de un compañero sin pruebas', 'El tiempo que tomó el trabajo'], 0],
    ['Si el instrumento presenta una lectura inestable durante la revisión, ¿qué corresponde?', ['Promediar lecturas hasta obtener una conveniente', 'Registrar la condición, comprobar causas posibles y documentar el diagnóstico', 'Ajustar el equipo sin revisar conexiones ni entorno', 'Declarar el equipo conforme por falta de tiempo'], 1],
    ['¿Qué debe contener el reporte de servicio?', ['Trabajo realizado, hallazgos, resultados, repuestos y pendientes relevantes', 'Solo la hora de llegada', 'Una descripción genérica sin resultados', 'Únicamente el nombre del cliente'], 0],
    ['Si no se cuenta con el procedimiento o patrón requerido para verificar un equipo, ¿qué debe hacer?', ['Continuar con una estimación personal', 'Consultar al responsable y no declarar resultados no verificados', 'Copiar los resultados de una visita anterior', 'Pedir al cliente que valide la medición'], 1],
  ],
  AUXTEC: [
    ['¿Cuál es una forma correcta de apoyar la preparación de un servicio?', ['Verificar herramientas y materiales indicados en la orden y reportar faltantes', 'Elegir herramientas sin informar al técnico', 'Retirar piezas del equipo antes de identificarlo', 'Cambiar el alcance de la visita'], 0],
    ['Durante una intervención, el auxiliar observa una condición insegura. ¿Qué debe hacer?', ['Continuar para no retrasar al técnico', 'Avisar de inmediato y seguir las indicaciones de seguridad', 'Esperar hasta llegar al taller', 'Resolverla por cuenta propia sin avisar'], 1],
    ['¿Qué corresponde al auxiliar si detecta un componente dañado?', ['Reemplazarlo por otro disponible sin autorización', 'Informar al técnico responsable y ayudar a documentar el hallazgo', 'Desecharlo sin registro', 'Ajustar el equipo para ocultar el daño'], 1],
    ['¿Cómo debe apoyar el cierre de un trabajo técnico?', ['Dejar herramientas y área ordenadas y apoyar el registro de materiales usados', 'Retirarse apenas termina la reparación', 'Guardar herramientas sin confirmar su estado', 'Cerrar la orden sin revisar con el técnico'], 0],
    ['Si el cliente solicita una modificación fuera del trabajo asignado, ¿qué debe hacer?', ['Ejecutarla de inmediato', 'Informar al técnico responsable para validar alcance y autorización', 'Prometer que se hará en la misma visita', 'Anotarla como trabajo terminado'], 1],
  ],
  DC: [
    ['¿Qué debe comprobarse antes de aprobar el uso de un procedimiento de trabajo?', ['Que sea la versión vigente, aprobada y aplicable a la actividad', 'Que tenga el formato más reciente aunque no esté aprobado', 'Que coincida con una copia personal', 'Que sea el documento más corto'], 0],
    ['¿Qué hace que un registro de calidad sea trazable?', ['Identificación del equipo o actividad, fecha, responsable y evidencia relacionada', 'Solo la firma del supervisor', 'Una nota sin fecha', 'El nombre del archivo'], 0],
    ['Al detectar una no conformidad repetida, ¿qué acción es más efectiva?', ['Corregir solo el caso visible', 'Investigar causa, definir acciones, responsables y verificar eficacia', 'Cerrar el registro para reducir pendientes', 'Cambiar el criterio de aceptación sin autorización'], 1],
    ['¿Qué se debe hacer con un documento obsoleto que aún está disponible en el área?', ['Identificarlo y retirarlo o controlarlo para evitar su uso accidental', 'Dejarlo junto a la versión vigente', 'Modificarlo manualmente', 'Usarlo mientras el equipo lo recuerde'], 0],
    ['¿Cómo se prepara una revisión interna de calidad?', ['Definiendo alcance y criterios, revisando evidencias y registrando hallazgos verificables', 'Basándose solo en comentarios informales', 'Anunciando únicamente las conclusiones', 'Revisando documentos sin comprobar su aplicación'], 0],
  ],
  MET: [
    ['Antes de usar un patrón o instrumento de referencia, ¿qué se debe verificar?', ['Identificación, estado, vigencia de calibración y condiciones de uso', 'Solo que encienda', 'Que tenga una etiqueta de cualquier color', 'Que el cliente lo haya usado recientemente'], 0],
    ['¿Qué aporta la trazabilidad metrológica de un resultado?', ['Una cadena documentada de calibraciones vinculada a referencias reconocidas', 'Que la lectura se repita dos veces', 'Que el resultado coincida con una factura', 'Que el instrumento sea nuevo'], 0],
    ['Si las condiciones ambientales exceden los límites del procedimiento, ¿qué procede?', ['Registrar y controlar la condición antes de continuar o reportar su impacto', 'Ignorarla si el valor parece razonable', 'Ajustar el resultado manualmente', 'Usar datos de otra fecha'], 0],
    ['¿Qué información debe conservarse de una verificación metrológica?', ['Método, equipo utilizado, condiciones, resultados e identificación del responsable', 'Solo el valor final', 'Únicamente el nombre del cliente', 'Una fotografía sin registro'], 0],
    ['¿Cómo se debe tratar un equipo de referencia fuera de vigencia?', ['Usarlo si parece funcionar', 'Retirarlo del uso previsto y gestionar su calibración o evaluación', 'Cambiar la fecha de la etiqueta', 'Prestarlo a otra área'], 1],
  ],
  AUXLAB: [
    ['Al recibir un instrumento para apoyar su evaluación, ¿qué debe verificarse?', ['Identificación, estado recibido y correspondencia con el registro de ingreso', 'Solo el color del estuche', 'El resultado esperado por el cliente', 'Únicamente el nombre del mensajero'], 0],
    ['¿Cómo se evita confundir equipos o documentos durante el trabajo de laboratorio?', ['Manteniendo identificación y registros asociados en cada etapa', 'Colocándolos juntos para ahorrar espacio', 'Retirando etiquetas temporalmente', 'Usando notas sin referencia'], 0],
    ['¿Qué debe hacer el auxiliar si nota daño o condición anormal en un equipo?', ['Informar al responsable y registrar el hallazgo antes de continuar', 'Limpiarlo y ocultar la condición', 'Intentar repararlo sin autorización', 'Completar el registro como recibido en buen estado'], 0],
    ['¿Cómo debe apoyar el control de herramientas y patrones del laboratorio?', ['Usar los identificados y autorizados y comunicar daños o vencimientos', 'Usar cualquiera disponible', 'Cambiar etiquetas sin autorización', 'Devolverlos sin verificar su identificación'], 0],
    ['Si recibe una instrucción que no coincide con el procedimiento vigente, ¿qué corresponde?', ['Detener la actividad y consultar al responsable antes de continuar', 'Seguir la instrucción verbal sin preguntar', 'Elegir el paso más rápido', 'Registrar el resultado como conforme'], 0],
  ],
});

function obtenerBanco(codigoPuesto) {
  return BANCOS_POR_PUESTO[codigoPuesto];
}

module.exports = { obtenerBanco };
