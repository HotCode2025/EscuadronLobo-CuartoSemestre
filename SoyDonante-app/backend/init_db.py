import sys
from pathlib import Path

# Fix Windows stdout encoding if needed
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Agregar raíz al PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.database import engine, Base, SessionLocal
from backend.app import seed

def init():
    print("[INIT] Inicializando esquemas de base de datos...")
    Base.metadata.create_all(bind=engine)
    print("[INIT] Tablas creadas correctamente.")
    
    db = SessionLocal()
    try:
        print("[SEED] Poblando datos iniciales...")
        seed.seed_database(db)
        print("[SEED] Datos de demostración (Mendoza) cargados con éxito.")
    finally:
        db.close()

if __name__ == "__main__":
    init()
