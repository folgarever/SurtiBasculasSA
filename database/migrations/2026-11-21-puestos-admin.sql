USE defaultdb;

-- Indicador de permisos ADMIN por puesto. Permite al Gerente General decidir
-- qué puestos otorgan acceso administrador al dar de alta a sus empleados.
-- El campo es el punto de partida para ampliar permisos por puesto en el futuro.

DROP PROCEDURE IF EXISTS sp_migrar_puestos_admin;
DELIMITER $$
CREATE PROCEDURE sp_migrar_puestos_admin()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'puestos'
          AND COLUMN_NAME = 'es_admin'
    ) THEN
        ALTER TABLE puestos
            ADD COLUMN es_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER frecuencia_evaluacion;
    END IF;

    -- Los puestos de las cuentas ADMIN actuales conservan su jerarquía.
    UPDATE puestos
    SET es_admin = 1
    WHERE id > 0
      AND codigo_abreviatura IN ('GG', 'AC');
END$$
DELIMITER ;

CALL sp_migrar_puestos_admin();
DROP PROCEDURE IF EXISTS sp_migrar_puestos_admin;
