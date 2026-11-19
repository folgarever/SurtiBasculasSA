USE defaultdb;

-- Folio legible para dar seguimiento a sugerencias y quejas, incluso las anónimas.
-- Se deriva del año de creación y del identificador, por lo que no revela al autor.

DROP PROCEDURE IF EXISTS sp_migrar_sugerencias_folio;
DELIMITER $$
CREATE PROCEDURE sp_migrar_sugerencias_folio()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sugerencias'
          AND COLUMN_NAME = 'folio'
    ) THEN
        ALTER TABLE sugerencias
            ADD COLUMN folio VARCHAR(20) NULL AFTER id;
    END IF;

    UPDATE sugerencias
    SET folio = CONCAT('SG-', DATE_FORMAT(creado_en, '%Y'), '-', LPAD(id, 5, '0'))
    WHERE id > 0 AND (folio IS NULL OR folio = '');

    -- La columna queda nullable para que el alta pueda prenderse del id recién generado;
    -- la aplicación la completa de inmediato y la migración la backfillea para las filas previas.

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sugerencias'
          AND INDEX_NAME = 'uk_sugerencias_folio'
    ) THEN
        ALTER TABLE sugerencias
            ADD UNIQUE INDEX uk_sugerencias_folio (folio);
    END IF;
END$$
DELIMITER ;

CALL sp_migrar_sugerencias_folio();
DROP PROCEDURE IF EXISTS sp_migrar_sugerencias_folio;
