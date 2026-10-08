# 🩸 Soy Donante — Sistema Integral de Donantes de Sangre (Mendoza)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)

Aplicación web integral para la digitalización y gestión del sistema de donantes de sangre de la **Provincia de Mendoza**, orientada al **Servicio de Hemoterapia (Ministerio de Salud)** y a los donantes voluntarios.

Permite a los donantes consultar su perfil, compatibilidades, historial clínico, tarjeta digital y recibir alertas urgentes. A su vez, provee a los administradores herramientas para la gestión de donantes, stock de hemocomponentes, asignación de turnos, emisión de alertas a la comunidad y métricas de gestión.

> 📖 **Guía visual con capturas y manual de uso**: Consulta la carpeta [`soy-donante-readme/`](./soy-donante-readme/README.md) para ver capturas de pantalla de cada sección, detalles funcionales y preguntas frecuentes.

---

## 🏗️ Arquitectura y Tecnologías

El sistema está construido como una solución Full Stack desacoplada:

- **Frontend (`/frontend`)**: Single Page Application (HTML5, CSS3, JavaScript Vanilla interactivo) servida a través de un servidor ligero en **Node.js / Express**. Incluye un proxy inverso que redirige automáticamente todas las peticiones `/api/*` hacia el backend.
- **Backend (`/backend`)**: API REST desarrollada con **Python 3.11** y **FastAPI**, validación de esquemas con **Pydantic**, autenticación mediante **JWT (JSON Web Tokens)** y ORM con **SQLAlchemy 2.0**.
- **Base de Datos (`/database`)**: **PostgreSQL 16** con esquemas relacionales (`schema.sql`) y carga inicial de datos (`seed.sql`). Si PostgreSQL no está activo en un entorno local, el sistema cuenta con un **mecanismo de respaldo automático en SQLite** (`soydonante.db`).
- **Contenerización**: Orquestación completa mediante **Docker Compose**.

---

## 📁 Estructura del Proyecto

```text
SoyDonante-app/
├── backend/                  # API REST en Python (FastAPI)
│   ├── app/
│   │   ├── auth.py           # Seguridad y generación/validación de tokens JWT
│   │   ├── config.py         # Configuración y variables de entorno
│   │   ├── crud.py           # Operaciones de base de datos
│   │   ├── database.py       # Conexión SQLAlchemy (PostgreSQL + fallback SQLite)
│   │   ├── main.py           # Endpoints de la API REST
│   │   ├── models.py         # Modelos de datos SQLAlchemy
│   │   ├── schemas.py        # Esquemas de entrada y salida Pydantic
│   │   └── seed.py           # Poblamiento inicial de la base de datos
│   ├── Dockerfile            # Imagen Docker del backend
│   ├── init_db.py            # Script para inicializar tablas y datos
│   ├── requirements.txt      # Dependencias de Python
│   └── reset_clean_db.py     # Script para reiniciar la BD a un estado limpio
├── frontend/                 # Aplicación cliente y servidor Node.js
│   ├── public/               # Archivos estáticos de la SPA
│   │   ├── css/
│   │   │   └── styles.css    # Estilos globales y diseño responsivo
│   │   ├── js/
│   │   │   ├── api.js        # Cliente HTTP y consumo de endpoints
│   │   │   └── app.js        # Lógica de interfaz, vistas y estado
│   │   └── index.html        # Página principal de la aplicación
│   ├── Dockerfile            # Imagen Docker del frontend
│   ├── package.json          # Dependencias de Node.js (Express, Cors, Proxy)
│   └── server.js             # Servidor Express y proxy inverso hacia el backend
├── database/                 # Scripts SQL para PostgreSQL
│   ├── schema.sql            # Creación de tablas, restricciones e índices
│   └── seed.sql              # Centros oficiales, stock y datos base
├── soy-donante-readme/       # Documentación extendida y capturas de pantalla
│   ├── docs/img/             # Capturas de la interfaz y logo
│   └── README.md             # Manual de uso de la aplicación
├── .dockerignore             # Exclusiones de construcción Docker
├── .env.example              # Plantilla de variables de entorno
├── .env                      # Variables de entorno activas
├── .gitignore                # Exclusiones para Git
├── docker-compose.yml        # Orquestación de Postgres, Backend y Frontend
└── README.md                 # Este archivo
```

---

## 🚀 Opciones de Despliegue

Puedes levantar el proyecto mediante **Docker Compose** (recomendado, listo en 1 paso) o de forma **local / manual**.

---

### Opción 1: Despliegue con Docker Compose (Recomendado)

Requiere tener instalado [Docker Desktop](https://www.docker.com/products/docker-desktop/).

1. **Clonar o situarse en el directorio del proyecto:**
   ```bash
   cd SoyDonante-app
   ```

2. **Levantar los servicios:**
   ```bash
   docker-compose up --build
   ```

   Docker levantará automáticamente tres contenedores:
   - `soydonante_postgres`: Base de datos PostgreSQL en el puerto `5432`.
   - `soydonante_backend`: API FastAPI en el puerto `8000`.
   - `soydonante_frontend`: Servidor Node.js y webapp en el puerto `3000`.

3. **Acceder a la aplicación:**
   - 🌐 **Aplicación Web**: [http://localhost:3000](http://localhost:3000)
   - 📄 **Documentación interactiva Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - 📑 **Documentación interactiva ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

4. **Para detener los servicios:**
   ```bash
   docker-compose down
   ```

---

### Opción 2: Despliegue Local / Manual (Sin Docker)

Si prefieres ejecutar el proyecto directamente en tu máquina:

#### Requisitos Previos:
- **Python 3.10+**
- **Node.js 18+** y **npm**
- *(Opcional)* PostgreSQL 14+ (si no está disponible, el backend usará automáticamente la base SQLite `soydonante.db`).

#### Paso 1: Configurar e iniciar el Backend

1. Abre una terminal en la raíz del proyecto y crea un entorno virtual:
   ```bash
   cd backend
   python -m venv venv
   ```

2. Activa el entorno virtual:
   - **En Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **En Linux / macOS:**
     ```bash
     source venv/bin/activate
     ```

3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

4. Inicializa la base de datos con los datos iniciales:
   ```bash
   python init_db.py
   ```

5. Inicia el servidor FastAPI:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *El backend estará disponible en `http://localhost:8000`.*

#### Paso 2: Configurar e iniciar el Frontend

1. Abre una segunda terminal en la raíz del proyecto:
   ```bash
   cd frontend
   npm install
   ```

2. Inicia el servidor de desarrollo:
   ```bash
   npm start
   ```
   *El frontend se abrirá en `http://localhost:3000` con proxy automático a `http://localhost:8000`.*

---

## 👥 Usuarios y Credenciales de Demostración

El acceso a la aplicación se realiza indicando **Número de DNI** (sin puntos ni espacios) y **Fecha de Nacimiento**.

| Rol / Tipo | Usuario | DNI | Fecha de Nacimiento | Características |
|---|---|---|---|---|
| 👑 **Administrador** | Admin Hemoterapia | `99999999` | `01/01/1980` | Acceso a todo el panel de administración, gestión de donantes, stock, emisión de alertas y reportes. |
| 🩸 **Donante Apto (O+)** | María González | `30123456` | `14/06/1992` | Donante habilitada, historial de donaciones, tarjeta digital con QR. |
| 🩸 **Donante Apto (A+)** | Carlos Pérez | `25441123` | `22/03/1988` | Donante habilitado, compatible con grupos A+ y AB+. |
| ⏳ **Donante en Espera (B−)** | Ana Rodríguez | `33871002` | `08/11/1995` | Donante en período de ventana/espera (no apta temporalmente). |
| 🩸 **Donante Apto (AB+)** | Javier López | `28553990` | `10/05/1990` | Donante apto, receptor universal. |
| 🩸 **Donante Apto (O−)** | Luciana Martínez | `36001445` | `18/09/1996` | Donante universal. |

---

## ⚙️ Variables de Entorno

El archivo `.env` en la raíz del proyecto permite ajustar la configuración del sistema. Se provee un archivo modelo en `.env.example`:

```env
# Base de Datos
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/soydonante_db
# Para SQLite local opcional: DATABASE_URL=sqlite:///./soydonante.db

# Configuración FastAPI Backend
SECRET_KEY=soydonante_secret_key_mendoza_2026_super_secure
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
PORT=8000
HOST=0.0.0.0

# Configuración Node.js Frontend
FRONTEND_PORT=3000
BACKEND_API_URL=http://localhost:8000
```

---

## 🛠️ Scripts de Mantenimiento de Base de Datos

Dentro de la carpeta `backend/` se disponen los siguientes scripts auxiliares:

- **`python backend/init_db.py`**: Crea las tablas necesarias y carga centros oficiales de Mendoza, stock y usuarios de prueba si aún no existen.
- **`python backend/reset_clean_db.py`**: Limpia todas las tablas y las restablece a su estado base oficial (centros oficiales de Mendoza, stock en 0 y cuenta administradora).

---

## 👥 Equipo de Desarrollo — Escuadrón Lobo

Proyecto desarrollado en el marco de la **Tecnicatura Universitaria en Programación**  
**Cátedra:** Metodología de Sistemas I  
**Institución:** Universidad Tecnológica Nacional (UTN) — Facultad Regional San Rafael  
**Tutor / Docente:** Osvaldo Giordanini  
**Destinatario:** Servicio de Hemoterapia · Ministerio de Salud · Provincia de Mendoza  
**Año:** 2026

**Integrantes:**
- Lucas Nicolás Aguilar
- Valentín Bertolone
- Andrea Cecilia Farias
- Juan Moreno
- Valeria Pinaya
- Darío Scilipoti
- Orlando Zelada
