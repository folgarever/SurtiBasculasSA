# SURTIBASCULAS S.A. · Control de asistencia

Aplicación web para registrar la jornada del personal y apoyar la gestión de asistencia de Recursos Humanos. Incluye una interfaz responsiva con la identidad visual de SURTIBASCULAS S.A.

## Funciones

- Inicio de sesión por código de empleado y contraseña.
- Registro de entrada y salida, con historial personal de marcaciones.
- Panel de Recursos Humanos para consultar y filtrar asistencias.
- Corrección de marcaciones con motivo y registro de auditoría.
- Registro de permisos e incidencias de personal.
- Exportación de reportes de asistencia e incidencias a Excel.
- Acceso a funciones según rol: Empleado, Recursos Humanos y Jefe Autorizado.

## Tecnologías

- Frontend: Angular 22, TypeScript y Tailwind CSS 3.
- Backend: Node.js, Express y JSON Web Tokens.
- Base de datos: MySQL.
- Contraseñas almacenadas con bcrypt.

## Requisitos

- Node.js y npm.
- MySQL compatible con InnoDB.
- MySQL Workbench u otro cliente para ejecutar el esquema.

## Configuración local

1. Crea la base de datos `defaultdb` en MySQL.
2. Ejecuta [`database/schema.sql`](database/schema.sql) una sola vez para crear las tablas y las cuentas iniciales. El archivo selecciona la base `defaultdb`.
3. Copia `backend/.env.example` como `backend/.env` y configura la conexión a MySQL y el secreto JWT. El nombre de base de datos debe coincidir con `defaultdb`, salvo que también cambies la sentencia `USE` del esquema.

	Variables requeridas:

	```env
	PORT=3000
	DB_HOST=localhost
	DB_PORT=3306
	DB_USER=root
	DB_PASSWORD=tu_password
	DB_NAME=defaultdb
	TZ=America/Guatemala
	JWT_SECRET=un_secreto_largo_y_aleatorio
	```

4. Instala las dependencias e inicia el backend:

	```powershell
	cd backend
	npm install
	npm run dev
	```

5. En otra terminal, instala las dependencias e inicia Angular:

	```powershell
	cd frontend
	npm install
	npm start
	```

6. Abre `http://localhost:4200`. El proxy de desarrollo envía las peticiones `/api` al backend en `http://localhost:3000`.

Si el puerto `3000` o `4200` ya está ocupado, detén la instancia anterior o inicia el servidor en otro puerto.

## Cuentas iniciales

El esquema crea estas cuentas de ejemplo:

| Código | Nombre | Rol |
|---|---|---|
| `SUR-GG-001` | Héctor Ortiz | Jefe Autorizado |
| `SUR-AC-002` | Mafer García | Recursos Humanos |
| `SUR-VEN-003` | Sebastián Farfán | Empleado |
| `SUR-AUXC-004` | Jefferson López | Empleado |
| `SUR-JM-005` | Por confirmar | Empleado |
| `SUR-TEC-006` | Erick | Empleado |
| `SUR-TEC-007` | Ostman | Empleado |
| `SUR-AUXTEC-008` | Josué | Empleado |
| `SUR-AUXTEC-009` | Marvin | Empleado |
| `SUR-AUXTEC-010` | Eddy | Empleado |

La contraseña inicial compartida es `123456`. **Es solo para pruebas y no es segura para producción.** Antes de usar el sistema con datos reales, define contraseñas individuales y largas. La aplicación no incluye todavía una pantalla para cambiar contraseña.

Si la base ya existía antes de ejecutar el esquema actualizado, no vuelvas a ejecutar todo `schema.sql`: podrías duplicar o volver a crear tablas. Cambia las contraseñas con un proceso administrativo que genere hashes bcrypt.

## API principal

- `GET /`: estado de la API.
- `POST /api/auth/login`: autenticación.
- `POST /api/asistencia/marcar`: registra entrada o salida del usuario autenticado.
- `GET /api/asistencia/mi-historial`: consulta su historial personal.
- `GET /api/rrhh/asistencias`: consulta asistencias con filtros.
- `GET /api/rrhh/empleados`: lista empleados activos.
- `PUT /api/rrhh/corregir`: corrige una marcación y registra el motivo.
- `POST /api/rrhh/incidencias`: registra una incidencia o permiso.
- `GET /api/rrhh/exportar-excel`: descarga el reporte Excel.

Las rutas de asistencia requieren un token. Las rutas de Recursos Humanos requieren un token y rol autorizado.

## Validación

Desde la raíz del repositorio:

```powershell
npm --prefix frontend run build
npm --prefix frontend test -- --watch=false
```

## Estructura

```text
backend/    API Express, controladores, rutas y configuración MySQL
database/   Esquema y datos iniciales
frontend/   Aplicación Angular
```
