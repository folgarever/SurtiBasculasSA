USE defaultdb;

-- Documentos adicionales por empleado (copia de DPI, contrato, antecedentes, etc.) con vencimiento opcional.
-- El contenido vive en una tabla aparte para no cargar archivos en las consultas del directorio.
-- Requiere la migración 2026-11-24-ficha-empleados.sql.

CREATE TABLE IF NOT EXISTS empleados_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    contenido LONGBLOB NOT NULL,
    fecha_vencimiento DATE NULL,
    subido_por INT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_empleados_documentos_empleado (empleado_id),
    KEY idx_empleados_documentos_vencimiento (fecha_vencimiento),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (subido_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB;
