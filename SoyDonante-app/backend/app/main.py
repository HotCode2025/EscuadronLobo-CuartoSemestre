import logging
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import engine, Base, get_db
from backend.app import models, schemas, crud, auth, seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("soydonante.api")

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

# Poblar datos si la BD está vacía y sincronizar stock
with next(get_db()) as db_session:
    seed.seed_database(db_session)
    crud.sync_stock_with_donations(db_session)

app = FastAPI(
    title="Soy Donante API — Mendoza",
    description="API RESTful de gestión de donantes de sangre para la Provincia de Mendoza",
    version="1.1.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# 1. AUTHENTICATION ENDPOINTS
# ------------------------------------------------------------

@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, login_data.dni, login_data.fecha)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="DNI o fecha de nacimiento incorrectos"
        )
    token = auth.create_access_token(data={"sub": user.dni})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me", response_model=schemas.UserSchema)
def get_current_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.put("/api/auth/me", response_model=schemas.UserSchema)
def update_profile(user_in: schemas.UserUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if user_in.telefono is not None:
        current_user = crud.update_user_phone(db, current_user.id, user_in.telefono)
    return current_user

# ------------------------------------------------------------
# 2. DASHBOARD ENDPOINTS
# ------------------------------------------------------------

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db, current_user.id)

@app.get("/api/dashboard/chart", response_model=List[schemas.ChartDataPoint])
def get_chart_data(db: Session = Depends(get_db)):
    return crud.get_chart_data(db)

# ------------------------------------------------------------
# 3. DONATIONS & HISTORY ENDPOINTS
# ------------------------------------------------------------

@app.get("/api/donations/my-history", response_model=List[schemas.DonationSchema])
def get_my_donations(current_user: Optional[models.User] = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        return []
    if current_user.rol == "Administrador":
        return crud.get_user_donations(db, user_id=None)
    return crud.get_user_donations(db, user_id=current_user.id)

@app.post("/api/donations", response_model=schemas.DonationSchema)
def add_donation(donation_in: schemas.DonationCreate, db: Session = Depends(get_db)):
    return crud.create_donation(db, donation_in)

# ------------------------------------------------------------
# 4. DONORS MANAGEMENT ENDPOINTS
# ------------------------------------------------------------

@app.get("/api/donors", response_model=List[schemas.UserSchema])
def list_donors(q: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return crud.get_all_users(db, query=q)

@app.post("/api/donors", response_model=schemas.UserSchema)
def register_donor(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_donor(db, user_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/donors/{donor_id}", response_model=schemas.UserSchema)
def get_donor(donor_id: int, db: Session = Depends(get_db)):
    donor = crud.get_user_by_id(db, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donante no encontrado")
    return donor

@app.get("/api/donors/{donor_id}/full", response_model=schemas.DonorDetailSchema)
def get_donor_full_profile(donor_id: int, db: Session = Depends(get_db)):
    full = crud.get_donor_full(db, donor_id)
    if not full:
        raise HTTPException(status_code=404, detail="Donante no encontrado")
    return full

@app.put("/api/donors/{donor_id}/status", response_model=schemas.UserSchema)
def toggle_donor_status(donor_id: int, status_in: schemas.DonorStatusUpdate, db: Session = Depends(get_db)):
    donor = crud.update_donor_status(db, donor_id, status_in.es_apto)
    if not donor:
        raise HTTPException(status_code=404, detail="Donante no encontrado")
    return donor

# ------------------------------------------------------------
# 5. DONATION CENTERS ENDPOINTS
# ------------------------------------------------------------

@app.get("/api/centers", response_model=List[schemas.DonationCenterSchema])
def list_centers(include_inactive: bool = Query(False), db: Session = Depends(get_db)):
    return crud.get_donation_centers(db, include_inactive=include_inactive)

@app.post("/api/centers", response_model=schemas.DonationCenterSchema)
def add_center(
    center_in: schemas.DonationCenterCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado: solo administradores pueden agregar centros")
    return crud.create_donation_center(db, center_in)

@app.put("/api/centers/{center_id}", response_model=schemas.DonationCenterSchema)
def edit_center(
    center_id: int,
    center_in: schemas.DonationCenterUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado: solo administradores pueden editar centros")
    updated = crud.update_donation_center(db, center_id, center_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Centro de donación no encontrado")
    return updated

@app.put("/api/centers/{center_id}/toggle", response_model=schemas.DonationCenterSchema)
def toggle_center(
    center_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    updated = crud.toggle_donation_center_status(db, center_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Centro de donación no encontrado")
    return updated

@app.delete("/api/centers/{center_id}")
def delete_center(
    center_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    success = crud.delete_donation_center(db, center_id)
    if not success:
        raise HTTPException(status_code=404, detail="Centro de donación no encontrado")
    return {"message": "Centro de donación eliminado o deshabilitado con éxito"}

# ------------------------------------------------------------
# 6. BLOOD STOCK ENDPOINTS
# ------------------------------------------------------------

@app.get("/api/stock", response_model=List[schemas.BloodStockSchema])
def list_stock(db: Session = Depends(get_db)):
    return crud.get_blood_stock(db)

@app.put("/api/stock/{stock_id}", response_model=schemas.BloodStockSchema)
def update_stock(stock_id: int, stock_in: schemas.BloodStockUpdate, db: Session = Depends(get_db)):
    updated = crud.update_blood_stock(db, stock_id, stock_in.unidades)
    if not updated:
        raise HTTPException(status_code=404, detail="Grupo de stock no encontrado")
    return updated

@app.post("/api/stock/consume", response_model=schemas.StockMovementSchema)
def consume_stock(
    consumption_in: schemas.StockConsumptionCreate,
    current_user: Optional[models.User] = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return crud.consume_blood_stock(db, consumption_in, user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/stock/income", response_model=schemas.StockMovementSchema)
def income_stock(
    income_in: schemas.StockIncomeCreate,
    current_user: Optional[models.User] = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return crud.add_blood_stock_income(db, income_in, user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/stock/movements", response_model=List[schemas.StockMovementSchema])
def list_stock_movements(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    return crud.get_stock_movements(db, limit=limit)

# ------------------------------------------------------------
# 7. NOTIFICATIONS & ALERTS ENDPOINTS
# ------------------------------------------------------------

@app.get("/api/notifications", response_model=List[schemas.NotificationSchema])
def get_notifications(current_user: Optional[models.User] = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id if current_user else None
    return crud.get_notifications(db, user_id)

@app.put("/api/notifications/{notif_id}/read", response_model=schemas.NotificationSchema)
def mark_read(notif_id: int, db: Session = Depends(get_db)):
    notif = crud.mark_notification_read(db, notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return notif

@app.put("/api/notifications/read-all")
def mark_all_read(current_user: Optional[models.User] = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user:
        crud.mark_all_notifications_read(db, current_user.id)
    return {"message": "Todas las notificaciones marcadas como leídas"}

@app.post("/api/alerts", response_model=schemas.UrgentAlertSchema)
def create_alert(alert_in: schemas.UrgentAlertCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return crud.create_urgent_alert(db, alert_in, emisor_id=current_user.id)

@app.get("/api/alerts/active-for-user")
def get_active_alert_for_me(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    alert = crud.get_active_alert_for_user(db, current_user.grupo_sanguineo)
    if not alert:
        return {"has_alert": False}
    return {
        "has_alert": True,
        "id": alert.id,
        "grupo": alert.grupo_requerido,
        "centro": alert.centro_nombre,
        "mensaje": alert.mensaje
    }

# ------------------------------------------------------------
# 8. REPORTS & METRICS ENDPOINTS
# ------------------------------------------------------------

@app.get("/api/reports/metrics", response_model=List[schemas.MvpMetricSchema])
def get_mvp_metrics(db: Session = Depends(get_db)):
    return crud.get_mvp_metrics(db)

@app.get("/api/reports/summary", response_model=schemas.ReportsSummary)
def get_reports_summary(db: Session = Depends(get_db)):
    return crud.get_reports_summary(db)

# ------------------------------------------------------------
# 9. DONATION APPOINTMENTS / INTENTS ENDPOINTS
# ------------------------------------------------------------

@app.post("/api/appointments", response_model=schemas.DonationAppointmentSchema)
def create_appointment(
    apt_in: schemas.DonationAppointmentCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return crud.create_donation_appointment(db, user_id=current_user.id, apt_in=apt_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/appointments/my", response_model=List[schemas.DonationAppointmentSchema])
def get_my_appointments(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_user_appointments(db, user_id=current_user.id)

@app.put("/api/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    ok = crud.cancel_donation_appointment(db, appointment_id=appointment_id, user_id=current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Turno no encontrado o no pertenece al usuario")
    return {"message": "Turno cancelado exitosamente"}

@app.get("/api/appointments", response_model=List[schemas.AdminAppointmentSchema])
def list_appointments(
    estado: Optional[str] = Query(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado: solo administradores pueden ver todos los turnos")
    return crud.get_all_appointments(db, estado=estado)

@app.put("/api/appointments/{appointment_id}/status", response_model=schemas.AdminAppointmentSchema)
def update_appointment_status(
    appointment_id: int,
    status_in: schemas.AppointmentStatusUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado: solo administradores pueden modificar turnos")
    updated = crud.update_appointment_status(db, appointment_id, status_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return updated

@app.post("/api/appointments/{appointment_id}/notify", response_model=schemas.NotificationSchema)
def notify_appointment_donor(
    appointment_id: int,
    notify_in: schemas.AppointmentNotifyDonor,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado: solo administradores pueden notificar donantes")
    notif = crud.notify_appointment_donor(db, appointment_id, notify_in)
    if not notif:
        raise HTTPException(status_code=404, detail="Turno no encontrado o donante sin usuario registrado")
    return notif

@app.put("/api/appointments/{appointment_id}/reschedule", response_model=schemas.AdminAppointmentSchema)
def reschedule_appointment(
    appointment_id: int,
    resched_in: schemas.AppointmentRescheduleSchema,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado: solo administradores pueden reprogramar turnos")
    updated = crud.reschedule_appointment(db, appointment_id, resched_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return updated

@app.post("/api/appointments/admin", response_model=schemas.AdminAppointmentSchema)
def create_admin_appointment(
    admin_apt_in: schemas.AdminAppointmentCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado: solo administradores pueden asignar turnos directos")
    try:
        return crud.create_admin_appointment(db, admin_apt_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ------------------------------------------------------------
# 10. SYSTEM SETTINGS ENDPOINTS
# ------------------------------------------------------------

@app.get("/api/settings", response_model=List[schemas.SystemSettingSchema])
def list_settings(db: Session = Depends(get_db)):
    return crud.get_all_settings(db)

@app.get("/api/settings/{clave}")
def get_setting(clave: str, db: Session = Depends(get_db)):
    valor = crud.get_setting(db, clave)
    return {"clave": clave, "valor": valor}

@app.put("/api/settings/{clave}", response_model=schemas.SystemSettingSchema)
def update_setting(
    clave: str,
    setting_in: schemas.SystemSettingUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "Administrador":
        raise HTTPException(status_code=403, detail="Acceso denegado: solo administradores pueden modificar configuraciones")
    return crud.update_setting(db, clave, setting_in.valor)

# ------------------------------------------------------------
# ROOT HEALTH CHECK
# ------------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Soy Donante Mendoza API",
        "backend": "Python / FastAPI",
        "database": settings.DATABASE_URL.split(":")[0],
        "docs": "/docs"
    }
