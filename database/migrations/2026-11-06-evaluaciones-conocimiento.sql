USE defaultdb;

ALTER TABLE puestos
    ADD COLUMN departamento VARCHAR(100) NOT NULL DEFAULT 'General';

UPDATE puestos
SET departamento = CASE codigo_abreviatura
    WHEN 'GG' THEN 'Gerencia'
    WHEN 'AC' THEN 'Comercial y Recursos Humanos'
    WHEN 'VEN' THEN 'Comercial y Recursos Humanos'
    WHEN 'AUXC' THEN 'Administración y Finanzas'
    WHEN 'JM' THEN 'Mantenimiento'
    WHEN 'TEC' THEN 'Mantenimiento'
    WHEN 'AUXTEC' THEN 'Mantenimiento'
    WHEN 'DC' THEN 'Calidad y Metrología'
    WHEN 'MET' THEN 'Calidad y Metrología'
    WHEN 'AUXLAB' THEN 'Calidad y Metrología'
    ELSE 'General'
END
WHERE id > 0;

CREATE TABLE evaluaciones_conocimiento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    puesto_id INT NOT NULL,
    periodo CHAR(7) NOT NULL,
    preguntas JSON NOT NULL,
    respuestas JSON NULL,
    total_preguntas TINYINT UNSIGNED NOT NULL,
    respuestas_correctas TINYINT UNSIGNED NULL,
    porcentaje TINYINT UNSIGNED NULL,
    estado ENUM('pendiente', 'completada') NOT NULL DEFAULT 'pendiente',
    resultado ENUM('Aprobado', 'Requiere refuerzo') NULL,
    fecha_realizacion TIMESTAMP NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_eval_conocimiento_periodo CHECK (periodo REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT chk_eval_conocimiento_puntaje CHECK (porcentaje IS NULL OR porcentaje BETWEEN 0 AND 100),
    CONSTRAINT uq_eval_conocimiento_empleado_periodo UNIQUE (empleado_id, periodo),
    INDEX idx_eval_conocimiento_periodo_estado (periodo, estado),
    INDEX idx_eval_conocimiento_puesto_periodo (puesto_id, periodo),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
) ENGINE=InnoDB;
