USE defaultdb;

-- Ficha de personal: datos operativos de cada empleado y su currículum en PDF.
-- Vive en una tabla aparte para no cargar el archivo en las consultas del directorio.
-- Los empleados que ya existen no tienen fila: se completan gradualmente desde la app.

CREATE TABLE IF NOT EXISTS empleados_ficha (
    empleado_id INT NOT NULL PRIMARY KEY,
    nombre_completo VARCHAR(150) NULL,
    dpi CHAR(13) NULL,
    fecha_nacimiento DATE NULL,
    correo VARCHAR(120) NULL,
    telefono VARCHAR(20) NULL,
    fecha_ingreso DATE NULL,
    cv_nombre VARCHAR(150) NULL,
    cv_contenido LONGBLOB NULL,
    cv_actualizado_en TIMESTAMP NULL,
    actualizado_por INT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_empleados_ficha_dpi (dpi),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (actualizado_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB;
