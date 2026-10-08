import logging
from datetime import date
from sqlalchemy.orm import Session
from backend.app import models

logger = logging.getLogger("soydonante.seed")

def seed_database(db: Session):
    # 1. Centros oficiales de Hemoterapia en Mendoza (Reales)
    if db.query(models.DonationCenter).count() == 0:
        logger.info("Poblando centros oficiales de donación de Mendoza...")
        centers = [
            models.DonationCenter(nombre="Banco Central de Sangre", direccion="Av. España 100, Ciudad de Mendoza", horario="Lun–Vie  7:00 – 13:00", dias="Lunes a Viernes", telefono="+54 261 420-0000"),
            models.DonationCenter(nombre="Hospital Central", direccion="J.V. González s/n, Mendoza", horario="Lun–Vie  8:00 – 12:00", dias="Lunes a Viernes", telefono="+54 261 449-0500"),
            models.DonationCenter(nombre="Hospital Notti", direccion="Bandera de los Andes, Mendoza", horario="Lun–Sáb  8:00 – 12:00", dias="Lunes a Sábado", telefono="+54 261 413-2500"),
            models.DonationCenter(nombre="Hospital Lagomaggiore", direccion="Pedro Molina 1053, Mendoza", horario="Lun–Vie  7:30 – 12:30", dias="Lunes a Viernes", telefono="+54 261 413-4600"),
            models.DonationCenter(nombre="Hospital Tupungato", direccion="Tupungato, Valle de Uco", horario="Mar y Jue 8:00 – 11:00", dias="Martes y Jueves", telefono="+54 2622 48-8000"),
            models.DonationCenter(nombre="Hospital San Martín", direccion="Rivadavia s/n, San Martín", horario="Lun–Vie  8:00 – 12:00", dias="Lunes a Viernes", telefono="+54 263 442-0000"),
        ]
        db.add_all(centers)
        db.commit()

    # 2. Stock de sangre inicial limpio (0 unidades en los 8 grupos oficiales)
    if db.query(models.BloodStock).count() == 0:
        logger.info("Inicializando grupos de stock de sangre en 0 unidades...")
        grupos = ['O+', 'O–', 'A+', 'A–', 'B+', 'B–', 'AB+', 'AB–']
        stocks = [
            models.BloodStock(grupo_sanguineo=g, unidades=0, max_unidades=60, estado="Crítico")
            for g in grupos
        ]
        db.add_all(stocks)
        db.commit()

    # 3. Usuario Administrador y Donantes Oficiales de Demostración
    initial_users = [
        models.User(
            dni="99999999",
            fecha_nacimiento=date(1980, 1, 1),
            nombre="Admin",
            apellido="Hemoterapia",
            email="admin.hemoterapia@salud.mendoza.gov.ar",
            telefono="+54 9 261 400-0000",
            grupo_sanguineo="O+",
            rol="Administrador",
            es_apto=True,
            fecha_proxima_donacion=date.today()
        ),
        models.User(
            dni="30123456",
            fecha_nacimiento=date(1992, 6, 14),
            nombre="María",
            apellido="González",
            email="maria.gonzalez@salud.mendoza.gov.ar",
            telefono="+54 9 261 411-2233",
            grupo_sanguineo="O+",
            rol="Donante",
            es_apto=True,
            fecha_proxima_donacion=date.today()
        ),
        models.User(
            dni="25441123",
            fecha_nacimiento=date(1988, 3, 22),
            nombre="Carlos",
            apellido="Pérez",
            email="carlos.perez@salud.mendoza.gov.ar",
            telefono="+54 9 261 522-3344",
            grupo_sanguineo="A+",
            rol="Donante",
            es_apto=True,
            fecha_proxima_donacion=date.today()
        ),
        models.User(
            dni="33871002",
            fecha_nacimiento=date(1995, 11, 8),
            nombre="Ana",
            apellido="Rodríguez",
            email="ana.rodriguez@salud.mendoza.gov.ar",
            telefono="+54 9 261 633-4455",
            grupo_sanguineo="B–",
            rol="Donante",
            es_apto=False,
            fecha_proxima_donacion=date(2026, 12, 1)
        ),
        models.User(
            dni="28553990",
            fecha_nacimiento=date(1990, 5, 10),
            nombre="Javier",
            apellido="López",
            email="javier.lopez@salud.mendoza.gov.ar",
            telefono="+54 9 261 744-5566",
            grupo_sanguineo="AB+",
            rol="Donante",
            es_apto=True,
            fecha_proxima_donacion=date.today()
        ),
        models.User(
            dni="36001445",
            fecha_nacimiento=date(1996, 9, 18),
            nombre="Luciana",
            apellido="Martínez",
            email="luciana.martinez@salud.mendoza.gov.ar",
            telefono="+54 9 261 855-6677",
            grupo_sanguineo="O–",
            rol="Donante",
            es_apto=True,
            fecha_proxima_donacion=date.today()
        ),
    ]

    for u in initial_users:
        if not db.query(models.User).filter(models.User.dni == u.dni).first():
            logger.info(f"Poblando usuario inicial: {u.nombre} {u.apellido} (DNI {u.dni})")
            db.add(u)
    db.commit()

    # 4. Configuración inicial del sistema
    if not db.query(models.SystemSetting).filter(models.SystemSetting.clave == "dias_espera_donacion").first():
        setting = models.SystemSetting(
            clave="dias_espera_donacion",
            valor="90",
            descripcion="Intervalo de días de espera entre donaciones de sangre"
        )
        db.add(setting)
        db.commit()

