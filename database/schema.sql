USE defaultdb;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO roles (nombre) VALUES
    ('Empleado'),
    ('Recursos Humanos'),
    ('Jefe Autorizado');

CREATE TABLE puestos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_abreviatura VARCHAR(10) NOT NULL UNIQUE,
    nombre_puesto VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

INSERT INTO puestos (codigo_abreviatura, nombre_puesto) VALUES
    ('GG', 'Gerente General'),
    ('AC', 'Asistente Comercial'),
    ('VEN', 'Vendedor'),
    ('AUXC', 'Auxiliar Contable'),
    ('JM', 'Jefe de Mantenimiento'),
    ('TEC', 'Técnico'),
    ('AUXTEC', 'Auxiliar Técnico'),
    ('DC', 'Director de Calidad'),
    ('MET', 'Metrológico'),
    ('AUXLAB', 'Auxiliar de Laboratorio');

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
-- Contraseña por defecto: cambiar123 (hash bcrypt)
INSERT INTO empleados (codigo_empleado, nombre, password_hash, rol_id, puesto_id, horario_id, activo) VALUES
    ('SUR-GG-001', 'Héctor Ortiz', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Jefe Autorizado'), (SELECT id FROM puestos WHERE codigo_abreviatura='GG'), 1, 1),
    ('SUR-AC-002', 'Mafer García', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Recursos Humanos'), (SELECT id FROM puestos WHERE codigo_abreviatura='AC'), 1, 1),
    ('SUR-VEN-003', 'Sebastián Farfán', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='VEN'), 1, 1),
    ('SUR-AUXC-004', 'Jefferson López', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='AUXC'), 1, 1),
    ('SUR-JM-005', 'Por confirmar', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='JM'), 1, 1),
    ('SUR-TEC-006', 'Erick', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='TEC'), 1, 1),
    ('SUR-TEC-007', 'Ostman', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='TEC'), 1, 1),
    ('SUR-AUXTEC-008', 'Josué', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='AUXTEC'), 1, 1),
    ('SUR-AUXTEC-009', 'Marvin', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='AUXTEC'), 1, 1),
    ('SUR-AUXTEC-010', 'Eddy', '\\\.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', (SELECT id FROM roles WHERE nombre='Empleado'), (SELECT id FROM puestos WHERE codigo_abreviatura='AUXTEC'), 1, 1);

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
