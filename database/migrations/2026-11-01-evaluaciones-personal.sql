USE defaultdb;

INSERT INTO roles (nombre)
SELECT 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'ADMIN');

UPDATE empleados
SET rol_id = (SELECT id FROM roles WHERE nombre = 'ADMIN')
WHERE codigo_empleado IN ('SUR-GG-001', 'SUR-AC-002');

UPDATE puestos
SET nombre_puesto = 'Asistente Comercial y RR. HH.'
WHERE codigo_abreviatura = 'AC';

UPDATE empleados
SET puesto_id = (SELECT id FROM puestos WHERE codigo_abreviatura = 'AUXTEC')
WHERE codigo_empleado = 'SUR-AUXTEC-009';

CREATE TABLE IF NOT EXISTS evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    evaluador_id INT NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    periodo VARCHAR(100) NOT NULL,
    presentacion TINYINT UNSIGNED NOT NULL,
    desempeno TINYINT UNSIGNED NOT NULL,
    atencion_cliente TINYINT UNSIGNED NOT NULL,
    puntualidad TINYINT UNSIGNED NOT NULL,
    conocimientos TINYINT UNSIGNED NOT NULL,
    comentarios TEXT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_evaluaciones_presentacion CHECK (presentacion BETWEEN 1 AND 5),
    CONSTRAINT chk_evaluaciones_desempeno CHECK (desempeno BETWEEN 1 AND 5),
    CONSTRAINT chk_evaluaciones_atencion CHECK (atencion_cliente BETWEEN 1 AND 5),
    CONSTRAINT chk_evaluaciones_puntualidad CHECK (puntualidad BETWEEN 1 AND 5),
    CONSTRAINT chk_evaluaciones_conocimientos CHECK (conocimientos BETWEEN 1 AND 5),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (evaluador_id) REFERENCES empleados(id),
    INDEX idx_evaluaciones_empleado_fecha (empleado_id, fecha_evaluacion)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evaluaciones_jefatura (
    evaluacion_id INT PRIMARY KEY,
    supervision_operaciones TINYINT UNSIGNED NOT NULL,
    gestion_liderazgo_campo TINYINT UNSIGNED NOT NULL,
    control_calidad_calibracion TINYINT UNSIGNED NOT NULL,
    gestion_recursos_inventario TINYINT UNSIGNED NOT NULL,
    atencion_tecnica_cliente TINYINT UNSIGNED NOT NULL,
    liderazgo_personal TINYINT UNSIGNED NOT NULL,
    toma_decisiones_presion TINYINT UNSIGNED NOT NULL,
    pensamiento_analitico TINYINT UNSIGNED NOT NULL,
    organizacion_planificacion TINYINT UNSIGNED NOT NULL,
    CONSTRAINT chk_jefatura_supervision CHECK (supervision_operaciones BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_liderazgo_campo CHECK (gestion_liderazgo_campo BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_calidad CHECK (control_calidad_calibracion BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_recursos CHECK (gestion_recursos_inventario BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_atencion CHECK (atencion_tecnica_cliente BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_liderazgo CHECK (liderazgo_personal BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_decisiones CHECK (toma_decisiones_presion BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_analitico CHECK (pensamiento_analitico BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_organizacion CHECK (organizacion_planificacion BETWEEN 1 AND 5),
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;
