USE defaultdb;

-- Frecuencia de evaluaciones de conocimiento configurable por puesto.
-- El banco de preguntas pasa a ser por puesto y periodo.
-- Los registros existentes se asocian al periodo mensual vigente al aplicar la migración.

DROP PROCEDURE IF EXISTS sp_migrar_frecuencia_evaluaciones;
DELIMITER $$
CREATE PROCEDURE sp_migrar_frecuencia_evaluaciones()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'puestos'
          AND COLUMN_NAME = 'frecuencia_evaluacion'
    ) THEN
        ALTER TABLE puestos
            ADD COLUMN frecuencia_evaluacion ENUM('mensual', 'quincenal', 'semanal')
            NOT NULL DEFAULT 'mensual' AFTER departamento;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'evaluaciones_banco_preguntas'
          AND COLUMN_NAME = 'periodo'
    ) THEN
        ALTER TABLE evaluaciones_banco_preguntas
            ADD COLUMN periodo VARCHAR(10) NULL AFTER puesto_id;
    END IF;

    SET @periodo_inicial = DATE_FORMAT(CURDATE(), '%Y-%m');

    UPDATE evaluaciones_banco_preguntas
    SET periodo = @periodo_inicial
    WHERE id > 0 AND periodo IS NULL;

    ALTER TABLE evaluaciones_banco_preguntas
        MODIFY COLUMN periodo VARCHAR(10) NOT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'evaluaciones_banco_preguntas'
          AND INDEX_NAME = 'idx_banco_preguntas_puesto_periodo'
    ) THEN
        ALTER TABLE evaluaciones_banco_preguntas
            ADD INDEX idx_banco_preguntas_puesto_periodo (puesto_id, periodo, orden, id);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'evaluaciones_conocimiento'
          AND CONSTRAINT_NAME = 'chk_eval_conocimiento_periodo'
          AND CONSTRAINT_TYPE = 'CHECK'
    ) THEN
        ALTER TABLE evaluaciones_conocimiento
            DROP CHECK chk_eval_conocimiento_periodo;
    END IF;

    ALTER TABLE evaluaciones_conocimiento
        MODIFY COLUMN periodo VARCHAR(10) NOT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'evaluaciones_conocimiento'
          AND CONSTRAINT_NAME = 'chk_eval_conocimiento_periodo'
          AND CONSTRAINT_TYPE = 'CHECK'
    ) THEN
        ALTER TABLE evaluaciones_conocimiento
            ADD CONSTRAINT chk_eval_conocimiento_periodo
            CHECK (periodo REGEXP '^([0-9]{4}-(0[1-9]|1[0-2])|[0-9]{4}-(0[1-9]|1[0-2])-Q[12]|[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3]))$');
    END IF;
END$$
DELIMITER ;

CALL sp_migrar_frecuencia_evaluaciones();
DROP PROCEDURE IF EXISTS sp_migrar_frecuencia_evaluaciones;
