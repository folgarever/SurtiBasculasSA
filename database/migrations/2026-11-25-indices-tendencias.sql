USE defaultdb;

CREATE INDEX idx_eval_conocimiento_realizacion
    ON evaluaciones_conocimiento (fecha_realizacion);

CREATE INDEX idx_marcaciones_fecha
    ON marcaciones (fecha);

CREATE INDEX idx_candidato_acceso_creado
    ON candidatos_seleccion_accesos (creado_en);
