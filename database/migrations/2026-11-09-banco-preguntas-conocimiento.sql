USE defaultdb;

CREATE TABLE evaluaciones_banco_inicializado (
    puesto_id INT PRIMARY KEY,
    inicializado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
) ENGINE=InnoDB;

CREATE TABLE evaluaciones_banco_preguntas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    puesto_id INT NOT NULL,
    texto VARCHAR(1000) NOT NULL,
    opciones JSON NOT NULL,
    respuesta_correcta TINYINT UNSIGNED NOT NULL,
    dificultad ENUM('facil', 'intermedio', 'dificil') NOT NULL DEFAULT 'intermedio',
    orden INT UNSIGNED NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_banco_preguntas_puesto_orden (puesto_id, orden, id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
) ENGINE=InnoDB;
