# SURTIBÁSCULAS S.A. · Plataforma de gestión

Plataforma corporativa para gestionar procesos internos de SURTIBÁSCULAS S.A., incluyendo la jornada del personal, recursos humanos, administración de empleados y evaluación de desempeño.

## Documentación

- [Manual de usuario para administradores (PDF con capturas)](docs/manual-administradores.pdf)
- [Manual de usuario para administradores (Markdown)](docs/manual-administradores.md)
- [Runbook de migraciones](docs/runbook-migraciones.md)

## Funciones

- Inicio de sesión corporativo y adaptable a móviles y equipos de escritorio, con el logo original de SURTIBÁSCULAS S.A. y favicon de marca.
- Opción para mostrar u ocultar las contraseñas en el inicio de sesión y en los formularios administrativos que las solicitan.
- Registro de entrada y salida e historial personal para todo el personal, incluidos los administradores; solo el Gerente General (`SUR-GG-001`) está exento. Mantiene tolerancia de entrada de 08:00 a 08:15, justificación obligatoria desde las 18:00 y registro de horas extras completas.
- Panel de Recursos Humanos para consultar asistencias, corregir marcaciones y registrar incidencias.
- Solicitudes de vacaciones y permisos desde el portal del empleado, con seguimiento y aprobación o rechazo disponible para cualquier cuenta ADMIN.
- Exportación de reportes de asistencia e incidencias a Excel.
- Administración del directorio de empleados, incluidas altas, ediciones, bajas lógicas y una ficha integral por empleado con asistencia, evaluaciones e incidencias. El Gerente General puede editar y dar de baja cualquier otra cuenta ADMIN; al cambiarla a un puesto sin permiso ADMIN, también retira ese rol.
- Gestión de puestos y permisos desde el directorio de empleados: solo `SUR-GG-001` ve el botón **Puestos y permisos**, puede crear o editar puestos y decidir cuáles otorgan acceso `ADMIN`, siempre con confirmación de contraseña. El cambio se propaga a los empleados activos del puesto sin afectar las cuentas protegidas `SUR-GG-001` ni `SUR-AC-002`.
- Evaluación periódica del personal, con cinco competencias generales y escala de 1 a 5.
- Evaluación técnica y psicométrica adicional para el Jefe de Mantenimiento.
- Evaluaciones de conocimiento con frecuencia configurable por puesto (mensual, quincenal o semanal), banco de preguntas por puesto y periodo con copia editable del periodo anterior, puntaje parcial configurable por opción, historial individual y panel administrativo con KPIs.
- Pruebas de selección independientes de las evaluaciones de conocimiento, con cuadernillo por puesto, rúbrica, puntajes y resultados consultables.
- Envío de sugerencias o quejas por parte del personal, opcionalmente anónimas, con folio de seguimiento, estado Enviada → En revisión → Respondida, aviso de respuestas nuevas y foro administrativo con respuestas visibles para el autor.
- Campana de notificaciones in-app con contador de no leídos para respuestas de sugerencias, evaluaciones pendientes y resultados de selección.
- Acceso a evaluaciones limitado a Héctor Ortiz (`SUR-GG-001`) y Mafer García (`SUR-AC-002`).
- El acceso a administración general lo determina el rol `ADMIN` del empleado; al dar de alta personal, el rol se deriva del indicador `ADMIN` del puesto. Las evaluaciones siguen restringidas a las dos cuentas autorizadas aunque un puesto nuevo tenga ese indicador.

## Tecnologías

- Frontend: Angular 22, TypeScript y Tailwind CSS 3.
- Backend: Node.js, Express y JSON Web Tokens.
- Base de datos: MySQL.
- Contraseñas almacenadas con bcrypt.

La interfaz utiliza la paleta corporativa navy y roja, superficies claras y componentes adaptables a equipos de escritorio y móviles. Los tokens visuales compartidos se definen en `frontend/src/brand-theme.css`.

Los estilos de las áreas internas y del portal de candidatos se complementan en `frontend/src/workspace-theme.css`; están limitados a esas áreas para no modificar la pantalla de inicio de sesión.

El selector de apariencia permite usar el tema claro, oscuro o el del dispositivo. Para abrirlo, toca el logotipo en el inicio de sesión o el perfil dentro de la aplicación. La elección se guarda en el navegador.

## Configuración

1. Crea la base de datos `defaultdb` en MySQL y ejecuta [`database/schema.sql`](database/schema.sql) para una instalación nueva.
2. Para una base existente, ejecuta una sola vez las migraciones pendientes en el orden indicado en [el runbook](docs/runbook-migraciones.md), incluida [`database/migrations/2026-11-24-solicitudes-ausencias.sql`](database/migrations/2026-11-24-solicitudes-ausencias.sql). No vuelvas a ejecutar `schema.sql` en una base existente. Para una instalación nueva basta con ejecutar `schema.sql`.

   Si la migración del 2026-11-12 se interrumpe con el error 1050 porque `candidatos_seleccion_intentos` ya existe, no borres la tabla ni vuelvas a crearla. Compara `SHOW CREATE TABLE candidatos_seleccion_intentos` y `SHOW CREATE TABLE candidatos_seleccion` con el esquema y la migración. Si la tabla de intentos coincide y en `candidatos_seleccion` faltan ambas columnas de reintento y su clave foránea, ejecuta únicamente el `ALTER TABLE` de esa migración. Si ya existen o el esquema difiere, revisa las diferencias antes de modificarlo.
3. Copia `backend/.env.example` como `backend/.env` y configura la conexión a MySQL y un secreto JWT largo y aleatorio. El nombre de base de datos debe coincidir con `defaultdb`. Configura también `CORS_ORIGINS` con los dominios autorizados. SSL de MySQL está activo por defecto en hosts remotos y desactivado en `localhost`; usa `DB_SSL` para forzarlo y `DB_SSL_REJECT_UNAUTHORIZED=false` únicamente si el certificado es autofirmado.
4. Instala dependencias e inicia el backend:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

5. En otra terminal, instala dependencias e inicia Angular:

   ```powershell
   cd frontend
   npm install
   npm start
   ```

6. Abre `http://localhost:4200`. El proxy de desarrollo envía `/api` al backend en `http://localhost:3000`.

### API y CORS

El frontend usa `/api` bajo el mismo origen. En desarrollo lo resuelve `frontend/proxy.conf.json` y en Vercel la regla de `frontend/vercel.json` reenvía `/api/*` al backend. `frontend/public/config.js` solo fija ese valor por defecto y admite sobreescribirlo con `window.API_URL` o `window.SURTIBASCULAS_CONFIG.apiUrl` antes de cargar el script.

El backend restringe CORS a `CORS_ORIGINS` (lista separada por comas). Si no se define, permite `http://localhost:4200` y cualquier dominio `*.vercel.app`, incluidas las URLs de preview. El inicio de sesión tiene límite de 10 intentos por IP cada 15 minutos; el contador es por instancia, por lo que en arquitecturas serverless no sustituye un limite distribuido.

Las peticiones autenticadas verifican el JWT y **refrescan el perfil desde la base de datos**: una cuenta dada de baja, un cambio de rol o una cuenta de candidato eliminada dejan de tener acceso de inmediato, aunque el token siga vigente.

El panel de administración (`/admin`) consume `GET /api/dashboard/admin`, disponible solo para `ADMIN`. El endpoint devuelve en una sola respuesta los indicadores del día, la serie de asistencia de los últimos siete días, la distribución por puesto y la actividad reciente.
El panel agrupa el resumen diario, los pendientes y el detalle de asistencia; el gráfico incluye un detalle textual accesible de cada día. Los accesos a evaluaciones siguen sujetos a los permisos existentes.

`GET /api/health` verifica la conexión a MySQL y responde `{ "estado": "ok", "base_de_datos": "ok" }`. Si la base de datos falla, devuelve `500` con `estado: "error"`; es el primer endpoint a revisar cuando el login responde «Error interno del servidor».

## Nómina inicial

| Código | Nombre | Cargo | Acceso |
|---|---|---|---|
| `SUR-GG-001` | Héctor Ortiz | Gerente General | ADMIN |
| `SUR-AC-002` | Mafer García | Asistente Comercial y RR. HH. | ADMIN |
| `SUR-VEN-003` | Sebastián Farfán | Vendedor | Empleado |
| `SUR-AUXC-004` | Jefferson López | Auxiliar Contable | Empleado |
| `SUR-JM-005` | Por confirmar | Jefe de Mantenimiento | Empleado |
| `SUR-TEC-006` | Erick | Técnico | Empleado |
| `SUR-TEC-007` | Ostman | Técnico | Empleado |
| `SUR-AUXTEC-008` | Josué | Auxiliar Técnico | Empleado |
| `SUR-AUXTEC-009` | Marvin | Auxiliar Técnico | Empleado |
| `SUR-AUXTEC-010` | Eddy | Auxiliar Técnico | Empleado |

El esquema de ejemplo asigna la contraseña inicial `123456` a estas cuentas. Es solo para pruebas: antes de usar datos reales, configura contraseñas individuales y largas.

## Puestos y permisos

En `/admin/empleados`, el botón **Puestos y permisos** aparece solo para `SUR-GG-001` y abre un modal administrativo; no hay una ruta ni un menú independientes. Cada puesto tiene una abreviatura (que forma parte del código `SUR-<abreviatura>-###`), nombre, departamento, frecuencia de evaluación de conocimiento y el indicador `ADMIN`.

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| `GET` | `/api/rrhh/administracion/puestos` | `ADMIN` | Listar el catálogo completo de puestos |
| `POST` | `/api/rrhh/administracion/puestos` | Solo `SUR-GG-001` + contraseña | Crear un puesto y definir su indicador `ADMIN` |
| `PUT` | `/api/rrhh/administracion/puestos/<id>` | Solo `SUR-GG-001` + contraseña | Editar un puesto y propagar el cambio de permiso |

Al marcar un puesto como `ADMIN`, los empleados **activos** de ese puesto reciben el rol `ADMIN` y pueden usar la administración general (`/admin`, directorio de empleados, asistencia, sugerencias y ficha integral). No obtienen acceso a evaluaciones de personal, conocimiento ni selección: esos módulos siguen exigiendo `SUR-GG-001` o `SUR-AC-002`. Al desmarcarlo, esos empleados vuelven al rol `Empleado`.

Los puestos `GG` y `AC` conservan protegidas su abreviatura y su indicador `ADMIN`. El Gerente General puede cambiar el puesto de otras cuentas ADMIN (el rol resultante depende del nuevo puesto) y darles de baja; no puede modificar su propia cuenta. Otros ADMIN no pueden editar ni dar de baja cuentas ADMIN, ni asignar puestos con indicador `ADMIN` al dar de alta empleados.

## Evaluaciones y acceso

El enlace y la ruta Angular `/evaluaciones` solo están disponibles para las dos cuentas ADMIN indicadas. El backend verifica la firma y expiración del JWT y vuelve a comprobar el rol y el código permitido; las demás cuentas reciben `403 Forbidden`, aunque invoquen los endpoints directamente.

La puntualidad incluye un resumen de días registrados y atrasos de los últimos 30 días de Control de Asistencia. Para `SUR-JM-005` se solicitan además nueve calificaciones de supervisión técnica, liderazgo y competencias psicométricas.

| Método | Endpoint | Función |
|---|---|---|
| `GET` | `/api/evaluaciones/empleados` | Nómina activa y resumen de asistencia |
| `GET` | `/api/evaluaciones?empleado_id=<id>` | Listar evaluaciones; filtro por empleado opcional |
| `GET` | `/api/evaluaciones/<id>` | Consultar el detalle de una evaluación |
| `POST` | `/api/evaluaciones` | Crear evaluación general y, para `SUR-JM-005`, especializada |

El cuerpo de `POST` contiene `empleado_id`, `fecha_evaluacion` (`YYYY-MM-DD`), `periodo`, `calificaciones` (las cinco competencias generales del 1 al 5), `comentarios` opcional y `especializada` (las nueve competencias del jefe de mantenimiento). Las tablas y restricciones están incluidas en `schema.sql` y en la migración.

## Evaluaciones de conocimiento

Cada empleado puede abrir `/evaluaciones-conocimiento` para realizar la evaluación del periodo vigente según la frecuencia de su puesto. El servidor crea y conserva una evaluación por empleado y periodo, calcula la calificación sobre puntos obtenidos, fija el resultado en **Aprobado** (70% o más) o **Requiere refuerzo**, y no permite modificar una entrega completada. Las respuestas correctas no se envían al empleado hasta que termina la prueba. Los identificadores son `YYYY-MM` para frecuencia mensual, `YYYY-MM-Q1|Q2` para quincenal (días 1–15 y 16–fin de mes, hora de Guatemala) y `YYYY-Www` para semanal (semana ISO con año ISO). Al cambiar la frecuencia, las evaluaciones anteriores conservan su periodo y no se regeneran. Los bancos iniciales cubren Gerencia General, Asistente Comercial y RR. HH., Vendedor, Auxiliar Contable, Jefe de Mantenimiento, Técnico, Auxiliar Técnico, Director de Calidad, Metrológico y Auxiliar de Laboratorio.

El panel `/admin/evaluaciones-conocimiento`, restringido a las cuentas administradoras autorizadas, permite elegir la frecuencia de cada puesto y administrar un banco distinto por puesto y periodo, con opciones y puntaje completo, parcial o nulo. Los cambios del banco se reflejan solo en las evaluaciones **pendientes** de ese puesto y periodo y no alteran resultados completados. Los periodos nuevos comienzan vacíos hasta que ADMIN agrega preguntas; sin preguntas no se habilita la evaluación. La nota se calcula como puntos obtenidos sobre puntos posibles. El panel muestra KPIs de los periodos vigentes, filtros por empleado/puesto/departamento, resultados individuales, historial de respuestas y evolución por periodo. Los departamentos son una clasificación asignada a los puestos (Gerencia; Comercial y Recursos Humanos; Administración y Finanzas; Mantenimiento; Calidad y Metrología) para habilitar el filtro; no sustituyen una estructura de departamentos independiente.

## Pruebas de selección

El panel `/admin/evaluaciones-seleccion`, restringido a las cuentas administradoras autorizadas, está organizado en este orden: crear cuenta y asignar puesto, seguimiento de cuentas y pruebas pendientes, historial de resultados automáticos y cuadernillo con guía interna por puesto. Cada cuenta recibe un usuario secuencial `CANDIDATO-AAAA-NNN` y una contraseña aleatoria que se muestra una sola vez. El candidato completa sus datos y adjunta su currículum PDF; el puesto ya asignado no se puede cambiar desde el portal. El servidor calcula y almacena puntaje, porcentaje correcto y decisión al entregar; el historial conserva los intentos y permite a Administración autorizar otro con motivo registrado. La impresión del cuadernillo incluye las opciones, pero excluye la guía de calificación. Los currículums y perfiles completos solo son visibles para Administración. Las evaluaciones de conocimiento siguen en su módulo y no comparten registros con selección.

Administración asigna el puesto y entrega a cada aspirante su usuario y contraseña individuales. Después de iniciar sesión en la opción **Candidato**, el aspirante registra nombres, apellidos y fecha de nacimiento, adjunta su currículum PDF (máximo 5 MB) y responde la evaluación de su puesto en la misma página. El sistema calcula la edad, baraja las opciones, bloquea las respuestas después de entregarlas, califica automáticamente y guarda el resultado sin captura manual. Administración puede consultar los resultados anteriores y autorizar un nuevo intento con justificación.

Hay evaluaciones de selección para los 11 puestos del catálogo, incluyendo Asistente Administrativo y Contable. Las pruebas nuevas se basan en las funciones y bancos de conocimientos de cada puesto; no se sustituyen por las evaluaciones de conocimiento.

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| `GET` | `/api/evaluaciones-seleccion/plantillas` | Administrador autorizado | Obtener las plantillas y rúbricas habilitadas por puesto |
| `GET` | `/api/evaluaciones-seleccion/resultados?puesto_id=<id>` | Administrador autorizado | Consultar resultados de selección, con filtro de puesto opcional |
| `POST` | `/api/evaluaciones-seleccion/admin/candidatos` | Administrador autorizado | Crear una cuenta y asignar un puesto al candidato |
| `GET` | `/api/evaluaciones-seleccion/admin/candidatos/<id>/curriculum` | Administrador autorizado | Descargar el currículum PDF del candidato |
| `POST` | `/api/evaluaciones-seleccion/admin/candidatos/<id>/reintentar` | Administrador autorizado | Autorizar un nuevo intento conservando el historial y registrando el motivo |
| `POST` | `/api/auth/login-candidato` | Usuario y contraseña individuales | Iniciar sesión en el portal de aspirantes |
| `GET` | `/api/evaluaciones-seleccion/candidato/plantillas` | Candidato autenticado | Consultar las pruebas disponibles sin rúbricas internas |
| `GET` | `/api/evaluaciones-seleccion/candidato/mi` | Candidato autenticado | Consultar el registro y estado de la prueba de su sesión |
| `POST` | `/api/evaluaciones-seleccion/candidato/perfil` | Candidato autenticado | Registrar datos personales, puesto y currículum PDF |
| `POST` | `/api/evaluaciones-seleccion/candidato/entregar` | Candidato autenticado | Entregar respuestas y cerrar la prueba |
| `GET` | `/api/evaluaciones-seleccion/admin/candidatos?puesto_id=<id>` | Administrador autorizado | Consultar cuentas, perfiles y pruebas pendientes |

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| `GET` | `/api/evaluaciones-conocimiento/mi` | Empleado autenticado | Habilitar y consultar la evaluación e historial propios |
| `POST` | `/api/evaluaciones-conocimiento/mi/responder` | Empleado autenticado | Entregar respuestas y calcular el resultado |
| `GET` | `/api/evaluaciones-conocimiento/admin/catalogos` | Administrador autorizado | Obtener empleados, puestos con frecuencia/periodos, departamentos y frecuencias |
| `PUT` | `/api/evaluaciones-conocimiento/admin/puestos/<puesto_id>/frecuencia` | Administrador autorizado | Cambiar la frecuencia del puesto (`mensual`, `quincenal` o `semanal`) |
| `GET` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas?periodo=<periodo>` | Administrador autorizado | Consultar las preguntas del puesto en un periodo |
| `GET` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas/copiar?periodo=<periodo>` | Administrador autorizado | Vista previa de las preguntas del periodo anterior, listas para editar y copiar |
| `POST` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas/copiar?periodo=<periodo>` | Administrador autorizado | Copiar preguntas editadas al periodo, validarlas y sincronizar evaluaciones pendientes |
| `POST` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas?periodo=<periodo>` | Administrador autorizado | Agregar una pregunta al periodo con puntaje máximo y opciones de puntaje completo, parcial o nulo |
| `PUT` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas/<pregunta_id>?periodo=<periodo>` | Administrador autorizado | Editar una pregunta del periodo, su puntaje máximo y los puntajes de sus opciones |
| `DELETE` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas/<pregunta_id>?periodo=<periodo>` | Administrador autorizado | Eliminar una pregunta del periodo |
| `GET` | `/api/evaluaciones-conocimiento/admin` | Administrador autorizado | Consultar evaluaciones y pendientes, con filtros opcionales `empleado_id`, `puesto_id` y `departamento` |
| `GET` | `/api/evaluaciones-conocimiento/admin/<id>` | Administrador autorizado | Consultar respuestas y calificación de una evaluación completada |

El esquema nuevo está en `schema.sql`; para una base instalada, las migraciones agregan los departamentos, las evaluaciones de conocimiento, la frecuencia por puesto y el banco de preguntas por puesto y periodo.

## Sugerencias del personal

El personal con una cuenta no administradora puede enviar sugerencias o quejas con título, descripción y opción de anonimato desde `/sugerencias`. Cada envío recibe un folio `SG-AAAA-NNNNN` que permite seguirlo sin revelar al autor, y la tarjeta muestra la línea Enviada → En revisión → Respondida. El botón **Actualizar** recarga el historial; cuando hay respuestas sin leer aparece un aviso y un contador en `Mi jornada`, que se puede marcar como leído. Si el envío es anónimo, el administrador ve la sugerencia sin nombre ni código del autor, pero el autor conserva su historial y puede ver la respuesta cuando exista. Los administradores pueden revisar todas las sugerencias, filtrar pendientes/respondidas y responder o actualizar respuestas desde `/admin/sugerencias`. La autorización se valida tanto en Angular como en los endpoints del backend.

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| `GET` | `/api/sugerencias/mis-sugerencias` | Empleado | Consultar las propias sugerencias y respuestas |
| `POST` | `/api/sugerencias/mis-sugerencias` | Empleado | Crear una sugerencia o queja (`titulo`, `descripcion`, `anonima`) |
| `GET` | `/api/sugerencias/admin` | Administrador | Consultar todas las sugerencias |
| `PUT` | `/api/sugerencias/admin/<id>/respuesta` | Administrador | Guardar o actualizar una respuesta |

## Asistencia, horas extras y detalle del empleado

La marcación de entrada clasifica las llegadas de 08:00 a 08:15 como **Tolerancia de entrada**; antes de las 08:00 es puntual y después de las 08:15 es atraso. La salida no requiere justificación hasta las 18:00. Desde las 18:00 el empleado debe escribir el motivo al marcar; el sistema guarda ese texto y calcula las horas extras como **horas completas** (19:30 = 1 hora, 18:45 = 0 horas). RRHH ve ambos campos en el reporte y en el Excel, y puede corregirlos con auditoría.

Cada salida con horas extras nace como **Pendiente** y debe ser revisada desde la sección **Horas extras pendientes** de `/rrhh`. Solo RRHH (`SUR-AC-002` o rol `RRHH`) y el Gerente General (`SUR-GG-001`) pueden aprobar o rechazar; el rechazo exige un motivo de 4 a 500 caracteres. La resolución guarda aprobador, fecha y motivo, y deja constancia en `historial_correcciones`. Corregir horas extras o su justificación devuelve la solicitud a `Pendiente`. El portal del empleado muestra el estado de cada solicitud, el motivo de rechazo y el resumen de evaluaciones del periodo.

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| `GET` | `/api/rrhh/horas-extras?estado=pendiente` | `ADMIN` / `RRHH` | Listar solicitudes (`pendiente`, `aprobada`, `rechazada`, `todas`) |
| `PUT` | `/api/rrhh/horas-extras/<id>/aprobar` | RRHH + `SUR-GG-001` | Aprobar una solicitud pendiente |
| `PUT` | `/api/rrhh/horas-extras/<id>/rechazar` | RRHH + `SUR-GG-001` | Rechazar con `{ "motivo": "..." }` obligatorio |

Estos endpoints requieren la migración `2026-11-22-horas-extras-aprobacion.sql`; consulta `docs/runbook-migraciones.md`.

Los administradores pueden abrir `/admin/empleados/:id` desde el botón de detalle del directorio. La ficha reúne marcaciones recientes, indicadores de puntualidad de 30 días, evaluaciones de personal, evaluaciones de conocimiento e incidencias. La consulta (`GET /api/rrhh/administracion/empleados/:id/detalle`) está disponible para cualquier cuenta con rol ADMIN y no depende de los permisos reforzados del módulo de evaluaciones.

## Notificaciones in-app

La campana de la barra superior (y del portal del candidato) muestra un contador de avisos sin leer y un panel con acceso directo a cada módulo. Según el rol:

- **Empleado:** respuestas nuevas a sus sugerencias y evaluación de conocimiento pendiente del periodo vigente.
- **Administrador:** sugerencias sin responder, evaluaciones pendientes, candidatos en registro y resultados de selección disponibles.
- **Candidato:** resultado de su evaluación o aviso de prueba enviada.

Las notificaciones se derivan de los endpoints existentes, así que no requieren migración ni cambios en la base de datos. El estado de “leído” se guarda en `localStorage` con una clave por usuario (`surtibasculas_notificaciones_vistas:<id>`); las respuestas de sugerencias comparten el marcador ya usado por `/sugerencias`, por lo que **Marcar como leídas** y la campana permanecen sincronizadas. Al abrir un aviso se marca como leído y se navega a la ruta correspondiente.

## Validación

Desde la raíz:

```powershell
npm --prefix frontend run build
npm --prefix frontend test -- --watch=false
npm --prefix backend test
```

El mismo conjunto se ejecuta automáticamente en GitHub Actions para pushes y pull requests a `folgarever` (`.github/workflows/ci.yml`).

## Estructura

```text
.
├── .github/
│   └── workflows/ci.yml       Build y tests en pushes/PRs a folgarever
├── backend/
│   ├── src/
│   │   ├── config/            authorization, cors, db y bancos de preguntas
│   │   ├── controllers/       7 controladores (auth, asistencia, rrhh, evaluaciones,
│   │   │                      evaluaciones-conocimiento, evaluaciones-seleccion, sugerencias)
│   │   ├── middlewares/       authMiddleware.js y rateLimit.js
│   │   └── routes/            7 enrutadores, uno por módulo
│   ├── test/                  authMiddleware, rateLimit y entrega de selección
│   ├── .env.example
│   ├── server.js              Entrada de Express y despliegue en Vercel
│   ├── package.json
│   └── vercel.json
├── database/
│   ├── migrations/            12 migraciones SQL (ver docs/runbook-migraciones.md)
│   └── schema.sql             Esquema consolidado y datos de prueba
├── docs/
│   ├── capturas/              9 capturas reales usadas en el manual PDF
│   ├── manual-administradores.md
│   ├── manual-administradores.pdf
│   └── runbook-migraciones.md
├── frontend/
│   ├── public/                config.js, favicon y logo corporativo
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    app-shell (layout compartido) y selector-tema
│   │   │   ├── guards/        6 guards (auth, admin, role, evaluation, employee, candidate)
│   │   │   ├── interceptors/  auth.interceptor.ts
│   │   │   ├── pages/         12 páginas (dashboards, empleados, evaluaciones, sugerencias, candidato)
│   │   │   ├── services/      8 servicios API + TemaService
│   │   │   ├── app.config.ts
│   │   │   ├── app.routes.ts
│   │   │   ├── app.spec.ts
│   │   │   └── app.ts
│   │   ├── environments/      environment.ts y environment.prod.ts
│   │   ├── brand-theme.css    Tokens y estilos corporativos
│   │   ├── brand-theme-dark.css Tema oscuro
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── proxy.conf.json        /api → http://localhost:3000
│   ├── vercel.json            Build, rewrite de /api y SPA
│   └── ...                    angular.json, package.json, Tailwind, TypeScript, specs
├── .gitignore
├── LICENSE
└── README.md
```

Las carpetas de vistas contienen sus archivos TypeScript y HTML. Las dependencias (`node_modules`), compilaciones (`dist`) y cachés no se versionan; se generan localmente al instalar o compilar el proyecto.

El proyecto Angular se llama `surtibasculas-frontend` y Vercel publica `dist/surtibasculas-frontend/browser`. El sidebar, la barra superior, el selector de tema y el cierre de sesión viven en `app-shell`; las páginas solo aportan su contenido. Por compatibilidad se conservan el override `SIMET_API_URL` y las claves antiguas de `localStorage`, pero el código nuevo usa `SURTIBASCULAS_API_URL` y `surtibasculas_*`.
