USE defaultdb;

CREATE TABLE IF NOT EXISTS sugerencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respuesta TEXT NULL,
    respondido_por INT NULL,
    respondido_en TIMESTAMP NULL,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (respondido_por) REFERENCES empleados(id),
    INDEX idx_sugerencias_empleado_fecha (empleado_id, creado_en),
    INDEX idx_sugerencias_estado_fecha (respondido_en, creado_en)
) ENGINE=InnoDB;
