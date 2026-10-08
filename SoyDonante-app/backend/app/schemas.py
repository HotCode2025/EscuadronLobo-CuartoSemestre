from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

# Auth Schemas
class LoginRequest(BaseModel):
    dni: str
    fecha: str # Formato yyyy-mm-dd o dd/mm/yyyy

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserSchema"

# User Schemas
class UserBase(BaseModel):
    dni: str
    nombre: str
    apellido: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    grupo_sanguineo: str
    rol: str = "Donante"
    es_apto: bool = True
    fecha_proxima_donacion: Optional[date] = None

class UserCreate(UserBase):
    fecha_nacimiento: date

class UserUpdate(BaseModel):
    telefono: Optional[str] = None
    email: Optional[str] = None
    es_apto: Optional[bool] = None

class DonorStatusUpdate(BaseModel):
    es_apto: bool

class UserSchema(UserBase):
    id: int
    fecha_nacimiento: date
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Donation Schemas
class DonationBase(BaseModel):
    fecha: date
    hemoglobina: str = "14.0 g/dl"
    serologia: str = "Negativa"
    presion_arterial: str = "120/80"
    resultado: str = "OK"
    notas: Optional[str] = None

class DonationCreate(DonationBase):
    user_id: int
    centro_id: Optional[int] = None

class DonationSchema(DonationBase):
    id: int
    user_id: int
    centro_id: Optional[int] = None
    hospital: Optional[str] = None # Campo calculado para la vista
    dia: Optional[int] = None
    mes: Optional[str] = None
    anio: Optional[int] = None
    donante_nombre: Optional[str] = None
    donante_dni: Optional[str] = None
    donante_grupo: Optional[str] = None

    class Config:
        from_attributes = True

class DonorDetailSchema(UserSchema):
    donaciones: List[DonationSchema] = []
    total_donaciones: int = 0

# Center Schemas
class DonationCenterBase(BaseModel):
    nombre: str
    direccion: str
    horario: str
    dias: str
    telefono: Optional[str] = None

class DonationCenterCreate(DonationCenterBase):
    activo: Optional[bool] = True

class DonationCenterUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    horario: Optional[str] = None
    dias: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None

class DonationCenterSchema(DonationCenterBase):
    id: int
    activo: bool

    class Config:
        from_attributes = True


# Stock Schemas
class BloodStockBase(BaseModel):
    grupo_sanguineo: str
    unidades: int
    max_unidades: int = 60
    estado: str = "OK"

class BloodStockSchema(BloodStockBase):
    id: int

    class Config:
        from_attributes = True

class BloodStockUpdate(BaseModel):
    unidades: int

class StockConsumptionCreate(BaseModel):
    stock_id: Optional[int] = None
    grupo_sanguineo: str
    unidades: int = 1
    motivo: str
    destinatario: str
    notas: Optional[str] = None

class StockIncomeCreate(BaseModel):
    stock_id: Optional[int] = None
    grupo_sanguineo: str
    unidades: int = 1
    motivo: str
    origen: str
    notas: Optional[str] = None

class StockMovementSchema(BaseModel):
    id: int
    stock_id: int
    grupo_sanguineo: str
    tipo: str
    unidades: int
    motivo: str
    destinatario: str
    responsable_id: Optional[int] = None
    responsable_nombre: Optional[str] = None
    notas: Optional[str] = None
    created_at: datetime
    fecha_formateada: Optional[str] = None

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationBase(BaseModel):
    tipo: str
    titulo: str
    cuerpo: str
    tiempo_relativo: str = "Hace un momento"
    leida: bool = False

class NotificationSchema(NotificationBase):
    id: int
    user_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Urgent Alert Schemas
class UrgentAlertCreate(BaseModel):
    grupo: str
    centro: str
    mensaje: str

class UrgentAlertSchema(BaseModel):
    id: int
    grupo_requerido: str
    centro_nombre: str
    mensaje: str
    total_notificados: int
    activa: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Dashboard & Metrics Schemas
class DashboardStats(BaseModel):
    mis_donaciones: int
    donantes_activos: int
    alertas_activas: int
    centros_habilitados: int

class MvpMetricSchema(BaseModel):
    id: int
    nombre: str
    meta: Optional[str] = None
    valor_actual: Optional[str] = None
    cumplido: bool

    class Config:
        from_attributes = True

class ChartDataPoint(BaseModel):
    mes: str
    val: int

class BloodGroupReport(BaseModel):
    grupo: str
    donaciones: int
    porcentaje: str
    tendencia: str
    tendencia_tipo: str # green, orange, red, gray

class ReportsSummary(BaseModel):
    total_donaciones: int
    tasa_respuesta: str
    tiempo_respuesta: str
    reduccion_llamadas: str
    grupos: List[BloodGroupReport]

# Donation Appointments / Intention to Donate Schemas
class DonationAppointmentCreate(BaseModel):
    centro_id: int
    fecha: str
    franja_horaria: str
    alerta_id: Optional[int] = None
    motivo: Optional[str] = "Donación voluntaria"
    notas: Optional[str] = None

class DonationAppointmentSchema(BaseModel):
    id: int
    user_id: int
    centro_id: int
    centro_nombre: Optional[str] = None
    centro_direccion: Optional[str] = None
    fecha: str
    franja_horaria: str
    alerta_id: Optional[int] = None
    motivo: str
    estado: str
    notas: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AdminAppointmentSchema(BaseModel):
    id: int
    user_id: int
    donante_nombre: str
    donante_dni: str
    donante_grupo: str
    donante_telefono: Optional[str] = None
    donante_email: Optional[str] = None
    centro_id: int
    centro_nombre: str
    centro_direccion: str
    fecha: str
    franja_horaria: str
    alerta_id: Optional[int] = None
    motivo: str
    estado: str
    notas: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AppointmentStatusUpdate(BaseModel):
    estado: str
    notas_admin: Optional[str] = None
    notificar_donante: Optional[bool] = True
    mensaje_notificacion: Optional[str] = None

class AppointmentNotifyDonor(BaseModel):
    titulo: str
    cuerpo: str
    tipo: Optional[str] = "blue"

class AppointmentRescheduleSchema(BaseModel):
    nueva_fecha: str
    nueva_franja_horaria: str
    motivo: Optional[str] = None
    notificar_donante: Optional[bool] = True
    mensaje_notificacion: Optional[str] = None

class AdminAppointmentCreate(BaseModel):
    user_id: int
    centro_id: int
    fecha: str
    franja_horaria: str
    motivo: Optional[str] = "Turno asignado por Hemoterapia"
    notas: Optional[str] = None
    notificar_donante: Optional[bool] = True

# Settings Schemas
class SystemSettingSchema(BaseModel):
    id: int
    clave: str
    valor: str
    descripcion: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SystemSettingUpdate(BaseModel):
    valor: str

