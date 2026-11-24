USE defaultdb;

CREATE TABLE IF NOT EXISTS solicitudes_ausencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    tipo ENUM('vacaciones', 'permiso') NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    motivo TEXT NOT NULL,
    estado ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
    revisado_por INT NULL,
    revisado_en TIMESTAMP NULL,
    motivo_revision TEXT NULL,
    incidencia_id INT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_solicitudes_ausencias_empleado (empleado_id, creado_en),
    KEY idx_solicitudes_ausencias_estado (estado, creado_en),
    UNIQUE KEY uq_solicitudes_ausencias_incidencia (incidencia_id),
    CONSTRAINT fk_solicitudes_ausencias_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    CONSTRAINT fk_solicitudes_ausencias_revisor
        FOREIGN KEY (revisado_por) REFERENCES empleados(id) ON DELETE SET NULL,
    CONSTRAINT fk_solicitudes_ausencias_incidencia
        FOREIGN KEY (incidencia_id) REFERENCES incidencias_permisos(id) ON DELETE SET NULL
) ENGINE=InnoDB;
