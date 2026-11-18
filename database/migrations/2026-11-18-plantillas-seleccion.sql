-- Plantillas de selección editables sin versionado.
-- La definición vigente vive en seleccion_plantillas.definicion y se actualiza en el lugar.
-- Cada intento guarda definicion_snapshot con la prueba exacta que se calificó.

CREATE TABLE IF NOT EXISTS seleccion_plantillas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    puesto_id INT NOT NULL UNIQUE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    activa TINYINT(1) NOT NULL DEFAULT 1,
    definicion JSON NULL,
    creado_por INT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (puesto_id) REFERENCES puestos(id),
    FOREIGN KEY (creado_por) REFERENCES empleados(id)
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS sp_migrar_plantillas_seleccion;
DELIMITER $$
CREATE PROCEDURE sp_migrar_plantillas_seleccion()
BEGIN
    DECLARE nombre_fk VARCHAR(64);
    DECLARE fin_fk BOOLEAN DEFAULT FALSE;
    DECLARE cursor_fk_version CURSOR FOR
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion_intentos'
          AND COLUMN_NAME = 'plantilla_version_id'
          AND REFERENCED_TABLE_NAME = 'seleccion_plantilla_versiones';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin_fk = TRUE;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'seleccion_plantillas'
          AND COLUMN_NAME = 'definicion'
    ) THEN
        ALTER TABLE seleccion_plantillas ADD COLUMN definicion JSON NULL AFTER activa;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'seleccion_plantillas'
          AND COLUMN_NAME = 'creado_por'
    ) THEN
        ALTER TABLE seleccion_plantillas ADD COLUMN creado_por INT NULL AFTER definicion;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'seleccion_plantilla_versiones'
    ) THEN
        UPDATE seleccion_plantillas p
        SET p.definicion = (
            SELECT v.definicion
            FROM seleccion_plantilla_versiones v
            WHERE v.plantilla_id = p.id
            ORDER BY FIELD(v.estado, 'publicada', 'archivada', 'borrador'), v.numero DESC
            LIMIT 1
        )
        WHERE p.id > 0 AND p.definicion IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion_intentos'
          AND COLUMN_NAME = 'definicion_snapshot'
    ) THEN
        ALTER TABLE candidatos_seleccion_intentos ADD COLUMN definicion_snapshot JSON NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'seleccion_plantilla_versiones'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion_intentos'
          AND COLUMN_NAME = 'plantilla_version_id'
    ) THEN
        UPDATE candidatos_seleccion_intentos i
        INNER JOIN seleccion_plantilla_versiones v ON v.id = i.plantilla_version_id
        SET i.definicion_snapshot = v.definicion
        WHERE i.id > 0 AND i.definicion_snapshot IS NULL;
    END IF;

    OPEN cursor_fk_version;
    leer_fk_version: LOOP
        FETCH cursor_fk_version INTO nombre_fk;
        IF fin_fk THEN LEAVE leer_fk_version; END IF;
        SET @sql_fk = CONCAT(
            'ALTER TABLE candidatos_seleccion_intentos DROP FOREIGN KEY `', nombre_fk, '`'
        );
        PREPARE sentencia_fk FROM @sql_fk;
        EXECUTE sentencia_fk;
        DEALLOCATE PREPARE sentencia_fk;
    END LOOP;
    CLOSE cursor_fk_version;

    IF EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion_intentos'
          AND INDEX_NAME = 'idx_seleccion_intento_version'
    ) THEN
        ALTER TABLE candidatos_seleccion_intentos DROP INDEX idx_seleccion_intento_version;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion_intentos'
          AND COLUMN_NAME = 'plantilla_version_id'
    ) THEN
        ALTER TABLE candidatos_seleccion_intentos DROP COLUMN plantilla_version_id;
    END IF;

    DROP TABLE IF EXISTS seleccion_plantilla_versiones;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion_accesos'
          AND COLUMN_NAME = 'activo'
    ) THEN
        ALTER TABLE candidatos_seleccion_accesos ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion'
          AND COLUMN_NAME = 'archivado_en'
    ) THEN
        ALTER TABLE candidatos_seleccion ADD COLUMN archivado_en TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion'
          AND COLUMN_NAME = 'archivado_por'
    ) THEN
        ALTER TABLE candidatos_seleccion ADD COLUMN archivado_por INT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion'
          AND COLUMN_NAME = 'perfil_actualizado_en'
    ) THEN
        ALTER TABLE candidatos_seleccion ADD COLUMN perfil_actualizado_en TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion'
          AND COLUMN_NAME = 'perfil_actualizado_por'
    ) THEN
        ALTER TABLE candidatos_seleccion ADD COLUMN perfil_actualizado_por INT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion'
          AND CONSTRAINT_NAME = 'fk_seleccion_candidato_archivado'
    ) THEN
        ALTER TABLE candidatos_seleccion
            ADD CONSTRAINT fk_seleccion_candidato_archivado
            FOREIGN KEY (archivado_por) REFERENCES empleados(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'candidatos_seleccion'
          AND CONSTRAINT_NAME = 'fk_seleccion_candidato_perfil_actualizado'
    ) THEN
        ALTER TABLE candidatos_seleccion
            ADD CONSTRAINT fk_seleccion_candidato_perfil_actualizado
            FOREIGN KEY (perfil_actualizado_por) REFERENCES empleados(id);
    END IF;
END$$
DELIMITER ;

CALL sp_migrar_plantillas_seleccion();
DROP PROCEDURE IF EXISTS sp_migrar_plantillas_seleccion;
