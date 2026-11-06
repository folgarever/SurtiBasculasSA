USE defaultdb;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO roles (nombre) VALUES
    ('Empleado'),
    ('Recursos Humanos'),
    ('Jefe Autorizado'),
    ('ADMIN');

CREATE TABLE puestos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_abreviatura VARCHAR(10) NOT NULL UNIQUE,
    nombre_puesto VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL DEFAULT 'General'
) ENGINE=InnoDB;

INSERT INTO puestos (codigo_abreviatura, nombre_puesto, departamento) VALUES
    ('GG', 'Gerente General', 'Gerencia'),
    ('AC', 'Asistente Comercial y RR. HH.', 'Comercial y Recursos Humanos'),
    ('VEN', 'Vendedor', 'Comercial y Recursos Humanos'),
    ('AUXC', 'Auxiliar Contable', 'Administración y Finanzas'),
    ('JM', 'Jefe de Mantenimiento', 'Mantenimiento'),
    ('TEC', 'Técnico', 'Mantenimiento'),
    ('AUXTEC', 'Auxiliar Técnico', 'Mantenimiento'),
    ('DC', 'Director de Calidad', 'Calidad y Metrología'),
    ('MET', 'Metrológico', 'Calidad y Metrología'),
    ('AUXLAB', 'Auxiliar de Laboratorio', 'Calidad y Metrología');

CREATE TABLE horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_horario VARCHAR(50) NOT NULL,
    hora_entrada TIME NOT NULL DEFAULT '08:00:00',
    hora_salida TIME NOT NULL DEFAULT '17:00:00',
    dias_laborales VARCHAR(100) NOT NULL DEFAULT 'Lunes,Martes,Miércoles,Jueves,Viernes'
) ENGINE=InnoDB;

INSERT INTO horarios (nombre_horario, hora_entrada, hora_salida, dias_laborales)
VALUES ('Estándar SURTIBASCULAS', '08:00:00', '17:00:00', 'Lunes,Martes,Miércoles,Jueves,Viernes');

CREATE TABLE empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_empleado VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    puesto_id INT NOT NULL,
    horario_id INT NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id),
    FOREIGN KEY (horario_id) REFERENCES horarios(id)
) ENGINE=InnoDB;

-- Empleados SURTIBASCULAS S.A.
-- Contraseña inicial: 123456 (cambiar después del primer inicio de sesión)
INSERT INTO empleados (codigo_empleado, nombre, password_hash, rol_id, puesto_id, horario_id, activo) VALUES
    ('SUR-GG-001', 'Héctor Ortiz', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='ADMIN'), (SELECT id FROM puestos WHERE codigo_abreviatura='GG'), 1, 1),
    ('SUR-AC-002', 'Mafer García', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='ADMIN'), (SELECT id FROM puestos WHERE codigo_abreviatura='AC'), 1, 1),
    ('SUR-VEN-003', 'Sebastián Farfán', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='VEN'), 1, 1),
    ('SUR-AUXC-004', 'Jefferson López', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='AUXC'), 1, 1),
    ('SUR-JM-005', 'Por confirmar', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='JM'), 1, 1),
    ('SUR-TEC-006', 'Erick', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='TEC'), 1, 1),
    ('SUR-TEC-007', 'Ostman', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='TEC'), 1, 1),
    ('SUR-AUXTEC-008', 'Josué', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='AUXTEC'), 1, 1),
    ('SUR-AUXTEC-009', 'Marvin', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='AUXTEC'), 1, 1),
    ('SUR-AUXTEC-010', 'Eddy', '$2b$10$Agx1aYuJzHgrNUR3mKrwmufuSp6A78m.mo4ClxF3Otx5P5Hd88v4S', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='AUXTEC'), 1, 1);

CREATE TABLE marcaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_entrada DATETIME NULL,
    hora_salida DATETIME NULL,
    estado_entrada ENUM('puntual', 'atraso') DEFAULT 'puntual',
    estado_salida ENUM('normal', 'anticipada') DEFAULT 'normal',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    CONSTRAINT uq_empleado_fecha UNIQUE (empleado_id, fecha)
) ENGINE=InnoDB;

CREATE TABLE incidencias_permisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    tipo ENUM('permiso_oficial', 'ausencia_justificada', 'suspension', 'vacaciones') NOT NULL,
    motivo TEXT NOT NULL,
    registrado_por INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (registrado_por) REFERENCES empleados(id)
) ENGINE=InnoDB;

CREATE TABLE historial_correcciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marcacion_id INT NOT NULL,
    modificado_por INT NOT NULL,
    hora_entrada_anterior DATETIME NULL,
    hora_salida_anterior DATETIME NULL,
    hora_entrada_nueva DATETIME NULL,
    hora_salida_nueva DATETIME NULL,
    motivo_modificacion TEXT NOT NULL,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marcacion_id) REFERENCES marcaciones(id),
    FOREIGN KEY (modificado_por) REFERENCES empleados(id)
) ENGINE=InnoDB;

CREATE TABLE evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    evaluador_id INT NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    periodo VARCHAR(100) NOT NULL,
    presentacion TINYINT UNSIGNED NOT NULL,
    desempeno TINYINT UNSIGNED NOT NULL,
    atencion_cliente TINYINT UNSIGNED NOT NULL,
    puntualidad TINYINT UNSIGNED NOT NULL,
    conocimientos TINYINT UNSIGNED NOT NULL,
    comentarios TEXT NULL,
    observaciones JSON NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_evaluaciones_presentacion CHECK (presentacion BETWEEN 1 AND 5),
    CONSTRAINT chk_evaluaciones_desempeno CHECK (desempeno BETWEEN 1 AND 5),
    CONSTRAINT chk_evaluaciones_atencion CHECK (atencion_cliente BETWEEN 1 AND 5),
    CONSTRAINT chk_evaluaciones_puntualidad CHECK (puntualidad BETWEEN 1 AND 5),
    CONSTRAINT chk_evaluaciones_conocimientos CHECK (conocimientos BETWEEN 1 AND 5),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (evaluador_id) REFERENCES empleados(id),
    INDEX idx_evaluaciones_empleado_fecha (empleado_id, fecha_evaluacion)
) ENGINE=InnoDB;

CREATE TABLE evaluaciones_jefatura (
    evaluacion_id INT PRIMARY KEY,
    supervision_operaciones TINYINT UNSIGNED NOT NULL,
    gestion_liderazgo_campo TINYINT UNSIGNED NOT NULL,
    control_calidad_calibracion TINYINT UNSIGNED NOT NULL,
    gestion_recursos_inventario TINYINT UNSIGNED NOT NULL,
    atencion_tecnica_cliente TINYINT UNSIGNED NOT NULL,
    liderazgo_personal TINYINT UNSIGNED NOT NULL,
    toma_decisiones_presion TINYINT UNSIGNED NOT NULL,
    pensamiento_analitico TINYINT UNSIGNED NOT NULL,
    organizacion_planificacion TINYINT UNSIGNED NOT NULL,
    CONSTRAINT chk_jefatura_supervision CHECK (supervision_operaciones BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_liderazgo_campo CHECK (gestion_liderazgo_campo BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_calidad CHECK (control_calidad_calibracion BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_recursos CHECK (gestion_recursos_inventario BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_atencion CHECK (atencion_tecnica_cliente BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_liderazgo CHECK (liderazgo_personal BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_decisiones CHECK (toma_decisiones_presion BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_analitico CHECK (pensamiento_analitico BETWEEN 1 AND 5),
    CONSTRAINT chk_jefatura_organizacion CHECK (organizacion_planificacion BETWEEN 1 AND 5),
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluaciones_conocimiento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    puesto_id INT NOT NULL,
    periodo CHAR(7) NOT NULL,
    preguntas JSON NOT NULL,
    respuestas JSON NULL,
    total_preguntas TINYINT UNSIGNED NOT NULL,
    respuestas_correctas TINYINT UNSIGNED NULL,
    porcentaje TINYINT UNSIGNED NULL,
    estado ENUM('pendiente', 'completada') NOT NULL DEFAULT 'pendiente',
    resultado ENUM('Aprobado', 'Requiere refuerzo') NULL,
    fecha_realizacion TIMESTAMP NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_eval_conocimiento_periodo CHECK (periodo REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT chk_eval_conocimiento_puntaje CHECK (porcentaje IS NULL OR porcentaje BETWEEN 0 AND 100),
    CONSTRAINT uq_eval_conocimiento_empleado_periodo UNIQUE (empleado_id, periodo),
    INDEX idx_eval_conocimiento_periodo_estado (periodo, estado),
    INDEX idx_eval_conocimiento_puesto_periodo (puesto_id, periodo),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
) ENGINE=InnoDB;

CREATE TABLE sugerencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respuesta TEXT NULL,
    respondido_por INT NULL,
    respondido_en TIMESTAMP NULL,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (respondido_por) REFERENCES empleados(id),
    INDEX idx_sugerencias_empleado_fecha (empleado_id, creado_en),
    INDEX idx_sugerencias_estado_fecha (respondido_en, creado_en)
) ENGINE=InnoDB;
