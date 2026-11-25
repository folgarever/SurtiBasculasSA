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
    departamento VARCHAR(100) NOT NULL DEFAULT 'General',
    frecuencia_evaluacion ENUM('mensual', 'quincenal', 'semanal') NOT NULL DEFAULT 'mensual',
    es_admin TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT INTO puestos (codigo_abreviatura, nombre_puesto, departamento, es_admin) VALUES
    ('GG', 'Gerente General', 'Gerencia', 1),
    ('AC', 'Asistente Comercial y RR. HH.', 'Comercial y Recursos Humanos', 1),
    ('VEN', 'Vendedor', 'Comercial y Recursos Humanos', 0),
    ('AUXC', 'Auxiliar Contable', 'Administración y Finanzas', 0),
    ('JM', 'Jefe de Mantenimiento', 'Mantenimiento', 0),
    ('TEC', 'Técnico', 'Mantenimiento', 0),
    ('AUXTEC', 'Auxiliar Técnico', 'Mantenimiento', 0),
    ('DC', 'Director de Calidad', 'Calidad y Metrología', 0),
    ('MET', 'Metrológico', 'Calidad y Metrología', 0),
    ('AUXLAB', 'Auxiliar de Laboratorio', 'Calidad y Metrología', 0),
    ('ASISTADM', 'Asistente administrativo y contable', 'Administración y Finanzas', 0);

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
    session_version INT UNSIGNED NOT NULL DEFAULT 0,
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

-- Ficha de personal (datos operativos y currículum). Ver migración 2026-11-24.
CREATE TABLE empleados_ficha (
    empleado_id INT NOT NULL PRIMARY KEY,
    nombre_completo VARCHAR(150) NULL,
    dpi CHAR(13) NULL,
    fecha_nacimiento DATE NULL,
    correo VARCHAR(120) NULL,
    telefono VARCHAR(20) NULL,
    fecha_ingreso DATE NULL,
    foto_nombre VARCHAR(150) NULL,
    foto_contenido LONGBLOB NULL,
    foto_mime VARCHAR(30) NULL,
    foto_actualizado_en TIMESTAMP NULL,
    cv_nombre VARCHAR(150) NULL,
    cv_contenido LONGBLOB NULL,
    cv_actualizado_en TIMESTAMP NULL,
    actualizado_por INT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_empleados_ficha_dpi (dpi),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (actualizado_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Bitácora de la ficha: solo nombres de campos, nunca valores. Ver migración 2026-11-24-auditoria-ficha.
CREATE TABLE empleados_ficha_auditoria (
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

-- Documentos adicionales por empleado con vencimiento opcional. Ver migración 2026-11-24-documentos-empleados.
CREATE TABLE empleados_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    contenido LONGBLOB NOT NULL,
    fecha_vencimiento DATE NULL,
    subido_por INT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_empleados_documentos_empleado (empleado_id),
    KEY idx_empleados_documentos_vencimiento (fecha_vencimiento),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (subido_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE marcaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_entrada DATETIME NULL,
    hora_salida DATETIME NULL,
    estado_entrada ENUM('puntual', 'tolerancia', 'atraso') DEFAULT 'puntual',
    estado_salida ENUM('normal', 'anticipada') DEFAULT 'normal',
    horas_extras SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    justificacion_horas_extras TEXT NULL,
    extras_estado ENUM('sin_extras', 'pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'sin_extras',
    extras_aprobado_por INT NULL,
    extras_aprobado_en TIMESTAMP NULL,
    extras_rechazo_motivo TEXT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (extras_aprobado_por) REFERENCES empleados(id),
    INDEX idx_marcaciones_extras_estado (extras_estado, fecha),
    INDEX idx_marcaciones_fecha (fecha),
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

CREATE TABLE solicitudes_ausencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    tipo ENUM('vacaciones', 'permiso') NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    motivo TEXT NOT NULL,
    estado ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
    revisado_por INT NULL,
    revisado_en TIMESTAMP NULL,
    motivo_revision TEXT NULL,
    incidencia_id INT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_solicitudes_ausencias_empleado (empleado_id, creado_en),
    KEY idx_solicitudes_ausencias_estado (estado, creado_en),
    UNIQUE KEY uq_solicitudes_ausencias_incidencia (incidencia_id),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (revisado_por) REFERENCES empleados(id) ON DELETE SET NULL,
    FOREIGN KEY (incidencia_id) REFERENCES incidencias_permisos(id) ON DELETE SET NULL
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
    periodo VARCHAR(10) NOT NULL,
    preguntas JSON NOT NULL,
    respuestas JSON NULL,
    total_preguntas TINYINT UNSIGNED NOT NULL,
    respuestas_correctas TINYINT UNSIGNED NULL,
    puntos_obtenidos DECIMAL(10, 2) NULL,
    puntos_totales DECIMAL(10, 2) NULL,
    porcentaje TINYINT UNSIGNED NULL,
    estado ENUM('pendiente', 'completada') NOT NULL DEFAULT 'pendiente',
    resultado ENUM('Aprobado', 'Requiere refuerzo') NULL,
    fecha_realizacion TIMESTAMP NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_eval_conocimiento_periodo CHECK (periodo REGEXP '^([0-9]{4}-(0[1-9]|1[0-2])|[0-9]{4}-(0[1-9]|1[0-2])-Q[12]|[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3]))$'),
    CONSTRAINT chk_eval_conocimiento_puntaje CHECK (porcentaje IS NULL OR porcentaje BETWEEN 0 AND 100),
    CONSTRAINT uq_eval_conocimiento_empleado_periodo UNIQUE (empleado_id, periodo),
    INDEX idx_eval_conocimiento_periodo_estado (periodo, estado),
    INDEX idx_eval_conocimiento_puesto_periodo (puesto_id, periodo),
    INDEX idx_eval_conocimiento_realizacion (fecha_realizacion),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
) ENGINE=InnoDB;

CREATE TABLE evaluaciones_banco_inicializado (
    puesto_id INT PRIMARY KEY,
    inicializado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
) ENGINE=InnoDB;

CREATE TABLE evaluaciones_banco_preguntas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    puesto_id INT NOT NULL,
    periodo VARCHAR(10) NOT NULL,
    texto VARCHAR(1000) NOT NULL,
    opciones JSON NOT NULL,
    respuesta_correcta TINYINT UNSIGNED NOT NULL,
    puntos_maximos DECIMAL(8, 2) NOT NULL DEFAULT 1.00,
    orden INT UNSIGNED NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_banco_preguntas_puesto_orden (puesto_id, orden, id),
    INDEX idx_banco_preguntas_puesto_periodo (puesto_id, periodo, orden, id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
) ENGINE=InnoDB;

CREATE TABLE candidatos_seleccion_accesos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    session_version INT UNSIGNED NOT NULL DEFAULT 0,
    anio SMALLINT UNSIGNED NOT NULL,
    secuencia SMALLINT UNSIGNED NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_candidato_acceso_creado (creado_en),
    UNIQUE INDEX uq_candidatos_acceso_anio_secuencia (anio, secuencia)
) ENGINE=InnoDB;

CREATE TABLE candidatos_seleccion_secuencias (
    anio SMALLINT UNSIGNED PRIMARY KEY,
    ultimo_numero SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE candidatos_seleccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    acceso_id INT NULL UNIQUE,
    sesion_id CHAR(36) NOT NULL UNIQUE,
    codigo_acceso_hash CHAR(64) NULL UNIQUE,
    nombres VARCHAR(100) NULL,
    apellidos VARCHAR(120) NULL,
    fecha_nacimiento DATE NULL,
    puesto_id INT NULL,
    respuestas JSON NULL,
    curriculum_nombre VARCHAR(255) NULL,
    curriculum_contenido LONGBLOB NULL,
    reintento_autorizado_por INT NULL,
    reintento_motivo VARCHAR(500) NULL,
    estado ENUM('registro', 'completada', 'evaluada') NOT NULL DEFAULT 'registro',
    archivado_en TIMESTAMP NULL,
    archivado_por INT NULL,
    perfil_actualizado_en TIMESTAMP NULL,
    perfil_actualizado_por INT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completada_en TIMESTAMP NULL,
    INDEX idx_candidatos_puesto_estado (puesto_id, estado, creado_en),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id),
    FOREIGN KEY (acceso_id) REFERENCES candidatos_seleccion_accesos(id),
    FOREIGN KEY (reintento_autorizado_por) REFERENCES empleados(id),
    FOREIGN KEY (archivado_por) REFERENCES empleados(id),
    FOREIGN KEY (perfil_actualizado_por) REFERENCES empleados(id)
) ENGINE=InnoDB;

CREATE TABLE seleccion_plantillas (
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

CREATE TABLE candidatos_seleccion_intentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidato_id INT NOT NULL,
    numero_intento SMALLINT UNSIGNED NOT NULL,
    puesto_id INT NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    respuestas JSON NOT NULL,
    puntaje_aptitudes DECIMAL(5, 2) NOT NULL,
    puntaje_conocimientos DECIMAL(5, 2) NOT NULL,
    puntaje_practica DECIMAL(5, 2) NOT NULL,
    puntaje_valores DECIMAL(5, 2) NOT NULL,
    puntaje_total DECIMAL(6, 2) NOT NULL,
    respuestas_correctas SMALLINT UNSIGNED NOT NULL,
    total_preguntas SMALLINT UNSIGNED NOT NULL,
    porcentaje_correctas DECIMAL(5, 2) NOT NULL,
    decision ENUM('recomendable', 'revision_adicional', 'no_demostrada') NOT NULL,
    definicion_snapshot JSON NULL,
    reintento_autorizado_por INT NULL,
    reintento_motivo VARCHAR(500) NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_candidatos_intento (candidato_id, numero_intento),
    INDEX idx_candidatos_intento_puesto_fecha (puesto_id, fecha_evaluacion),
    FOREIGN KEY (candidato_id) REFERENCES candidatos_seleccion(id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id),
    FOREIGN KEY (reintento_autorizado_por) REFERENCES empleados(id)
) ENGINE=InnoDB;

CREATE TABLE notificaciones_leidas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NULL,
    candidato_acceso_id INT NULL,
    notificacion_id VARCHAR(120) NOT NULL,
    marcador VARCHAR(4096) NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_notificacion_leida_empleado (empleado_id, notificacion_id),
    UNIQUE KEY uq_notificacion_leida_candidato (candidato_acceso_id, notificacion_id),
    CONSTRAINT chk_notificacion_leida_usuario
        CHECK ((empleado_id IS NULL) <> (candidato_acceso_id IS NULL)),
    CONSTRAINT fk_notificacion_leida_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacion_leida_candidato
        FOREIGN KEY (candidato_acceso_id) REFERENCES candidatos_seleccion_accesos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluaciones_seleccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidato VARCHAR(120) NOT NULL,
    candidato_id INT NULL,
    puesto_id INT NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    puntaje_aptitudes DECIMAL(5, 2) NOT NULL,
    puntaje_conocimientos DECIMAL(5, 2) NOT NULL,
    puntaje_practica DECIMAL(5, 2) NOT NULL,
    puntaje_valores DECIMAL(5, 2) NOT NULL,
    puntaje_total DECIMAL(6, 2) NOT NULL,
    discrepancia_pendiente TINYINT NOT NULL DEFAULT 0,
    riesgo_control_pendiente TINYINT NOT NULL DEFAULT 0,
    decision ENUM('recomendable', 'revision_adicional', 'no_demostrada') NOT NULL,
    observaciones TEXT NULL,
    evaluador_id INT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_seleccion_aptitudes CHECK (puntaje_aptitudes BETWEEN 0 AND 10),
    CONSTRAINT chk_seleccion_conocimientos CHECK (puntaje_conocimientos BETWEEN 0 AND 20),
    CONSTRAINT chk_seleccion_practica CHECK (puntaje_practica BETWEEN 0 AND 55),
    CONSTRAINT chk_seleccion_valores CHECK (puntaje_valores BETWEEN 0 AND 15),
    CONSTRAINT chk_seleccion_total CHECK (puntaje_total BETWEEN 0 AND 100),
    INDEX idx_seleccion_puesto_fecha (puesto_id, fecha_evaluacion),
    INDEX idx_seleccion_fecha (fecha_evaluacion),
    UNIQUE INDEX uq_seleccion_candidato (candidato_id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id),
    FOREIGN KEY (evaluador_id) REFERENCES empleados(id),
    FOREIGN KEY (candidato_id) REFERENCES candidatos_seleccion(id)
) ENGINE=InnoDB;

CREATE TABLE sugerencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(20) NULL,
    empleado_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    anonima TINYINT(1) NOT NULL DEFAULT 0,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respuesta TEXT NULL,
    respondido_por INT NULL,
    respondido_en TIMESTAMP NULL,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (respondido_por) REFERENCES empleados(id),
    INDEX idx_sugerencias_empleado_fecha (empleado_id, creado_en),
    INDEX idx_sugerencias_estado_fecha (respondido_en, creado_en),
    UNIQUE KEY uk_sugerencias_folio (folio)
) ENGINE=InnoDB;
