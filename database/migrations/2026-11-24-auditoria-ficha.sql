USE defaultdb;

-- Bitácora de la ficha de personal: quién cambió qué campos y quién descargó el currículum.
-- Solo guarda los nombres de los campos modificados, nunca sus valores (el DPI es un dato sensible).
-- Requiere la migración 2026-11-24-ficha-empleados.sql.

CREATE TABLE IF NOT EXISTS empleados_ficha_auditoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    usuario_id INT NULL,
    accion VARCHAR(30) NOT NULL,
    campos VARCHAR(255) NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ficha_auditoria_empleado (empleado_id, creado_en),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB;
