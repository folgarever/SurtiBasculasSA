USE defaultdb;

CREATE TABLE candidatos_seleccion_intentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidato_id INT NOT NULL,
    numero_intento SMALLINT UNSIGNED NOT NULL,
    puesto_id INT NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    respuestas JSON NOT NULL,
    puntaje_aptitudes DECIMAL(5, 2) NOT NULL,
    puntaje_conocimientos DECIMAL(5, 2) NOT NULL,
    puntaje_practica DECIMAL(5, 2) NOT NULL,
    puntaje_valores DECIMAL(5, 2) NOT NULL,
    puntaje_total DECIMAL(6, 2) NOT NULL,
    respuestas_correctas SMALLINT UNSIGNED NOT NULL,
    total_preguntas SMALLINT UNSIGNED NOT NULL,
    porcentaje_correctas DECIMAL(5, 2) NOT NULL,
    decision ENUM('recomendable', 'revision_adicional', 'no_demostrada') NOT NULL,
    reintento_autorizado_por INT NULL,
    reintento_motivo VARCHAR(500) NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_candidatos_intento (candidato_id, numero_intento),
    INDEX idx_candidatos_intento_puesto_fecha (puesto_id, fecha_evaluacion),
    FOREIGN KEY (candidato_id) REFERENCES candidatos_seleccion(id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id),
    FOREIGN KEY (reintento_autorizado_por) REFERENCES empleados(id)
) ENGINE=InnoDB;

ALTER TABLE candidatos_seleccion
    ADD COLUMN reintento_autorizado_por INT NULL,
    ADD COLUMN reintento_motivo VARCHAR(500) NULL,
    ADD CONSTRAINT fk_candidatos_reintento_admin
        FOREIGN KEY (reintento_autorizado_por) REFERENCES empleados(id);
