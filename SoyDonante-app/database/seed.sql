-- ============================================================
-- SOY DONANTE - Base de Datos Limpia (Mendoza)
-- Solo centros oficiales, stock en cero y usuario inicial.
-- ============================================================

-- Centros de Donación Oficiales de Mendoza
INSERT INTO donation_centers (nombre, direccion, horario, dias, telefono)
VALUES
('Banco Central de Sangre', 'Av. España 100, Ciudad de Mendoza', 'Lun–Vie  7:00 – 13:00', 'Lunes a Viernes', '+54 261 420-0000'),
('Hospital Central', 'J.V. González s/n, Mendoza', 'Lun–Vie  8:00 – 12:00', 'Lunes a Viernes', '+54 261 449-0500'),
('Hospital Notti', 'Bandera de los Andes, Mendoza', 'Lun–Sáb  8:00 – 12:00', 'Lunes a Sábado', '+54 261 413-2500'),
('Hospital Lagomaggiore', 'Pedro Molina 1053, Mendoza', 'Lun–Vie  7:30 – 12:30', 'Lunes a Viernes', '+54 261 413-4600'),
('Hospital Tupungato', 'Tupungato, Valle de Uco', 'Mar y Jue 8:00 – 11:00', 'Martes y Jueves', '+54 2622 48-8000'),
('Hospital San Martín', 'Rivadavia s/n, San Martín', 'Lun–Vie  8:00 – 12:00', 'Lunes a Viernes', '+54 263 442-0000')
ON CONFLICT DO NOTHING;

-- Stock de Sangre en Cero Unidades Iniciales
INSERT INTO blood_stock (grupo_sanguineo, unidades, max_unidades, estado)
VALUES
('O+',  0, 60, 'Crítico'),
('O–',  0, 60, 'Crítico'),
('A+',  0, 60, 'Crítico'),
('A–',  0, 60, 'Crítico'),
('B+',  0, 60, 'Crítico'),
('B–',  0, 60, 'Crítico'),
('AB+', 0, 60, 'Crítico'),
('AB–', 0, 60, 'Crítico')
ON CONFLICT (grupo_sanguineo) DO UPDATE 
SET unidades = EXCLUDED.unidades, estado = EXCLUDED.estado;

-- Cuenta Administradora de Hemoterapia
INSERT INTO users (dni, fecha_nacimiento, nombre, apellido, email, telefono, grupo_sanguineo, rol, es_apto)
VALUES
('99999999', '1980-01-01', 'Admin', 'Hemoterapia', 'admin.hemoterapia@salud.mendoza.gov.ar', '+54 9 261 400-0000', 'O+', 'Administrador', TRUE)
ON CONFLICT (dni) DO NOTHING;
