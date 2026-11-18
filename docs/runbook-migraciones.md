# Runbook de migraciones de base de datos

Aplica este procedimiento solo sobre la base de producción `defaultdb` y únicamente desde la rama `folgarever`.

## Antes de empezar

1. Confirma la rama: `git status --short --branch` debe mostrar `folgarever`.
2. Identifica la versión desplegada con `git rev-parse --short HEAD`.
3. Haz un backup lógico completo:

   ```powershell
   mysqldump --host=TU_HOST --user=TU_USUARIO --password --databases defaultdb --single-transaction --routines --triggers > backup-defaultdb-YYYYMMDD.sql
   ```

4. Verifica que el backup se pueda leer y que no esté vacío.

## Instalación nueva

Ejecuta solo `database/schema.sql`. No ejecutes las migraciones después.

## Base existente

Ejecuta **una sola vez**, en este orden, las migraciones que falten:

1. `2026-11-01-evaluaciones-personal.sql`
2. `2026-11-02-observaciones-evaluaciones.sql`
3. `2026-11-06-evaluaciones-conocimiento.sql`
4. `2026-11-06-sugerencias.sql`
5. `2026-11-09-banco-preguntas-conocimiento.sql`
6. `2026-11-09-puntuacion-parcial-evaluaciones.sql`
7. `2026-11-11-evaluaciones-seleccion.sql`
8. `2026-11-11-seleccion-candidatos.sql`
9. `2026-11-11-codigos-acceso-candidatos.sql`
10. `2026-11-11-cuentas-candidatos-curriculum.sql`
11. `2026-11-12-resultados-automaticos-seleccion.sql`
12. `2026-11-18-plantillas-seleccion-versionadas.sql`

La migración 12 crea `seleccion_plantillas`, `seleccion_plantilla_versiones` y agrega `plantilla_version_id` a `candidatos_seleccion_intentos`. También agrega `activo` a las cuentas de candidato y los campos de archivado/auditoría a `candidatos_seleccion`. Los intentos anteriores quedan con ese campo en `NULL` y siguen usando el resultado ya calculado. Las cuentas existentes quedan activas. Después de aplicarla, las plantillas se generan desde el config actual la primera vez que se editan desde Administración; no hay que cargarlas a mano.

Antes de cada una, comprueba con `SHOW TABLES;` y `SHOW COLUMNS FROM <tabla>;` si ya fue aplicada. Varias migraciones usan `CREATE TABLE` o `ALTER TABLE` directos y no son idempotentes.

## Si falla la migración del 2026-11-12 con error 1050

No elimines `candidatos_seleccion_intentos`. Compara:

```sql
SHOW CREATE TABLE candidatos_seleccion_intentos;
SHOW CREATE TABLE candidatos_seleccion;
```

- Si la tabla de intentos coincide con la migración y a `candidatos_seleccion` le faltan las columnas de reintento y su clave foránea, ejecuta únicamente el `ALTER TABLE` de esa migración.
- Si ya existen las columnas o el esquema difiere, detente y revisa la diferencia antes de modificar nada.

## Después de migrar

1. Verifica tablas y columnas nuevas con `SHOW CREATE TABLE`.
2. Reinicia la API para descartar cachés de conexión.
3. Los dos administradores (`SUR-GG-001`, `SUR-AC-002`) deben iniciar sesión de nuevo para recibir el rol actualizado en el JWT.
4. Ejecuta `npm --prefix frontend run build`, `npm --prefix frontend test -- --watch=false` y `npm --prefix backend test`.
5. Registra en el historial de despliegues el commit aplicado y la fecha del backup.
