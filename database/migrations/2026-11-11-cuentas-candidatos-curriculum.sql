USE defaultdb;

CREATE TABLE candidatos_seleccion_accesos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    anio SMALLINT UNSIGNED NOT NULL,
    secuencia SMALLINT UNSIGNED NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_candidatos_acceso_anio_secuencia (anio, secuencia)
) ENGINE=InnoDB;

CREATE TABLE candidatos_seleccion_secuencias (
    anio SMALLINT UNSIGNED PRIMARY KEY,
    ultimo_numero SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

ALTER TABLE candidatos_seleccion
    ADD COLUMN acceso_id INT NULL UNIQUE AFTER id,
    ADD COLUMN curriculum_nombre VARCHAR(255) NULL,
    ADD COLUMN curriculum_contenido LONGBLOB NULL,
    MODIFY COLUMN nombres VARCHAR(100) NULL,
    MODIFY COLUMN apellidos VARCHAR(120) NULL,
    MODIFY COLUMN fecha_nacimiento DATE NULL,
    MODIFY COLUMN puesto_id INT NULL,
    ADD CONSTRAINT fk_candidatos_seleccion_acceso
        FOREIGN KEY (acceso_id) REFERENCES candidatos_seleccion_accesos(id);
