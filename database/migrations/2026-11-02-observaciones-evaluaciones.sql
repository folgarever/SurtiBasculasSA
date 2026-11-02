USE defaultdb;

SET @observaciones_column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'evaluaciones'
      AND COLUMN_NAME = 'observaciones'
);

SET @observaciones_migration = IF(
    @observaciones_column_exists = 0,
    'ALTER TABLE evaluaciones ADD COLUMN observaciones JSON NULL AFTER comentarios',
    'SELECT 1'
);

PREPARE observaciones_statement FROM @observaciones_migration;
EXECUTE observaciones_statement;
DEALLOCATE PREPARE observaciones_statement;
