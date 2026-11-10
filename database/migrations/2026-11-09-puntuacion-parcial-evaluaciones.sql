USE defaultdb;

ALTER TABLE evaluaciones_banco_preguntas
    ADD COLUMN puntos_maximos DECIMAL(8, 2) NOT NULL DEFAULT 1.00;

ALTER TABLE evaluaciones_banco_preguntas
    DROP COLUMN dificultad;

ALTER TABLE evaluaciones_conocimiento
    ADD COLUMN puntos_obtenidos DECIMAL(10, 2) NULL,
    ADD COLUMN puntos_totales DECIMAL(10, 2) NULL;

UPDATE evaluaciones_conocimiento
SET puntos_obtenidos = respuestas_correctas,
    puntos_totales = total_preguntas
WHERE estado = 'completada'
  AND id > 0;
