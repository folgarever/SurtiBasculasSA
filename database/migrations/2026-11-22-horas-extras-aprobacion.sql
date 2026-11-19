USE defaultdb;

-- Aprobación de horas extras con trazabilidad.
-- Los registros históricos con horas extras quedan pendientes de revisión.

DROP PROCEDURE IF EXISTS sp_migrar_horas_extras_aprobacion;
DELIMITER $$
CREATE PROCEDURE sp_migrar_horas_extras_aprobacion()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'marcaciones'
          AND COLUMN_NAME = 'extras_estado'
    ) THEN
        ALTER TABLE marcaciones
            ADD COLUMN extras_estado
            ENUM('sin_extras', 'pendiente', 'aprobada', 'rechazada')
            NOT NULL DEFAULT 'sin_extras' AFTER justificacion_horas_extras;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'marcaciones'
          AND COLUMN_NAME = 'extras_aprobado_por'
    ) THEN
        ALTER TABLE marcaciones
            ADD COLUMN extras_aprobado_por INT NULL AFTER extras_estado;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'marcaciones'
          AND COLUMN_NAME = 'extras_aprobado_en'
    ) THEN
        ALTER TABLE marcaciones
            ADD COLUMN extras_aprobado_en TIMESTAMP NULL AFTER extras_aprobado_por;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'marcaciones'
          AND COLUMN_NAME = 'extras_rechazo_motivo'
    ) THEN
        ALTER TABLE marcaciones
            ADD COLUMN extras_rechazo_motivo TEXT NULL AFTER extras_aprobado_en;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'marcaciones'
          AND CONSTRAINT_NAME = 'fk_marcaciones_extras_aprobado_por'
    ) THEN
        ALTER TABLE marcaciones
            ADD CONSTRAINT fk_marcaciones_extras_aprobado_por
            FOREIGN KEY (extras_aprobado_por) REFERENCES empleados(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'marcaciones'
          AND INDEX_NAME = 'idx_marcaciones_extras_estado'
    ) THEN
        ALTER TABLE marcaciones
            ADD INDEX idx_marcaciones_extras_estado (extras_estado, fecha);
    END IF;

    UPDATE marcaciones
    SET extras_estado = 'pendiente'
    WHERE id > 0 AND horas_extras > 0 AND extras_estado = 'sin_extras';
END$$
DELIMITER ;

CALL sp_migrar_horas_extras_aprobacion();
DROP PROCEDURE IF EXISTS sp_migrar_horas_extras_aprobacion;
