const puestoCodigo = 'ASISTADM';

const evaluacionAsistente = Object.freeze({
  titulo: 'Evaluación de asistente administrativo y contable',
  tiempo_total_minutos: 95,
  puntaje_total: 100,
  umbrales: {
    recomendable: 80,
    revision_adicional: 70,
    minimo_practica: 40,
    minimo_conocimientos: 14,
    minimo_valores: 10,
  },
  verificacion_en_vivo: {
    tiempo_minutos: 10,
    instrucciones: 'Verificación adicional del razonamiento y dominio de la hoja de cálculo; no suma puntos al total de 100.',
    actividades: [
      {
        solicitud: 'Pida explicar el origen de ambos saldos ajustados y mostrar una fórmula.',
        respuesta_esperada: 'Ambos saldos ajustados son Q13,400; banco = Q12,450 + Q1,250 − Q300 y libros = Q12,900 − Q150 + Q650.',
      },
      {
        solicitud: 'Cambie el abono confirmado de Cliente Norte de Q650 a Q750. Esta variación afecta solo la hoja Cartera.',
        respuesta_esperada: 'F-101 queda en Q700, el total de cartera en Q3,780 y el total vencido en Q1,680.',
      },
      {
        solicitud: 'Pida explicar cómo resolvería una diferencia detectada por Finanzas.',
        respuesta_esperada: 'Verifica fuentes y soportes, conserva trazabilidad, documenta la diferencia y escala la corrección para revisión/autorización; no altera evidencia.',
      },
    ],
  },
  secciones: [
    {
      id: 'aptitudes',
      nombre: 'Aptitudes de trabajo',
      tiempo_minutos: 15,
      puntaje_maximo: 10,
      instrucciones: 'Seleccione una alternativa por ejercicio. Cada pregunta vale hasta 2 puntos; puede realizar los cálculos en una hoja aparte.',
      items: [
        {
          enunciado: 'A1. Un proveedor cobra Q2,450. Hay un anticipo aplicado de Q600 y una nota de crédito de Q150. ¿Qué saldo queda?',
          rubrica: [
            { criterio: 'Aplica correctamente la deducción del anticipo.', puntos: 1 },
            { criterio: 'Aplica correctamente la nota de crédito y obtiene Q1,700.', puntos: 1 },
          ],
        },
        {
          enunciado: 'A2. Identifique las dos diferencias entre el documento y el registro. Documento D-0826, NIT ficticio 10308-2, Q1,908.75. Registro D-0862, NIT ficticio 10308-2, Q1,980.75.',
          rubrica: [
            { criterio: 'Identifica la diferencia entre D-0826 y D-0862.', puntos: 1 },
            { criterio: 'Identifica la diferencia entre Q1,908.75 y Q1,980.75.', puntos: 1 },
          ],
        },
        {
          enunciado: 'A3. Un saldo de Q840 baja 25 % por un abono. ¿Cuánto fue el abono y cuánto queda pendiente?',
          rubrica: [
            { criterio: 'Calcula el abono de Q210.', puntos: 1 },
            { criterio: 'Calcula el saldo pendiente de Q630.', puntos: 1 },
          ],
        },
        {
          enunciado: 'A4. A las 9:00 debe revisar una conciliación que toma 35 minutos y vence a las 10:00. Una factura requiere 20 minutos y vence a las 9:30. Solo puede hacer una tarea a la vez. Indique orden y horarios para cumplir ambas.',
          rubrica: [
            { criterio: 'Prioriza la factura antes de las 9:30.', puntos: 1 },
            { criterio: 'Propone horarios factibles: factura 9:00–9:20 y conciliación 9:20–9:55.', puntos: 1 },
          ],
        },
        {
          enunciado: 'A5. Localice el documento repetido y calcule el total contando cada documento una sola vez. F-14 Q240, F-15 Q380, F-14 Q240, F-16 Q125.',
          rubrica: [
            { criterio: 'Identifica F-14 como documento repetido.', puntos: 1 },
            { criterio: 'Calcula el total único de Q745.', puntos: 1 },
          ],
        },
      ],
    },
    {
      id: 'conocimientos',
      nombre: 'Conocimientos especializados',
      tiempo_minutos: 20,
      puntaje_maximo: 20,
      instrucciones: 'Seleccione la alternativa que describe el procedimiento contable correcto. Cada pregunta vale hasta 2 puntos.',
      items: [
        {
          enunciado: '1. ¿Qué cuentas cargaría y abonaría al registrar una venta a crédito? Omita impuestos en este ejercicio.',
          rubrica: [
            { criterio: 'Debe a clientes o cuentas por cobrar.', puntos: 1 },
            { criterio: 'Haber a ventas.', puntos: 1 },
          ],
        },
        {
          enunciado: '2. ¿Qué asiento registra al aplicar una transferencia confirmada a una factura de cliente?',
          rubrica: [
            { criterio: 'Debe a bancos.', puntos: 1 },
            { criterio: 'Haber a clientes o cuentas por cobrar, aplicado a la factura correcta.', puntos: 1 },
          ],
        },
        {
          enunciado: '3. ¿Cómo distingue una cuenta por cobrar vencida de una que aún está dentro del plazo?',
          rubrica: [
            { criterio: 'Compara la fecha de vencimiento con la fecha de corte.', puntos: 1 },
            { criterio: 'Confirma el saldo pendiente después de abonos y notas.', puntos: 1 },
          ],
        },
        {
          enunciado: '4. ¿Qué documentos coteja antes de preparar el pago de una compra de mercadería?',
          rubrica: [
            { criterio: 'Coteja la factura con la orden o compra aprobada.', puntos: 1 },
            { criterio: 'Verifica la recepción de la mercadería.', puntos: 1 },
          ],
        },
        {
          enunciado: '5. ¿Cómo trata en la conciliación un cheque emitido y registrado que todavía no aparece debitado por el banco?',
          rubrica: [
            { criterio: 'Lo identifica como cheque pendiente y lo resta del saldo del estado de cuenta.', puntos: 1 },
            { criterio: 'Reconoce que ya está registrado en libros y no propone duplicar el asiento.', puntos: 1 },
          ],
        },
        {
          enunciado: '6. ¿Qué hace si el efectivo contado más los comprobantes válidos queda por debajo del fondo de caja chica?',
          rubrica: [
            { criterio: 'Cuantifica y documenta la diferencia.', puntos: 1 },
            { criterio: 'Informa para investigación y validación antes de cualquier ajuste.', puntos: 1 },
          ],
        },
        {
          enunciado: '7. Un cliente devolvió parte de una venta facturada. ¿Qué documento gestionaría y qué respaldo pediría antes de emitirlo?',
          rubrica: [
            { criterio: 'Gestiona una nota de crédito vinculada a la factura de origen.', puntos: 1 },
            { criterio: 'Verifica la devolución y la autorización del flujo vigente.', puntos: 1 },
          ],
        },
        {
          enunciado: '8. En el cierre, ¿qué control haría para detectar una factura de proveedor registrada dos veces y qué evidencia entregaría al contador?',
          rubrica: [
            { criterio: 'Cruza identificador, proveedor, fecha y monto para detectar coincidencias.', puntos: 1 },
            { criterio: 'Entrega registros y soportes para corregir con trazabilidad.', puntos: 1 },
          ],
        },
        {
          enunciado: '9. En inventario aparecen 12 unidades registradas y 10 físicas. ¿Qué verifica antes de solicitar un ajuste?',
          rubrica: [
            { criterio: 'Recuenta y verifica corte, movimientos y soportes.', puntos: 1 },
            { criterio: 'Documenta la diferencia y deja el ajuste sujeto a aprobación.', puntos: 1 },
          ],
        },
        {
          enunciado: '10. Recibe una novedad de nómina sin autorización. ¿Cómo la documenta y a quién la remite antes de procesarla?',
          rubrica: [
            { criterio: 'Registra la novedad como pendiente y conserva su respaldo.', puntos: 1 },
            { criterio: 'La remite a RR. HH. o Finanzas para validación antes de procesarla.', puntos: 1 },
          ],
        },
      ],
    },
    {
      id: 'practica',
      nombre: 'Caso práctico de operación',
      tiempo_minutos: 45,
      puntaje_maximo: 55,
      instrucciones: 'Revise cada caso y seleccione la alternativa que integra los cálculos y controles correctos. Puede usar calculadora u hoja de cálculo. Los saldos se expresan en quetzales y el corte es al 30 de noviembre de 2026.',
      items: [
        {
          enunciado: 'P1. Conciliación bancaria · 15 puntos',
          detalle: 'Estado de cuenta: saldo Q12,450; incluye comisión Q150 y abono confirmado de Cliente Norte Q650, ambos pendientes de registro interno. Auxiliar de bancos: saldo Q12,900; incluye depósito en tránsito Q1,250 y cheque pendiente Q300, que todavía no aparecen en el banco. Muestre los dos saldos ajustados, explique cada diferencia y proponga los asientos. Aplique el abono de Q650 a F-101.',
          rubrica: [
            { criterio: 'Saldo ajustado del banco: Q12,450 + Q1,250 − Q300 = Q13,400.', puntos: 4 },
            { criterio: 'Saldo ajustado en libros: Q12,900 − Q150 + Q650 = Q13,400.', puntos: 4 },
            { criterio: 'Registra gasto bancario al debe y bancos al haber por Q150.', puntos: 2 },
            { criterio: 'Registra bancos al debe y cuentas por cobrar al haber por Q650.', puntos: 2 },
            { criterio: 'Explica que depósito en tránsito y cheque pendiente son partidas de tiempo sin nuevo asiento.', puntos: 3 },
          ],
        },
        {
          enunciado: 'P2. Cartera y cuentas por pagar · 15 puntos',
          detalle: 'F-101 · Cliente Norte · Q1,450 · vence 20 nov. 2026; F-102 · Cliente Centro · Q2,100 · vence 10 dic. 2026; F-103 · Cliente Sur · Q980 · vence 28 nov. 2026; C-201 · Proveedor Alfa · Q1,600 · vence 2 dic. 2026; C-202 · Proveedor Beta · Q950 · vence 29 nov. 2026. Aplique solo el abono confirmado de P1. Calcule saldo por factura, total de cartera y total vencido; ordene los pagos por vencimiento. C-202 carece de recepción confirmada: indique qué prepara, qué deja pendiente y por qué.',
          rubrica: [
            { criterio: 'Saldos correctos: F-101 Q800, F-102 Q2,100 y F-103 Q980.', puntos: 6 },
            { criterio: 'Total de cartera Q3,880 y vencido Q1,780.', puntos: 4 },
            { criterio: 'Ordena C-202 antes que C-201 por vencimiento.', puntos: 1 },
            { criterio: 'Deja C-202 pendiente hasta validar su recepción.', puntos: 2 },
            { criterio: 'Prepara C-201 sujeto a conciliación del duplicado y autorización de pago.', puntos: 2 },
          ],
        },
        {
          enunciado: 'P3. Arqueo de caja chica · 10 puntos',
          detalle: 'Fondo autorizado Q1,000. Efectivo contado Q410. Comprobantes válidos por Q280 y Q235. Hay un vale de Q75 sin firma ni comprobante. Cuantifique la diferencia sin respaldo válido y redacte el siguiente paso.',
          rubrica: [
            { criterio: 'Comprobantes válidos por Q515.', puntos: 2 },
            { criterio: 'Total respaldado Q925.', puntos: 2 },
            { criterio: 'Diferencia de Q75 sin respaldo válido.', puntos: 2 },
            { criterio: 'Documenta el vale pendiente y solicita respaldo.', puntos: 2 },
            { criterio: 'Informa al responsable y deja cualquier ajuste sujeto a revisión.', puntos: 2 },
          ],
        },
        {
          enunciado: 'P4. Control de documentos y facturación · 15 puntos',
          detalle: 'En compras hay dos entradas del proveedor ficticio Alfa con el mismo identificador FEL A-347, fecha y monto Q1,600; una está vinculada a C-201. En ventas hay una solicitud de nota de crédito de Q320 por devolución, con factura de origen F-099 y recepción de bodega, pendiente de autorización. OS-301: reporte completo y aprobado, orden de compra y datos fiscales verificados; envío por correo. OS-302: falta el reporte de servicio firmado exigido por el cliente; factura por portal. OS-303: factura emitida y cargada al portal, rechazada por falta del número de orden de compra. Registre estado, acción, responsable, fecha de seguimiento y evidencia de cierre; determine qué avanza y qué queda pendiente. Redacte el correo de OS-301, anote la constancia que guardaría para OS-302 y OS-303, e identifique una factura vencida de P2 para redactar un mensaje de cobro y registrar la próxima gestión.',
          rubrica: [
            { criterio: 'Registra el duplicado A-347, conserva evidencia y bloquea el doble pago.', puntos: 2 },
            { criterio: 'Vincula la nota de crédito a F-099 y la devolución; deja pendiente la autorización.', puntos: 2 },
            { criterio: 'OS-301 está lista según autorización; redacta un correo claro con factura y referencia.', puntos: 3 },
            { criterio: 'OS-302 queda pendiente, solicita el reporte a Operaciones y prevé guardar acuse al completar el expediente.', puntos: 2 },
            { criterio: 'OS-303 investiga el rechazo, valida la OC, corrige por el procedimiento y conserva nuevo acuse sin duplicar la emisión.', puntos: 2 },
            { criterio: 'Bitácora con estado, responsable, próxima fecha y evidencia.', puntos: 2 },
            { criterio: 'Mensaje de cobro con factura vencida, saldo verificado y próxima gestión.', puntos: 2 },
          ],
        },
      ],
    },
    {
      id: 'valores',
      nombre: 'Valores y juicio laboral',
      tiempo_minutos: 15,
      puntaje_maximo: 15,
      instrucciones: 'En cada caso seleccione la respuesta que mejor protege la integridad, la confidencialidad y los controles. Cada caso vale hasta 3 puntos.',
      items: [
        {
          enunciado: 'V1. Un compañero pide cambiar la fecha de un comprobante para que el cierre cuadre.',
          rubrica: [
            { criterio: 'Mantiene la fecha real.', puntos: 1 },
            { criterio: 'Conserva el comprobante y la solicitud.', puntos: 1 },
            { criterio: 'Informa a Finanzas.', puntos: 1 },
          ],
        },
        {
          enunciado: 'V2. Un proveedor conocido solicita cambiar la cuenta bancaria por un mensaje urgente.',
          rubrica: [
            { criterio: 'Detiene el cambio y valida por un canal conocido.', puntos: 1 },
            { criterio: 'Guarda la solicitud y la verificación.', puntos: 1 },
            { criterio: 'Remite a quien autoriza cuentas o pagos.', puntos: 1 },
          ],
        },
        {
          enunciado: 'V3. Un cliente pide por correo la planilla de personal para agilizar el ingreso de técnicos a su planta.',
          rubrica: [
            { criterio: 'Protege la planilla y solicita autorización para compartir solo lo necesario.', puntos: 1 },
            { criterio: 'Registra la solicitud con acceso restringido.', puntos: 1 },
            { criterio: 'Consulta a RR. HH.', puntos: 1 },
          ],
        },
        {
          enunciado: 'V4. Descubre un error propio en un reporte de cartera que ya fue enviado a Gerencia.',
          rubrica: [
            { criterio: 'Corrige y notifica oportunamente.', puntos: 1 },
            { criterio: 'Conserva el original y la versión corregida.', puntos: 1 },
            { criterio: 'Informa a Finanzas y a quienes recibieron el reporte.', puntos: 1 },
          ],
        },
        {
          enunciado: 'V5. Un proveedor ofrece un obsequio personal si programa su pago antes que los demás.',
          rubrica: [
            { criterio: 'Declina el obsequio y mantiene el orden de pagos.', puntos: 1 },
            { criterio: 'Registra la oferta y el contexto.', puntos: 1 },
            { criterio: 'Informa a su jefatura.', puntos: 1 },
          ],
        },
      ],
    },
  ],
});

function establecerOpciones(seccionId, indice, textos, indiceCorrecto, puntajeMaximo, indiceParcial, puntajeParcial) {
  const seccion = evaluacionAsistente.secciones.find((item) => item.id === seccionId);
  seccion.items[indice].opciones = textos.map((texto, opcionIndice) => ({
    id: String.fromCharCode(65 + opcionIndice),
    texto,
    puntos: opcionIndice === indiceCorrecto
      ? puntajeMaximo
      : opcionIndice === indiceParcial ? puntajeParcial : 0,
    correcta: opcionIndice === indiceCorrecto,
  }));
}

function conCorrectaEn(textos, indiceCorrecto) {
  const opciones = [...textos];
  const correcta = opciones.shift();
  opciones.splice(indiceCorrecto, 0, correcta);
  return opciones;
}

function indiceDistractor(indiceCorrecto, numeroDistractor) {
  const indiceOriginal = numeroDistractor - 1;
  return indiceOriginal >= indiceCorrecto ? indiceOriginal + 1 : indiceOriginal;
}

const aptitudes = [
  ['Q1,700.', 'Q1,850.', 'Q2,300.', 'Q2,000.'],
  ['D-0826 frente a D-0862 y Q1,908.75 frente a Q1,980.75.', 'Solo cambia el número de documento.', 'Solo cambia el NIT.', 'No hay diferencias.'],
  ['Abono Q210; saldo Q630.', 'Abono Q630; saldo Q210.', 'Abono Q168; saldo Q672.', 'Abono Q25; saldo Q815.'],
  ['Factura 9:00–9:20 y conciliación 9:20–9:55.', 'Conciliación 9:00–9:35 y factura 9:35–9:55.', 'Factura 9:00–9:20 y conciliación 9:40–10:15.', 'Conciliación 9:00–9:35 y factura 9:35–9:55; ambas cumplen sus vencimientos.'],
  ['F-14 está repetida; total único Q745.', 'F-15 está repetida; total Q985.', 'F-14 está repetida; total Q985.', 'No hay duplicados; total Q985.'],
];
aptitudes.forEach((textos, indice) => {
  const indiceCorrecto = (indice + 1) % 4;
  establecerOpciones(
    'aptitudes',
    indice,
    conCorrectaEn(textos, indiceCorrecto),
    indiceCorrecto,
    2,
    indiceDistractor(indiceCorrecto, 1),
    1,
  );
});

const conocimientos = [
  ['Debe a clientes/cuentas por cobrar y haber a ventas.', 'Debe a ventas y haber a bancos.', 'Debe a bancos y haber a clientes.', 'Debe a inventario y haber a proveedores.'],
  ['Debe a bancos y haber a cuentas por cobrar, aplicada a la factura correcta.', 'Debe a cuentas por cobrar y haber a bancos.', 'Debe a caja y haber a ventas.', 'Debe a bancos y haber a ingresos sin identificar.'],
  ['Compara vencimiento con fecha de corte y confirma saldo tras abonos y notas.', 'Compara únicamente el monto original de la factura.', 'Considera vencida toda factura del mes.', 'Compara la fecha de emisión con la fecha de pago.'],
  ['Factura, compra aprobada y recepción de mercadería.', 'Solo la cotización del proveedor.', 'Factura y correo de solicitud de pago.', 'Solo el comprobante de transferencia.'],
  ['Lo resta del saldo bancario como partida pendiente; no duplica el asiento en libros.', 'Lo vuelve a registrar como gasto bancario.', 'Lo suma al saldo del banco.', 'Lo elimina del auxiliar contable.'],
  ['Cuantifica y documenta la diferencia; informa para investigación antes de ajustar.', 'Repone el faltante con dinero propio sin informar.', 'Registra el vale como comprobante válido.', 'Ajusta el fondo para que coincida.'],
  ['Gestiona nota de crédito ligada a la factura y verifica devolución y autorización.', 'Anula todas las facturas del cliente.', 'Emite una factura nueva por el monto devuelto.', 'Registra el cambio sin soporte.'],
  ['Cruza proveedor, identificador, fecha y monto; conserva soportes para corregir con trazabilidad.', 'Borra uno de los registros sin dejar nota.', 'Compara solo los montos y paga ambos.', 'Cambia el número de factura manualmente.'],
  ['Recuenta, revisa corte, movimientos y soportes; documenta y sujeta el ajuste a aprobación.', 'Ajusta de inmediato el sistema a 10 unidades.', 'Ignora la diferencia si es menor.', 'Solicita al proveedor que cambie el inventario registrado.'],
  ['Registra la novedad pendiente y la remite a RR. HH. o Finanzas para validación.', 'La procesa para no retrasar nómina.', 'La autoriza en nombre de su jefatura.', 'La elimina sin conservar evidencia.'],
];
conocimientos.forEach((textos, indice) => {
  const indiceCorrecto = (indice + 2) % 4;
  establecerOpciones('conocimientos', indice, conCorrectaEn(textos, indiceCorrecto), indiceCorrecto, 2, -1, 0);
});

const practica = [
  ['Banco ajustado Q13,400 y libros Q13,400; registra comisión Q150 y abono Q650; depósito y cheque son partidas de tiempo sin nuevo asiento.', 'Banco Q13,100 y libros Q13,400; registra también el depósito en tránsito como nuevo ingreso.', 'Banco Q14,000 y libros Q12,900; no registra la comisión ni el abono.', 'Banco Q13,400 y libros Q13,400; registra de nuevo el depósito y el cheque en el diario.'],
  ['F-101 Q800, F-102 Q2,100, F-103 Q980; cartera Q3,880, vencido Q1,780; C-202 vence primero pero queda pendiente por falta de recepción.', 'Cartera Q4,530 y vencido Q2,430; paga C-202 aunque no tenga recepción.', 'F-101 Q1,450, cartera Q4,530; considera vencidas todas las facturas.', 'Cartera Q3,880 y vencido Q1,780; procesa C-202 sin validar recepción.'],
  ['Respaldado Q925; faltan Q75 válidos; documenta el vale pendiente, solicita soporte e informa antes de ajustar.', 'Respaldado Q1,000; el vale firmado no requiere comprobante.', 'Respaldado Q850; repone Q150 sin reportar.', 'Respaldado Q925; registra el vale como gasto válido y cierra el arqueo.'],
  ['Bloquea el duplicado; deja nota de crédito pendiente de autorización; avanza OS-301; solicita soporte para OS-302 y corrige OS-303 conservando acuses y bitácora.', 'Paga ambas facturas A-347 y emite la nota de crédito sin autorización.', 'Emite OS-302 sin el reporte firmado y vuelve a emitir OS-303 sin verificar la OC.', 'Detiene todas las órdenes y elimina los registros de rechazo para evitar duplicados.'],
];
const puntajesPractica = [15, 15, 10, 15];
practica.forEach((textos, indice) => {
  const indiceCorrecto = indice % 2 === 0 ? 2 : 1;
  const numeroDistractorParcial = indice === 1 ? 3 : -1;
  establecerOpciones(
    'practica',
    indice,
    conCorrectaEn(textos, indiceCorrecto),
    indiceCorrecto,
    puntajesPractica[indice],
    numeroDistractorParcial === -1 ? -1 : indiceDistractor(indiceCorrecto, numeroDistractorParcial),
    numeroDistractorParcial === -1 ? 0 : Math.floor(puntajesPractica[indice] / 2),
  );
});

const valores = [
  ['Mantiene la fecha real, conserva comprobante y solicitud, e informa a Finanzas.', 'Cambia la fecha y avisa solo si alguien pregunta.', 'Corrige el archivo y elimina la evidencia inicial.', 'Pide al compañero que confirme el cambio verbalmente.'],
  ['Detiene el cambio, valida por canal conocido, conserva evidencia y consulta a quien autoriza pagos.', 'Actualiza la cuenta usando el mensaje urgente.', 'Confirma con el mismo número indicado en el mensaje y ejecuta el cambio.', 'Rechaza el cambio pero no registra ni informa la solicitud.'],
  ['Protege la planilla, registra la solicitud y consulta a RR. HH. para compartir solo lo autorizado y necesario.', 'Envía la planilla completa porque el cliente la pidió.', 'Comparte una captura parcial sin autorización.', 'Sube la planilla a un enlace público para agilizar el acceso.'],
  ['Notifica el error, conserva original y corrección e informa a Finanzas y a quienes recibieron el reporte.', 'Reemplaza el archivo enviado sin avisar.', 'Espera al siguiente cierre para corregirlo.', 'Elimina el reporte anterior y no documenta el cambio.'],
  ['Declina el obsequio, mantiene el orden de pagos, registra la oferta e informa a su jefatura.', 'Acepta el obsequio si el pago ya estaba programado.', 'Programa primero el pago y comenta la oferta informalmente.', 'Rechaza el obsequio pero altera el orden de pago para evitar conflicto.'],
];
valores.forEach((textos, indice) => {
  const indiceCorrecto = (indice + 3) % 4;
  const numeroDistractorParcial = indice === 1 || indice === 4 ? 3 : -1;
  establecerOpciones(
    'valores',
    indice,
    conCorrectaEn(textos, indiceCorrecto),
    indiceCorrecto,
    3,
    numeroDistractorParcial === -1 ? -1 : indiceDistractor(indiceCorrecto, numeroDistractorParcial),
    numeroDistractorParcial === -1 ? 0 : 1,
  );
});

module.exports = { puestoCodigo, evaluacionAsistente };
