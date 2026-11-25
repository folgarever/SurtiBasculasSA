ALTER TABLE empleados_ficha
    ADD COLUMN foto_nombre VARCHAR(150) NULL AFTER fecha_ingreso,
    ADD COLUMN foto_contenido LONGBLOB NULL AFTER foto_nombre,
    ADD COLUMN foto_mime VARCHAR(30) NULL AFTER foto_contenido,
    ADD COLUMN foto_actualizado_en TIMESTAMP NULL AFTER foto_mime;
