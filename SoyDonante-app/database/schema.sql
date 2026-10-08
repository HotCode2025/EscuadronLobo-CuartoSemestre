-- ============================================================
-- SOY DONANTE - Schema SQL para PostgreSQL
-- Servicio de Hemoterapia · Provincia de Mendoza
-- ============================================================

-- Crear extensiones si es necesario
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Usuarios / Donantes / Administradores
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(20) UNIQUE NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(50),
    grupo_sanguineo VARCHAR(10) NOT NULL, -- O+, O-, A+, A-, B+, B-, AB+, AB-
    rol VARCHAR(20) DEFAULT 'Donante',   -- Donante, Administrador
    es_apto BOOLEAN DEFAULT TRUE,
    fecha_proxima_donacion DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_dni ON users(dni);
CREATE INDEX IF NOT EXISTS idx_users_grupo ON users(grupo_sanguineo);

-- 2. Tabla de Centros de Donación
CREATE TABLE IF NOT EXISTS donation_centers (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    horario VARCHAR(100) NOT NULL,
    dias VARCHAR(100) NOT NULL,
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Historial de Donaciones
CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    centro_id INT REFERENCES donation_centers(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    hemoglobina VARCHAR(20) DEFAULT '14.0 g/dl',
    serologia VARCHAR(50) DEFAULT 'Negativa',
    presion_arterial VARCHAR(20) DEFAULT '120/80',
    resultado VARCHAR(20) DEFAULT 'OK',
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_fecha ON donations(fecha);

-- 4. Tabla de Stock de Sangre
CREATE TABLE IF NOT EXISTS blood_stock (
    id SERIAL PRIMARY KEY,
    grupo_sanguineo VARCHAR(10) UNIQUE NOT NULL,
    unidades INT NOT NULL DEFAULT 0,
    max_unidades INT NOT NULL DEFAULT 60,
    estado VARCHAR(20) DEFAULT 'OK', -- OK, Bajo, Crítico
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE, -- NULL = para todos
    tipo VARCHAR(20) NOT NULL, -- urgent, green, orange, info
    titulo VARCHAR(200) NOT NULL,
    cuerpo TEXT NOT NULL,
    tiempo_relativo VARCHAR(50) DEFAULT 'Hace un momento',
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_leida ON notifications(leida);

-- 6. Tabla de Alertas Urgentes
CREATE TABLE IF NOT EXISTS urgent_alerts (
    id SERIAL PRIMARY KEY,
    grupo_requerido VARCHAR(10) NOT NULL,
    centro_nombre VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    emisor_id INT REFERENCES users(id),
    total_notificados INT DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Indicadores MVP / Reportes
CREATE TABLE IF NOT EXISTS mvp_metrics (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    meta VARCHAR(50),
    valor_actual VARCHAR(50),
    cumplido BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
