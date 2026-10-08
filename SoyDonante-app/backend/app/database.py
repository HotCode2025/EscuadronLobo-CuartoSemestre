import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.config import settings

logger = logging.getLogger("soydonante.database")

Base = declarative_base()

def safe_str(val):
    try:
        return str(val).encode('ascii', 'ignore').decode('ascii')
    except Exception:
        return "Connection Error"

def get_engine(database_url: str):
    """Crea un motor de base de datos SQLAlchemy con fallback inteligente."""
    try:
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        if database_url.startswith("sqlite"):
            engine = create_engine(database_url, connect_args={"check_same_thread": False})
        else:
            engine = create_engine(database_url, pool_pre_ping=True)
        # Probar conexión simple
        with engine.connect() as conn:
            pass
        print(f"[DB] Conexión exitosa a PostgreSQL: {database_url.split('@')[-1]}")
        return engine
    except Exception as e:
        print(f"[DB WARN] No se pudo conectar a PostgreSQL ({safe_str(e)}). Usando base de datos SQLite de respaldo...")
        fallback_url = "sqlite:///./soydonante.db"
        engine = create_engine(fallback_url, connect_args={"check_same_thread": False})
        with engine.connect() as conn:
            pass
        return engine

engine = get_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
