USE defaultdb;

-- Horas extras completas y justificación de salidas posteriores a las 18:00.
-- Se agrega "tolerancia" al ENUM de entrada para identificar 08:00-08:15.

DROP PROCEDURE IF EXISTS sp_migrar_horas_extras_justificacion;
DELIMITER $$
CREATE PROCEDURE sp_migrar_horas_extras_justificacion()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'marcaciones'
          AND COLUMN_NAME = 'estado_entrada'
          AND COLUMN_TYPE LIKE '%tolerancia%'
    ) THEN
        ALTER TABLE marcaciones
            MODIFY COLUMN estado_entrada ENUM('puntual', 'tolerancia', 'atraso') DEFAULT 'puntual';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'marcaciones'
          AND COLUMN_NAME = 'horas_extras'
    ) THEN
        ALTER TABLE marcaciones
            ADD COLUMN horas_extras SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER estado_salida;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'marcaciones'
          AND COLUMN_NAME = 'justificacion_horas_extras'
    ) THEN
        ALTER TABLE marcaciones
            ADD COLUMN justificacion_horas_extras TEXT NULL AFTER horas_extras;
    END IF;

    UPDATE marcaciones
    SET horas_extras = GREATEST(0, TIMESTAMPDIFF(HOUR, '1970-01-01 18:00:00',
        CONCAT('1970-01-01 ', TIME(hora_salida))))
    WHERE id > 0 AND hora_salida IS NOT NULL AND TIME(hora_salida) >= '18:00:00';
END$$
DELIMITER ;

CALL sp_migrar_horas_extras_justificacion();
DROP PROCEDURE IF EXISTS sp_migrar_horas_extras_justificacion;
