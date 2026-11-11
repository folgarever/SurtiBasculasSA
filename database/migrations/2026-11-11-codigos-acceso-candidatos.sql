USE defaultdb;

ALTER TABLE candidatos_seleccion
    ADD COLUMN codigo_acceso_hash CHAR(64) NULL AFTER sesion_id,
    ADD UNIQUE INDEX uq_candidatos_codigo_acceso (codigo_acceso_hash);
