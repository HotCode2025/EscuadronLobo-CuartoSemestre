import sys
from pathlib import Path

# Fix Windows stdout encoding if needed
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Agregar raíz al PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.database import engine, Base, SessionLocal
from backend.app import seed, models

def reset_clean():
    print("[RESET] Limpiando todas las tablas de ejemplo...")
    Base.metadata.drop_all(bind=engine)
    print("[RESET] Tablas eliminadas.")

    print("[RESET] Creando tablas limpias...")
    Base.metadata.create_all(bind=engine)
    print("[RESET] Tablas creadas.")

    db = SessionLocal()
    try:
        print("[RESET] Cargando configuración limpia (Centros oficiales, stock en 0 y cuenta administradora)...")
        seed.seed_database(db)
        print("[RESET] ✅ Base de datos limpiada con éxito. Ya no contiene donaciones ni datos inventados.")
    finally:
        db.close()

if __name__ == "__main__":
    reset_clean()
