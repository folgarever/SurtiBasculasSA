USE defaultdb;

CREATE TABLE notificaciones_leidas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NULL,
    candidato_acceso_id INT NULL,
    notificacion_id VARCHAR(120) NOT NULL,
    marcador VARCHAR(4096) NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_notificacion_leida_empleado (empleado_id, notificacion_id),
    UNIQUE KEY uq_notificacion_leida_candidato (candidato_acceso_id, notificacion_id),
    CONSTRAINT chk_notificacion_leida_usuario
        CHECK ((empleado_id IS NULL) <> (candidato_acceso_id IS NULL)),
    CONSTRAINT fk_notificacion_leida_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacion_leida_candidato
        FOREIGN KEY (candidato_acceso_id) REFERENCES candidatos_seleccion_accesos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
