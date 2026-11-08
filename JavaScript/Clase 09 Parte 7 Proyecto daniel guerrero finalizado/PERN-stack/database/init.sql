CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gravatar VARCHAR(255)
);

CREATE TABLE tareas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    -- el titulo no se puede repetir para el mismo usuario
    -- (dos usuarios distintos si pueden tener tareas con el mismo titulo)
    CONSTRAINT tareas_usuario_titulo_key UNIQUE (usuario_id, titulo)
);

-- Si la base ya existe (como la tuya), en vez de lo de arriba se ejecuta esto:
-- ALTER TABLE tareas DROP CONSTRAINT tareas_titulo_key;
-- ALTER TABLE tareas ADD CONSTRAINT tareas_usuario_titulo_key UNIQUE (usuario_id, titulo);
