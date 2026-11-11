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
      instrucciones: 'Cada ejercicio vale 2 puntos. Muestre el cálculo o indique las diferencias solicitadas.',
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
      instrucciones: 'Responda en una o dos frases. Cada pregunta vale 2 puntos.',
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
      instrucciones: 'Use Excel o una hoja de cálculo y cree hojas Banco, Cartera, Caja y Control. Los saldos se expresan en quetzales. Corte al 30 de noviembre de 2026. Use los montos tal como aparecen, conserve las fórmulas y explique los supuestos.',
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
      instrucciones: 'En cada caso escriba qué haría primero, qué evidencia dejaría y a quién informaría. Cada caso vale 3 puntos.',
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

module.exports = { puestoCodigo, evaluacionAsistente };
