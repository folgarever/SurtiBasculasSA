# SURTIBÁSCULAS S.A. · Plataforma de gestión

Plataforma corporativa para gestionar procesos internos de SURTIBÁSCULAS S.A., incluyendo la jornada del personal, recursos humanos, administración de empleados y evaluación de desempeño.

## Funciones

- Inicio de sesión corporativo y adaptable a móviles y equipos de escritorio, con el logo original de SURTIBÁSCULAS S.A. y favicon de marca.
- Opción para mostrar u ocultar las contraseñas en el inicio de sesión y en los formularios administrativos que las solicitan.
- Registro de entrada y salida e historial personal de marcaciones.
- Panel de Recursos Humanos para consultar asistencias, corregir marcaciones y registrar incidencias.
- Exportación de reportes de asistencia e incidencias a Excel.
- Administración del directorio de empleados, incluidas altas, ediciones y bajas.
- Evaluación periódica del personal, con cinco competencias generales y escala de 1 a 5.
- Evaluación técnica y psicométrica adicional para el Jefe de Mantenimiento.
- Evaluación mensual de conocimientos con preguntas por puesto, puntaje parcial configurable por opción, historial individual y panel administrativo con KPIs.
- Pruebas de selección independientes de las evaluaciones mensuales, con cuadernillo por puesto, rúbrica, puntajes y resultados consultables.
- Envío de sugerencias por parte del personal y foro administrativo con respuestas.
- Acceso a evaluaciones limitado a Héctor Ortiz (`SUR-GG-001`) y Mafer García (`SUR-AC-002`).

## Tecnologías

- Frontend: Angular 22, TypeScript y Tailwind CSS 3.
- Backend: Node.js, Express y JSON Web Tokens.
- Base de datos: MySQL.
- Contraseñas almacenadas con bcrypt.

La interfaz utiliza la paleta corporativa navy y roja, superficies claras y componentes adaptables a equipos de escritorio y móviles. Los tokens visuales compartidos se definen en `frontend/src/brand-theme.css`.

El selector de apariencia permite usar el tema claro, oscuro o el del dispositivo. Para abrirlo, toca el logotipo en el inicio de sesión o el perfil dentro de la aplicación. La elección se guarda en el navegador.

## Configuración

1. Crea la base de datos `defaultdb` en MySQL y ejecuta [`database/schema.sql`](database/schema.sql) para una instalación nueva.
2. Para una base existente, ejecuta una sola vez [`database/migrations/2026-11-01-evaluaciones-personal.sql`](database/migrations/2026-11-01-evaluaciones-personal.sql), [`database/migrations/2026-11-02-observaciones-evaluaciones.sql`](database/migrations/2026-11-02-observaciones-evaluaciones.sql), [`database/migrations/2026-11-06-sugerencias.sql`](database/migrations/2026-11-06-sugerencias.sql), [`database/migrations/2026-11-06-evaluaciones-conocimiento.sql`](database/migrations/2026-11-06-evaluaciones-conocimiento.sql), [`database/migrations/2026-11-09-banco-preguntas-conocimiento.sql`](database/migrations/2026-11-09-banco-preguntas-conocimiento.sql), [`database/migrations/2026-11-09-puntuacion-parcial-evaluaciones.sql`](database/migrations/2026-11-09-puntuacion-parcial-evaluaciones.sql), [`database/migrations/2026-11-11-evaluaciones-seleccion.sql`](database/migrations/2026-11-11-evaluaciones-seleccion.sql), [`database/migrations/2026-11-11-seleccion-candidatos.sql`](database/migrations/2026-11-11-seleccion-candidatos.sql), [`database/migrations/2026-11-11-codigos-acceso-candidatos.sql`](database/migrations/2026-11-11-codigos-acceso-candidatos.sql), [`database/migrations/2026-11-11-cuentas-candidatos-curriculum.sql`](database/migrations/2026-11-11-cuentas-candidatos-curriculum.sql) y [`database/migrations/2026-11-12-resultados-automaticos-seleccion.sql`](database/migrations/2026-11-12-resultados-automaticos-seleccion.sql), en ese orden. Ejecuta cada migración una sola vez y solo después de las anteriores; si las migraciones previas de selección ya fueron aplicadas, ejecuta únicamente la del **2026-11-12**. No vuelvas a ejecutar `CREATE TABLE` ni `schema.sql` en una base existente. Para una instalación nueva basta con ejecutar `schema.sql`. Después, ambos administradores deben iniciar sesión nuevamente para recibir el rol actualizado en su JWT.

   Si la migración del 2026-11-12 se interrumpe con el error 1050 porque `candidatos_seleccion_intentos` ya existe, no borres la tabla ni vuelvas a crearla. Compara `SHOW CREATE TABLE candidatos_seleccion_intentos` y `SHOW CREATE TABLE candidatos_seleccion` con el esquema y la migración. Si la tabla de intentos coincide y en `candidatos_seleccion` faltan ambas columnas de reintento y su clave foránea, ejecuta únicamente el `ALTER TABLE` de esa migración. Si ya existen o el esquema difiere, revisa las diferencias antes de modificarlo.
3. Copia `backend/.env.example` como `backend/.env` y configura la conexión a MySQL y un secreto JWT largo y aleatorio. El nombre de base de datos debe coincidir con `defaultdb`.
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

## Evaluación mensual de conocimientos

Cada empleado puede abrir `/evaluaciones-conocimiento` para realizar una evaluación del mes asociada a su puesto activo. El servidor crea y conserva una evaluación por empleado y periodo (`YYYY-MM`), calcula la calificación sobre respuestas correctas, fija el resultado en **Aprobado** (70% o más) o **Requiere refuerzo**, y no permite modificar una entrega completada. Las respuestas correctas no se envían al empleado hasta que termina la prueba. Los bancos cubren Gerencia General, Asistente Comercial y RR. HH., Vendedor, Auxiliar Contable, Jefe de Mantenimiento, Técnico, Auxiliar Técnico, Director de Calidad, Metrológico y Auxiliar de Laboratorio.

El panel `/admin/evaluaciones-conocimiento`, restringido a las cuentas administradoras autorizadas, permite administrar las preguntas, opciones, puntaje máximo por pregunta y puntaje completo, parcial o nulo de cada opción; los cambios se reflejan en las evaluaciones pendientes del mes de todos sus empleados y no alteran resultados ya completados. La nota se calcula como puntos obtenidos sobre los puntos posibles. También habilita los pendientes del mes y muestra KPIs de cumplimiento y promedio, filtros por empleado/puesto/departamento, resultados individuales, historial de respuestas y evolución mensual. Los departamentos son una clasificación asignada a los puestos (Gerencia; Comercial y Recursos Humanos; Administración y Finanzas; Mantenimiento; Calidad y Metrología) para habilitar el filtro; no sustituyen una estructura de departamentos independiente.

## Pruebas de selección

El panel `/admin/evaluaciones-seleccion`, restringido a las cuentas administradoras autorizadas, está organizado en este orden: crear cuenta y asignar puesto, seguimiento de cuentas y pruebas pendientes, historial de resultados automáticos y cuadernillo con guía interna por puesto. Cada cuenta recibe un usuario secuencial `CANDIDATO-AAAA-NNN` y una contraseña aleatoria que se muestra una sola vez. El candidato completa sus datos y adjunta su currículum PDF; el puesto ya asignado no se puede cambiar desde el portal. El servidor calcula y almacena puntaje, porcentaje correcto y decisión al entregar; el historial conserva los intentos y permite a Administración autorizar otro con motivo registrado. La impresión del cuadernillo incluye las opciones, pero excluye la guía de calificación. Los currículums y perfiles completos solo son visibles para Administración. La evaluación mensual sigue en su módulo y no comparte registros con selección.

Administración asigna el puesto y entrega a cada aspirante su usuario y contraseña individuales. Después de iniciar sesión en la opción **Candidato**, el aspirante registra nombres, apellidos y fecha de nacimiento, adjunta su currículum PDF (máximo 5 MB) y responde la evaluación de su puesto en la misma página. El sistema calcula la edad, baraja las opciones, bloquea las respuestas después de entregarlas, califica automáticamente y guarda el resultado sin captura manual. Administración puede consultar los resultados anteriores y autorizar un nuevo intento con justificación.

Hay evaluaciones de selección para los 11 puestos del catálogo, incluyendo Asistente Administrativo y Contable. Las pruebas nuevas se basan en las funciones y bancos de conocimientos de cada puesto; no se sustituyen por las evaluaciones mensuales.

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
| `GET` | `/api/evaluaciones-conocimiento/admin/catalogos` | Administrador autorizado | Obtener empleados, puestos y departamentos para filtros |
| `GET` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas` | Administrador autorizado | Consultar las preguntas del puesto |
| `POST` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas` | Administrador autorizado | Agregar una pregunta con puntaje máximo y opciones de puntaje completo, parcial o nulo |
| `PUT` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas/<pregunta_id>` | Administrador autorizado | Editar una pregunta, su puntaje máximo y los puntajes de sus opciones |
| `DELETE` | `/api/evaluaciones-conocimiento/admin/banco/<puesto_id>/preguntas/<pregunta_id>` | Administrador autorizado | Eliminar una pregunta (el puesto debe conservar al menos una) |
| `GET` | `/api/evaluaciones-conocimiento/admin` | Administrador autorizado | Consultar evaluaciones y pendientes, con filtros opcionales `empleado_id`, `puesto_id` y `departamento` |
| `GET` | `/api/evaluaciones-conocimiento/admin/<id>` | Administrador autorizado | Consultar respuestas y calificación de una evaluación completada |

El esquema nuevo está en `schema.sql`; para una base instalada, las migraciones agregan los departamentos, las evaluaciones mensuales y el banco de preguntas por puesto.

## Sugerencias del personal

El personal con una cuenta no administradora puede enviar sugerencias con título y descripción desde `/sugerencias`, y consultar sus respuestas. Los administradores pueden revisar todas las sugerencias, filtrar pendientes/respondidas y responder o actualizar respuestas desde `/admin/sugerencias`. La autorización se valida tanto en Angular como en los endpoints del backend.

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| `GET` | `/api/sugerencias/mis-sugerencias` | Empleado | Consultar las propias sugerencias y respuestas |
| `POST` | `/api/sugerencias/mis-sugerencias` | Empleado | Crear una sugerencia (`titulo`, `descripcion`) |
| `GET` | `/api/sugerencias/admin` | Administrador | Consultar todas las sugerencias |
| `PUT` | `/api/sugerencias/admin/<id>/respuesta` | Administrador | Guardar o actualizar una respuesta |

## Validación

Desde la raíz:

```powershell
npm --prefix frontend run build
npm --prefix frontend test -- --watch=false
```

## Estructura

```text
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── authorization.js
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── asistenciaController.js
│   │   │   ├── authController.js
│   │   │   ├── evaluacionesController.js
│   │   │   └── rrhhController.js
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js
│   │   └── routes/
│   │       ├── asistenciaRoutes.js
│   │       ├── authRoutes.js
│   │       ├── evaluacionesRoutes.js
│   │       └── rrhhRoutes.js
│   ├── .env.example
│   ├── server.js            Entrada de Express y despliegue en Vercel
│   ├── package.json
│   ├── package-lock.json
│   └── vercel.json
├── database/
│   ├── migrations/
│   │   ├── 2026-11-01-evaluaciones-personal.sql
│   │   └── 2026-11-02-observaciones-evaluaciones.sql
│   └── schema.sql           Esquema inicial y datos de prueba
├── frontend/
│   ├── public/
│   │   ├── config.js
│   │   ├── favicon.ico
│   │   └── surtibasculas-logo.png
│   ├── src/
│   │   ├── app/
│   │   │   ├── guards/
│   │   │   │   ├── admin.guard.ts
│   │   │   │   ├── auth.guard.ts
│   │   │   │   ├── evaluation.guard.ts
│   │   │   │   └── role.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts
│   │   │   ├── pages/
│   │   │   │   ├── admin-dashboard/
│   │   │   │   │   ├── admin-dashboard.component.html
│   │   │   │   │   └── admin-dashboard.component.ts
│   │   │   │   ├── empleado-dashboard/
│   │   │   │   │   ├── empleado-dashboard.component.html
│   │   │   │   │   └── empleado-dashboard.component.ts
│   │   │   │   ├── empleados/
│   │   │   │   │   ├── empleados.component.html
│   │   │   │   │   └── empleados.component.ts
│   │   │   │   ├── evaluaciones/
│   │   │   │   │   ├── evaluaciones.component.html
│   │   │   │   │   └── evaluaciones.component.ts
│   │   │   │   ├── login/
│   │   │   │   │   ├── login.component.html
│   │   │   │   │   └── login.component.ts
│   │   │   │   └── rrhh-dashboard/
│   │   │   │       ├── rrhh-dashboard.component.html
│   │   │   │       └── rrhh-dashboard.component.ts
│   │   │   ├── services/
│   │   │   │   ├── asistencia.service.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── evaluaciones.service.ts
│   │   │   │   └── rrhh.service.ts
│   │   │   ├── app.config.ts
│   │   │   ├── app.routes.ts
│   │   │   ├── app.spec.ts
│   │   │   └── app.ts
│   │   ├── environments/
│   │   │   ├── environment.prod.ts
│   │   │   └── environment.ts
│   │   ├── brand-theme.css
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── .editorconfig
│   ├── .gitignore
│   ├── .prettierrc
│   ├── README.md
│   ├── angular.json
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.json
│   ├── proxy.conf.json
│   ├── tailwind.config.js
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.spec.json
│   └── vercel.json
├── .gitignore
├── LICENSE
└── README.md
```

Las carpetas de vistas contienen sus archivos TypeScript y HTML. Las dependencias (`node_modules`), compilaciones (`dist`) y cachés no se versionan; se generan localmente al instalar o compilar el proyecto.
