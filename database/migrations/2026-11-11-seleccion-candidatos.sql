USE defaultdb;

CREATE TABLE candidatos_seleccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sesion_id CHAR(36) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    puesto_id INT NOT NULL,
    respuestas JSON NULL,
    estado ENUM('registro', 'completada', 'evaluada') NOT NULL DEFAULT 'registro',
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completada_en TIMESTAMP NULL,
    INDEX idx_candidatos_puesto_estado (puesto_id, estado, creado_en),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
) ENGINE=InnoDB;

ALTER TABLE evaluaciones_seleccion
    MODIFY COLUMN discrepancia_pendiente TINYINT NOT NULL DEFAULT 0,
    MODIFY COLUMN riesgo_control_pendiente TINYINT NOT NULL DEFAULT 0,
    ADD COLUMN candidato_id INT NULL AFTER candidato,
    ADD UNIQUE INDEX uq_seleccion_candidato (candidato_id),
    ADD CONSTRAINT fk_seleccion_candidato
        FOREIGN KEY (candidato_id) REFERENCES candidatos_seleccion(id);
