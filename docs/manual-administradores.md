# Manual de usuario · Administradores

**Sistema:** SURTIBÁSCULAS S.A. · Plataforma de gestión  
**Versión:** Noviembre 2026 · plantillas vigentes sin versionado
**Público objetivo:** cuentas con rol `ADMIN`, especialmente `SUR-GG-001` y `SUR-AC-002`.

Este manual describe cómo usar la plataforma desde una cuenta administradora. Las capturas muestran datos genéricos de demostración para que se aprecie cada pantalla completa; no corresponden a información real del personal. Las operaciones que afectan a evaluaciones, selección de personal y datos de empleados deben realizarse con criterio confidencial: la información de currículums, resultados y credenciales es de uso interno.

---

## 1. Acceso al sistema

1. Abre la URL de la plataforma.
2. En la pantalla de inicio de sesión deja desactivada la opción **Candidato**.
3. Escribe tu **código de empleado** y tu **contraseña**.
4. Pulsa **Ingresar**.
5. Según tu rol, el sistema te lleva a:
   - `ADMIN`: `/admin`.
   - `RRHH`: `/rrhh`.
   - Empleado: `/dashboard`.
   - Candidato: `/seleccion-candidato`.

Si tu cuenta es `ADMIN` pero no aparece el menú completo, cierra sesión y vuelve a ingresar. Los permisos se refrescan desde la base de datos en cada inicio de sesión.

### Cuentas con permisos especiales

| Permiso | Cuentas |
|---|---|
| Administración general | Todas las cuentas con rol `ADMIN` |
| Evaluación de personal, evaluaciones mensuales y pruebas de selección | Solo `SUR-GG-001` y `SUR-AC-002` |
| Portal del candidato | Usuarios `CANDIDATO-AAAA-NNN` creados desde Pruebas de selección |

Si intentas abrir una ruta sin permiso, el sistema te devuelve al inicio o muestra un error de acceso. No intentes eludirlo: la autorización también se valida en el backend.

### Apariencia y cierre de sesión

- El selector de tema permite usar modo claro, oscuro o el del dispositivo. La preferencia se guarda en el navegador.
- Para salir, abre el perfil en la barra superior y pulsa **Cerrar sesión**.
- Si vas a usar una computadora compartida, cierra sesión siempre.

---

## 2. Estructura de la interfaz

La barra lateral izquierda reúne los módulos disponibles para tu cuenta:

| Módulo | Ruta | Uso principal |
|---|---|---|
| Dashboard | `/admin` | Indicadores del día y actividad reciente |
| Empleados | `/admin/empleados` | Directorio de personal, altas, ediciones y bajas |
| Control de asistencia | `/rrhh` | Marcaciones, incidencias y reportes |
| Evaluación de personal | `/evaluaciones` | Evaluaciones generales del personal |
| Evaluaciones mensuales | `/admin/evaluaciones-conocimiento` | Banco de preguntas y resultados mensuales |
| Pruebas de selección | `/admin/evaluaciones-seleccion` | Candidatos, plantillas editables y resultados |
| Sugerencias | `/admin/sugerencias` | Buzón de sugerencias del personal |

La barra superior identifica el módulo actual y muestra el nombre del usuario. Los mensajes de éxito, error y advertencia aparecen como alertas dentro de la página; léelos antes de repetir una acción.

---

## 3. Dashboard administrativo

Ruta: `/admin`.

Es la pantalla de entrada. Muestra la fecha actual, un botón **Actualizar** y cuatro indicadores:

| Indicador | Qué significa |
|---|---|
| Empleados activos | Total de activos, con el dato de inactivos |
| Presentes hoy | Personas con marcación registrada hoy |
| Puntualidad | `(marcaciones de hoy − atrasos) / marcaciones × 100`; es `0%` si no hay marcaciones |
| Sugerencias nuevas | Pendientes de responder, con el total al lado |

Además incluye:

- Gráfico de asistencia de los últimos siete días: marcaciones contra atrasos.
- Ranking de los puestos más numerosos, con un máximo de seis y enlace **Ver personal**.
- Panel **Pendientes** con accesos a sugerencias sin responder, incidencias vigentes y, si tu cuenta tiene permiso de evaluaciones, evaluaciones mensuales y candidatos en registro.
- Actividad reciente de los últimos seis eventos, con fecha y hora de actualización.
- Accesos rápidos a los módulos principales.

**Acciones disponibles:**

1. Pulsa **Actualizar** para refrescar los datos; el botón se deshabilita mientras carga.
2. Si aparece un error, pulsa **Reintentar**.
3. Usa los enlaces del panel para abrir el módulo que necesites.

No hay formularios ni acciones destructivas en esta pantalla. «Incidencias vigentes» cuenta las que cubren el día actual. Los bloques de evaluación solo aparecen para `SUR-GG-001` y `SUR-AC-002`.

---

## 4. Administración de empleados

Ruta: `/admin/empleados`.

Muestra el total de empleados registrados y activos, un buscador y una tabla con empleado, puesto, rol, estado y acciones.

### Buscar

Escribe código, nombre, puesto o rol en el buscador. El filtro es instantáneo. Si no hay coincidencias verás: «No hay empleados que coincidan con la búsqueda.».

### Dar de alta

1. Pulsa **Agregar empleado**.
2. Completa nombre completo (2 a 100 caracteres), puesto y contraseña inicial del empleado (6 a 72 caracteres).
3. Escribe tu **contraseña de administrador** para confirmar.
4. Pulsa **Registrar empleado**.

El código de acceso se genera automáticamente con el formato `SUR-<abreviatura>-###`. El alta siempre crea la cuenta con rol **Empleado** y su primer horario. Si no hay puestos configurados, el botón permanece deshabilitado.

### Editar

1. Pulsa el ícono de lápiz en la fila del empleado.
2. Modifica nombre y puesto, si corresponde.
3. Si quieres cambiar la contraseña, escríbela en el campo nuevo; si lo dejas vacío, se conserva la actual.
4. Marca o desmarca **Acceso activo**.
5. Confirma con tu contraseña de administrador y pulsa **Guardar cambios**.

**Cuidado con el puesto:** al cambiarlo también cambia el código con el que el empleado inicia sesión. El sistema lo advierte en pantalla. En cuentas ADMIN el campo Puesto está deshabilitado para no alterar su código ni sus permisos.

### Dar de baja

1. Pulsa el ícono de papelera.
2. Lee el aviso de desactivación.
3. Confirma con tu contraseña de administrador.
4. Pulsa **Confirmar baja**.

La baja es lógica: se conservan asistencia y evaluaciones.

### Cuentas protegidas

- No puedes editar ni dar de baja tu propia cuenta.
- No puedes editar ni dar de baja otras cuentas ADMIN.
- Excepción: `SUR-GG-001` puede editar solo el perfil de `SUR-AC-002` (nombre, contraseña y estado; nunca el puesto).
- El backend impide dar de baja a cualquier ADMIN.

Tu contraseña se verifica en cada alta, edición o baja. Si es incorrecta verás: «La contraseña del administrador es incorrecta.». Los modales se cierran con X, Escape o clic fuera solo cuando no se está guardando.

---

## 5. Control de asistencia

Ruta: `/rrhh`.

Permite consultar marcaciones, corregir registros, registrar incidencias y exportar reportes.

### Filtrar el reporte

1. Escribe un código o nombre en el buscador.
2. Indica las fechas **Desde** y **Hasta**.
3. Pulsa **Filtrar**.
4. Pulsa **Limpiar** para volver al estado inicial.

La tabla muestra empleado, puesto, fecha, entrada con estado (Puntual/Atraso), salida con estado (Normal/Anticipada o Pendiente) y un lápiz de corrección.

### Corregir una marcación

1. Pulsa el lápiz en la fila correspondiente.
2. Elige qué marcación corregir: **Hora de entrada** o **Hora de salida**.
3. Indica la nueva fecha y hora.
4. Escribe un motivo de al menos 4 caracteres.
5. Guarda.

### Registrar una incidencia

1. Pulsa **Nueva incidencia**.
2. Selecciona un empleado activo.
3. Indica fechas **Desde** y **Hasta**.
4. Elige el tipo: permiso oficial, ausencia justificada, suspensión o vacaciones.
5. Escribe el motivo, de al menos 4 caracteres.
6. Guarda.

La fecha inicial no puede ser posterior a la final. Los cambios se aplican de inmediato: no hay confirmación previa ni se pide contraseña de administrador. Por eso revisa dos veces empleado, fecha y motivo.

### Exportar a Excel

Pulsa **Exportar Excel** para descargar `reporte-surtibasculas.xlsx`. Incluye las hojas **Asistencias** e **Incidencias** y respeta los filtros activos.

Toda corrección queda registrada en auditoría con valores anteriores y nuevos, usuario que modifica y motivo. Las horas se muestran en formato `HH:mm` y las fechas en español, zona `America/Guatemala`.

---

## 6. Evaluación de personal

Ruta: `/evaluaciones`.

Disponible solo para `SUR-GG-001` y `SUR-AC-002`. Es una calificación manual del supervisor: cinco criterios generales con escala del 1 (bajo) al 5 (destacado). No genera preguntas ni calcula aprobado o reprobado.

### Registrar una evaluación

1. Selecciona al empleado en el desplegable. Se muestra como `código · nombre — puesto`.
2. Revisa el bloque de referencia de **asistencia de los últimos 30 días**: puntualidad, días registrados y atrasos. Es orientativo; no se guarda ni se usa en la nota.
3. Indica la fecha de evaluación; por defecto es hoy.
4. Escribe el periodo evaluado, hasta 100 caracteres. Por defecto aparece mes y año en español, por ejemplo `noviembre de 2026`.
5. Califica los cinco criterios: Presentación, Desempeño del trabajo, Información hacia el cliente, Puntualidad y Conocimientos.
6. Si lo deseas, agrega una observación por criterio, de hasta 1000 caracteres.
7. Agrega comentarios generales, de hasta 5000 caracteres.
8. Si el empleado es `SUR-JM-005` (Jefe de Mantenimiento), completa los **9 criterios especializados**: supervisión, liderazgo de campo, calibración, recursos e inventario, atención técnica, liderazgo de personal, decisiones bajo presión, análisis diagnóstico y organización/planificación. Todos son obligatorios y usan la misma escala 1–5.
9. Pulsa **Guardar evaluación**.

El evaluador queda registrado automáticamente con tu usuario.

### Consultar el historial

La tabla **Evaluaciones registradas** muestra empleado, puesto, periodo, fecha, promedio sobre 5 y un botón **Ver detalle**. El promedio corresponde solo a los cinco criterios generales; no incluye los nueve de jefatura.

Al seleccionar un empleado se filtra el historial. Al dejarlo vacío se muestran todas las evaluaciones. **Ver detalle** despliega notas, observaciones, comentarios y competencias especializadas si aplica.

**Advertencias:**

- Cada envío crea un registro nuevo: no hay edición ni eliminación de evaluaciones guardadas.
- No hay control de duplicados por empleado y periodo; el periodo es texto libre.
- Después de guardar, el formulario se reinicia y el filtro por empleado se pierde.
- La puntualidad de 30 días es una ayuda para calificar, no un cálculo automático.

---

## 7. Evaluaciones mensuales de conocimiento

Ruta: `/admin/evaluaciones-conocimiento`.

Disponible solo para `SUR-GG-001` y `SUR-AC-002`. Cada empleado responde una evaluación por mes según su puesto activo. Es independiente de las pruebas de selección.

### Panel administrativo

Los indicadores se calculan para el periodo actual:

| Indicador | Significado |
|---|---|
| Periodo actual | Mes devuelto por el servidor y total de evaluaciones asignadas |
| Pendientes | Evaluaciones del mes aún sin responder |
| Cumplimiento | Completadas entre totales del mes, en porcentaje |
| Promedio de conocimiento | Media de porcentajes de evaluaciones completadas; muestra `—` si no hay ninguna |

La tabla muestra empleado, puesto y departamento, periodo, puntos obtenidos y totales, porcentaje, resultado, estado y botón **Ver respuestas**, habilitado solo para evaluaciones completadas.

Puedes filtrar por empleado, puesto y departamento. Los departamentos son una clasificación asignada a los puestos, no una estructura organizacional independiente.

**Atención:** consultar el panel tiene efecto de escritura. Al listar, el sistema habilita automáticamente las evaluaciones pendientes del mes para los empleados activos. El servidor usa `INSERT IGNORE`, por lo que no duplica la evaluación del mes aunque el empleado también abra su portal. Si un puesto no tiene preguntas en el banco, ese empleado no aparece como pendiente.

### Ver respuestas

El detalle muestra cada pregunta, la opción elegida, la correcta, los puntos de cada opción y el puntaje máximo. Incluye un resumen porcentual, el total de respuestas correctas y una barra de evolución mensual del empleado.

El resultado se calcula al entregar: puntos obtenidos entre puntos posibles. Con **70% o más** se marca **Aprobado**; de lo contrario, **Requiere refuerzo**. Una evaluación entregada no puede enviarse de nuevo.

### Banco de preguntas por puesto

1. Entra a **Banco de preguntas por puesto** y elige el puesto.
2. Para agregar una pregunta, escribe el texto, hasta 1000 caracteres.
3. Define el puntaje máximo: mayor que 0, hasta `9999.99`, con máximo dos decimales.
4. Agrega entre 2 y 10 opciones, de hasta 300 caracteres cada una.
5. Asigna el tipo de cada opción:
   - **Correcta · puntaje completo**: 100% del máximo. Debe haber exactamente una.
   - **Intermedia · puntaje parcial**: porcentaje entero de 1 a 99; los puntos deben quedar entre 0 y el máximo. Se redondea a 2 decimales.
   - **Incorrecta · 0 puntos**.
6. Guarda. Para editar, carga la pregunta en el mismo editor; para eliminar, confirma la acción.

El máximo es 255 preguntas por puesto y el mínimo una. El botón Eliminar se deshabilita cuando solo queda una pregunta.

**Regla importante:** cualquier cambio en el banco reescribe el cuestionario de todas las evaluaciones **pendientes** del mes para ese puesto y actualiza `total_preguntas`. Las evaluaciones **completadas** conservan su copia original: no se recalculan. Haz los cambios antes de que los empleados respondan y pídeles recargar si estaban respondiendo en ese momento.

---

## 8. Pruebas de selección

Ruta: `/admin/evaluaciones-seleccion`.

Disponible solo para `SUR-GG-001` y `SUR-AC-002`. Este módulo es independiente de la evaluación mensual: no comparte registros ni puntajes.

### Conceptos clave

| Concepto | Significado |
|---|---|
| Plantilla | Configuración editable y vigente de la prueba de un puesto |
| Guardar cambios | Actualizar la plantilla vigente; la usarán los nuevos intentos |
| Activar/desactivar | Permitir o suspender el uso de la plantilla editable |
| Intento | Entrega realizada por un candidato; guarda una copia de la prueba usada |
| Baja lógica | Desactivar una cuenta conservando su historial |
| Reintento | Nueva oportunidad autorizada por ADMIN y con motivo registrado |

### Orden recomendado de trabajo

1. Verificar que la plantilla del puesto esté disponible. Si solo existe la prueba base, el candidato usará esa configuración.
2. Crear la cuenta del candidato y asignarle el puesto.
3. Entregar las credenciales al candidato por un canal privado.
4. El candidato completa su perfil, adjunta el currículum PDF de máximo 5 MB y entrega la prueba.
5. Revisa pendientes, resultados y, si procede, autoriza un reintento.

### 8.1 Configuración de pruebas por puesto

En la sección **1. Configuración de pruebas** hay una fila por puesto con su configuración, fecha de actualización y estado (`Disponible` o `Desactivada`).

**Crear la plantilla editable:**

1. Localiza el puesto en la tabla.
2. Si en **Configuración** aparece `Prueba base del sistema`, pulsa **Personalizar prueba**.
3. El sistema copia la configuración vigente a una plantilla editable.
4. Verifica que los datos coincidan con la prueba anterior antes de editar.
5. Si ya existe una plantilla, pulsa **Administrar prueba** para abrir el editor.

**Editar una plantilla:**

1. Modifica los campos generales: título, duración total en minutos y puntaje máximo total.
2. Ajusta los umbrales `recomendable`, `revision_adicional`, `minimo_practica`, `minimo_conocimientos` y `minimo_valores`.
3. Por cada sección ajusta nombre, tiempo asignado, puntaje máximo e instrucciones para el candidato.
4. Por cada pregunta ajusta enunciado, información adicional, opciones, puntaje máximo y tipo de respuesta: **Correcta**, **Intermedia** o **Incorrecta**. Las opciones intermedias permiten indicar el porcentaje del puntaje que otorgan.
5. Revisa la rúbrica interna de calificación de cada pregunta.
6. Modifica las actividades de verificación en vivo si aplica. No suman puntos al total.
7. Pulsa **Guardar cambios**.

**Reglas de validación:**

- Debe haber exactamente cuatro secciones: aptitudes, conocimientos, práctica y valores.
- Cada sección necesita al menos una pregunta.
- Cada pregunta necesita al menos dos opciones y **exactamente una correcta**.
- Los puntos no pueden ser negativos.
- Los umbrales deben estar entre 0 y el puntaje total.
- El umbral `recomendable` no puede ser menor que `revision_adicional`.

Solo puedes guardar si no hay errores de validación ni cambios sin guardar. Al cerrar el editor se descartan los cambios pendientes.

**Aplicar los cambios:**

1. Termina de editar y pulsa **Guardar cambios**.
2. Revisa el cuadernillo en la sección **5. Cuadernillo y guía interna**.
3. No hay publicación por pasos: desde ese momento los nuevos intentos usan la prueba guardada.

Los intentos ya entregados conservan en su registro una copia de la definición con la que se calificaron; un cambio posterior no modifica esos resultados.

**Activar o desactivar:**

- Pulsa **Desactivar prueba** para suspender temporalmente la plantilla personalizada. Los candidatos volverán a usar la configuración base del puesto.
- Pulsa **Activar prueba** para volver a usar la plantilla editable.

### 8.2 Crear cuentas de candidato

En la sección **2. Acceso de aspirantes**:

1. Selecciona el **puesto al que aspira**.
2. Pulsa **Crear cuenta y contraseña**.
3. El sistema genera un usuario con formato `CANDIDATO-AAAA-NNN` y una contraseña aleatoria.
4. Copia las credenciales con **Copiar credenciales** y entrégalas al candidato por un canal privado.

**La contraseña se muestra una sola vez.** Si la pierdes, no puedes recuperarla desde el panel; crea una cuenta nueva o solicita un restablecimiento controlado al responsable de la base de datos.

### 8.3 Seguimiento de cuentas y pruebas pendientes

En la sección **3. Seguimiento de aspirantes** se muestran cuentas sin perfil completo y pruebas pendientes.

**Acciones disponibles:**

| Acción | Cuándo usarla | Efecto |
|---|---|---|
| Editar | Corregir nombres, apellidos, fecha de nacimiento, puesto o currículum | Actualiza el perfil y registra auditoría |
| CV | Descargar el currículum PDF | Revisión documental interna |
| Reintento | El candidato debe volver a presentar la prueba | Conserva el intento anterior y pide un motivo |
| Dar de baja | El candidato ya no debe ingresar | Bloquea el login; conserva historial |
| Reactivar | Se autoriza nuevamente el acceso | Restaura la cuenta y quita la marca de archivado |
| Eliminar | Solo cuentas sin intentos ni resultados | Borra cuenta y perfil de forma definitiva |

**Editar perfil:**

1. Pulsa **Editar** en la fila del candidato.
2. Ajusta nombres, apellidos, fecha de nacimiento y puesto.
3. Opcionalmente reemplaza el currículum con un PDF de máximo 5 MB.
4. Pulsa **Guardar perfil**.

No se puede cambiar el puesto después de registrar un intento. Si el puesto es incorrecto, dé de baja la cuenta y crea una nueva.

**Autorizar un reintento:**

1. Pulsa **Reintento**.
2. Escribe un motivo de 1 a 500 caracteres.
3. Pulsa **Confirmar reintento**.
4. Verifica que el candidato figure nuevamente como prueba pendiente.

El motivo queda en el historial. No autorices reintentos sin una razón documentada.

**Baja, reactivación y eliminación:**

- **Dar de baja** es la opción preferida: el candidato deja de ingresar, pero su historial permanece.
- **Reactivar** deshace la baja.
- **Eliminar** solo se permite si la cuenta no tiene intentos ni resultados. Si tiene historial, usa la baja lógica.

### 8.4 Resultados

En la sección **4. Historial** se listan hasta los 250 resultados más recientes: automáticos y anteriores registrados manualmente. Se puede filtrar por puesto.

Cada fila muestra candidato y edad, puesto, fecha, calificación sobre 100, aciertos y porcentaje, decisión, número de intento y motivo de reintento, si aplica. Las evaluaciones manuales antiguas aparecen como intento «Anterior» y no tienen conteo de aciertos.

| Decisión | Criterio general |
|---|---|
| Recomendable para el puesto | Total ≥ umbral recomendable y mínimos de práctica, conocimientos y valores cumplidos |
| Revisión adicional | Total entre el umbral de revisión y el recomendable, con mínimos cumplidos |
| Competencia aún no demostrada | Total menor al umbral de revisión o algún mínimo incumplido |

Desde aquí también puedes pulsar **Autorizar reintento** si el resultado es automático, es el intento más reciente y el candidato está en estado `completada` o `evaluada`. El motivo queda registrado en el historial.

### 8.5 Cuadernillo y guía interna

En la sección **5. Cuadernillo y guía interna**:

1. Selecciona un puesto. Se muestra la definición vigente: plantilla editable activa o configuración base.
2. Revisa título, duración, puntaje, preguntas, opciones y criterios de decisión.
3. Pulsa **Mostrar guía de calificación** si necesitas ver respuestas esperadas, rúbricas, umbrales y verificación en vivo. Pulsa **Ocultar guía** después.
4. Pulsa **Imprimir** para generar el cuadernillo.

La impresión oculta navegación, paneles ADMIN, guía, claves, rúbricas y verificación en vivo. Está pensada para entregar las opciones al candidato sin exponer la guía interna. Aplica las mismas condiciones a todos los aspirantes.

### 8.6 Requisito técnico previo

El editor de plantillas vigentes, la baja lógica de cuentas y la auditoría de perfil requieren la migración `2026-11-18-plantillas-seleccion.sql`. Consulta el [runbook de migraciones](runbook-migraciones.md) antes de ejecutarla en producción. La migración se aplica **una sola vez**; no vuelvas a ejecutar `schema.sql` sobre una base existente.

---

## 9. Sugerencias del personal

Ruta: `/admin/sugerencias`.

Los empleados envían sugerencias desde `/sugerencias`. Al entrar verás contadores de total y pendientes; las sugerencias aparecen primero las sin responder y luego las más recientes.

Cada tarjeta muestra fecha de envío en español, zona `America/Guatemala`, título, estado, empleado con su código y descripción. Si ya fue respondida, muestra fecha, texto y nombre de quien respondió.

1. Usa los filtros **Todas**, **Pendientes** o **Respondidas**.
2. Lee la sugerencia y escribe o actualiza la respuesta, de 1 a 5000 caracteres.
3. Pulsa **Enviar respuesta** o **Actualizar respuesta**.

La respuesta queda visible de inmediato para el empleado y se registra con tu usuario y fecha. Solo se puede responder o actualizar: no hay borrado ni cambio manual de estado. Responde con información concreta y evita incluir datos de otros empleados.

---

## 10. Buenas prácticas y resolución de problemas

### Seguridad

- No compartas credenciales de empleados ni de candidatos por correo sin protección.
- No dejes sesiones abiertas en equipos compartidos.
- La contraseña de un candidato se muestra una sola vez al crear la cuenta.
- Los currículums, resultados y motivaciones de reintento son información confidencial.

### Antes de guardar cambios

1. Revisa el cuadernillo con la guía.
2. Confirma umbrales y opción correcta de cada pregunta.
3. Guarda los cambios desde el editor.
4. Comunica a los candidatos activos que deben recargar la página si cambias la prueba; la nueva configuración se usa a partir del guardado.

**Consejo:** revisa el cuadernillo con la guía antes de guardar; así confirmas que la opción correcta y los umbrales siguen siendo los esperados.

### Problemas frecuentes

| Situación | Acción recomendada |
|---|---|
| El login responde «Error interno del servidor» | Verifica `/api/health`; si responde error de base de datos, contacta a TI |
| El candidato no ve el puesto asignado | Revisa su perfil en seguimiento y que la cuenta esté activa |
| El candidato dice que la prueba cambió | Pídele recargar la página; los intentos entregados conservan la configuración con la que se calificaron |
| No aparece el editor de plantillas | Aplica la migración 12 y vuelve a iniciar sesión |
| No se puede eliminar una cuenta | Tiene intentos o resultados; usa baja lógica |
| Un cambio de plantilla no se refleja | Guarda los cambios y verifica que la plantilla esté activa |

---

## 11. Referencia rápida de rutas

| Ruta | Módulo | Permiso |
|---|---|---|
| `/admin` | Dashboard | ADMIN |
| `/admin/empleados` | Empleados | ADMIN |
| `/rrhh` | Control de asistencia | ADMIN o RRHH |
| `/evaluaciones` | Evaluación de personal | Cuentas autorizadas |
| `/admin/evaluaciones-conocimiento` | Evaluaciones mensuales | Cuentas autorizadas |
| `/admin/evaluaciones-seleccion` | Pruebas de selección | Cuentas autorizadas |
| `/admin/sugerencias` | Sugerencias | ADMIN |
| `/seleccion-candidato` | Portal del aspirante | Cuenta de candidato |

Para detalles técnicos de instalación y despliegue consulta el [README](../README.md) y el [runbook de migraciones](runbook-migraciones.md).
