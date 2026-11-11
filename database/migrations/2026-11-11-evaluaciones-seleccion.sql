USE defaultdb;

INSERT INTO puestos (codigo_abreviatura, nombre_puesto, departamento)
SELECT 'ASISTADM', 'Asistente administrativo y contable', 'Administración y Finanzas'
WHERE NOT EXISTS (
    SELECT 1 FROM puestos WHERE codigo_abreviatura = 'ASISTADM'
);

CREATE TABLE evaluaciones_seleccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidato VARCHAR(120) NOT NULL,
    puesto_id INT NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    puntaje_aptitudes DECIMAL(5, 2) NOT NULL,
    puntaje_conocimientos DECIMAL(5, 2) NOT NULL,
    puntaje_practica DECIMAL(5, 2) NOT NULL,
    puntaje_valores DECIMAL(5, 2) NOT NULL,
    puntaje_total DECIMAL(6, 2) NOT NULL,
    discrepancia_pendiente TINYINT NOT NULL DEFAULT 0,
    riesgo_control_pendiente TINYINT NOT NULL DEFAULT 0,
    decision ENUM('recomendable', 'revision_adicional', 'no_demostrada') NOT NULL,
    observaciones TEXT NULL,
    evaluador_id INT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_seleccion_aptitudes CHECK (puntaje_aptitudes BETWEEN 0 AND 10),
    CONSTRAINT chk_seleccion_conocimientos CHECK (puntaje_conocimientos BETWEEN 0 AND 20),
    CONSTRAINT chk_seleccion_practica CHECK (puntaje_practica BETWEEN 0 AND 55),
    CONSTRAINT chk_seleccion_valores CHECK (puntaje_valores BETWEEN 0 AND 15),
    CONSTRAINT chk_seleccion_total CHECK (puntaje_total BETWEEN 0 AND 100),
    INDEX idx_seleccion_puesto_fecha (puesto_id, fecha_evaluacion),
    INDEX idx_seleccion_fecha (fecha_evaluacion),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id),
    FOREIGN KEY (evaluador_id) REFERENCES empleados(id)
) ENGINE=InnoDB;
