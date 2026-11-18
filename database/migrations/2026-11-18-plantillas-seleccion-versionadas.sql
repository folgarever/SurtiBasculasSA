-- Plantillas de selección editables y versionadas, y control ADMIN de cuentas de candidato.
-- Los intentos guardan la versión con la que se aplicaron para no alterar resultados históricos.

CREATE TABLE seleccion_plantillas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    puesto_id INT NOT NULL UNIQUE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    activa TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
) ENGINE=InnoDB;

CREATE TABLE seleccion_plantilla_versiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plantilla_id INT NOT NULL,
    numero INT NOT NULL,
    estado ENUM('borrador', 'publicada', 'archivada') NOT NULL DEFAULT 'borrador',
    definicion JSON NOT NULL,
    notas VARCHAR(500) NULL,
    creado_por INT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    publicada_en TIMESTAMP NULL,
    UNIQUE KEY uq_seleccion_plantilla_version (plantilla_id, numero),
    FOREIGN KEY (plantilla_id) REFERENCES seleccion_plantillas(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por) REFERENCES empleados(id)
) ENGINE=InnoDB;

ALTER TABLE candidatos_seleccion_intentos
    ADD COLUMN plantilla_version_id INT NULL,
    ADD INDEX idx_seleccion_intento_version (plantilla_version_id),
    ADD CONSTRAINT fk_seleccion_intento_version
        FOREIGN KEY (plantilla_version_id) REFERENCES seleccion_plantilla_versiones(id);

ALTER TABLE candidatos_seleccion_accesos
    ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE candidatos_seleccion
    ADD COLUMN archivado_en TIMESTAMP NULL,
    ADD COLUMN archivado_por INT NULL,
    ADD COLUMN perfil_actualizado_en TIMESTAMP NULL,
    ADD COLUMN perfil_actualizado_por INT NULL,
    ADD CONSTRAINT fk_seleccion_candidato_archivado
        FOREIGN KEY (archivado_por) REFERENCES empleados(id),
    ADD CONSTRAINT fk_seleccion_candidato_perfil_actualizado
        FOREIGN KEY (perfil_actualizado_por) REFERENCES empleados(id);
