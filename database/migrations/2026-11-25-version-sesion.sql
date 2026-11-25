USE defaultdb;

ALTER TABLE empleados
    ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE candidatos_seleccion_accesos
    ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0;
