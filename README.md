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
- Acceso a evaluaciones limitado a Héctor Ortiz (`SUR-GG-001`) y Mafer García (`SUR-AC-002`).

## Tecnologías

- Frontend: Angular 22, TypeScript y Tailwind CSS 3.
- Backend: Node.js, Express y JSON Web Tokens.
- Base de datos: MySQL.
- Contraseñas almacenadas con bcrypt.

## Configuración

1. Crea la base de datos `defaultdb` en MySQL y ejecuta [`database/schema.sql`](database/schema.sql) para una instalación nueva.
2. Para una base existente, ejecuta una sola vez [`database/migrations/2026-11-01-evaluaciones-personal.sql`](database/migrations/2026-11-01-evaluaciones-personal.sql) y después [`database/migrations/2026-11-02-observaciones-evaluaciones.sql`](database/migrations/2026-11-02-observaciones-evaluaciones.sql). La segunda migración agrega las observaciones por criterio y se puede volver a ejecutar sin duplicar la columna. No vuelvas a ejecutar `schema.sql` sobre una base ya creada. Después, ambos administradores deben iniciar sesión nuevamente para recibir el rol actualizado en su JWT.
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
