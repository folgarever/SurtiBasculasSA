USE defaultdb;

-- Las sugerencias o quejas pueden enviarse de forma anónima.
-- El vínculo con el empleado se conserva internamente para que el autor pueda ver las respuestas,
-- pero el panel administrativo y la actividad reciente no muestran su identidad.

DROP PROCEDURE IF EXISTS sp_migrar_sugerencias_anonimas;
DELIMITER $$
CREATE PROCEDURE sp_migrar_sugerencias_anonimas()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sugerencias'
          AND COLUMN_NAME = 'anonima'
    ) THEN
        ALTER TABLE sugerencias
            ADD COLUMN anonima TINYINT(1) NOT NULL DEFAULT 0 AFTER descripcion;
    END IF;
END$$
DELIMITER ;

CALL sp_migrar_sugerencias_anonimas();
DROP PROCEDURE IF EXISTS sp_migrar_sugerencias_anonimas;
