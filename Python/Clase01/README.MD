# 🚀 Laboratorio de Gestión de Usuarios (Python + PostgreSQL)

Sistema interactivo en consola para la gestión de usuarios (CRUD) desarrollado en Python 3.10+, utilizando una arquitectura en capas con el patrón **DAO (Data Access Object)**, **Pool de Conexiones**, **Context Managers** (`with`) y un sistema centralizado de **Logging**.

---

## 📋 Requisitos Previos

Asegúrate de contar con lo siguiente en tu sistema:

* Python 3.10+ (https://www.python.org/downloads/)
* PostgreSQL (https://www.postgresql.org/download/) (servidor activo en el puerto 5432)
* pgAdmin 4 (https://www.pgadmin.org/) (opcional, para administración visual)

---

## 🗄️ 1. Base de Datos (`test_bd`)

1. Abre pgAdmin o tu cliente PostgreSQL preferido.
2. Crea una base de datos llamada `test_bd`.
3. Abre la herramienta de consultas (Query Tool) sobre la base de datos `test_bd` y ejecuta la siguiente sentencia SQL:

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL
);

-- Registros de prueba iniciales
INSERT INTO usuario (username, password) VALUES ('jperez', '123');
INSERT INTO usuario (username, password) VALUES ('kgomez', '456');

---

## 💻 2. Instalación y Configuración del Entorno

1. Abre la terminal en la carpeta del proyecto (`Clase1`):
   cd Clase1

2. Crear el entorno virtual:
   python -m venv venv

3. Activar el entorno virtual según tu sistema operativo:
   - PowerShell (Windows):
     .\venv\Scripts\Activate.ps1
   - CMD (Windows):
     .\venv\Scripts\activate.bat
   - Linux/macOS:
     source venv/bin/activate

4. Instalar las dependencias requeridas dentro del entorno activo:
   pip install psycopg2-binary

---

## ⚙️ 3. Configuración de Credenciales

Abre el archivo `conexion.py` y verifica que los parámetros coincidan con tu servidor de PostgreSQL local:

class Conexion:
    _DATABASE = 'test_bd'      # Base de datos configurada
    _USERNAME = 'postgres'     # Usuario predeterminado
    _PASSWORD = 'admin'        # Tu contraseña local de PostgreSQL
    _HOST = '127.0.0.1'
    _DB_PORT = '5432'
    _MIN_CON = 1
    _MAX_CON = 5

---

## 🚀 4. Ejecución de la Aplicación

Con el entorno virtual activo (`venv`), ejecuta el menú interactivo:

python menu_app_usuario.py

Opciones del Menú:
1. Listar Usuarios: Muestra todos los registros de la tabla `usuario`.
2. Agregar Usuario: Crea un nuevo usuario solicitando `username` y `password`.
3. Actualizar Usuario: Modifica los campos de un usuario existente mediante su `id_usuario`.
4. Eliminar Usuario: Elimina un usuario de la base de datos por su `id_usuario`.
5. Salir: Cierra la aplicación liberando de forma segura el pool de conexiones.

---

## 📁 Estructura del Proyecto

Clase1/
│
├── conexion.py          # Pool de conexiones administrado con psycopg2
├── cursor_del_pool.py   # Context Manager (with) para transacciones y control de cursor
├── usuario.py           # Entidad Usuario con encapsulamiento (getters y setters)
├── usuario_dao.py       # Capa DAO con consultas SQL parametrizadas (CRUD)
├── logger_base.py       # Configuración centralizada de registros (log)
├── menu_app_usuario.py  # Interfaz de consola CLI y ejecutable principal
└── capa_datos.log       # Historial de logs generado durante la ejecución

---

## 🛠️ Tecnologías Aplicadas

* Python 3.10+
* PostgreSQL
* Psycopg2-binary
* Patrones de Diseño: DAO, Singleton/Pool pattern, Context Manager Pattern.