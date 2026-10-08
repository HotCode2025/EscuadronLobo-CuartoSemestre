from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    dni = Column(String(20), unique=True, index=True, nullable=False)
    fecha_nacimiento = Column(Date, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(150), nullable=True)
    telefono = Column(String(50), nullable=True)
    grupo_sanguineo = Column(String(10), index=True, nullable=False)
    rol = Column(String(20), default="Donante")
    es_apto = Column(Boolean, default=True)
    fecha_proxima_donacion = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    donations = relationship("Donation", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class DonationCenter(Base):
    __tablename__ = "donation_centers"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    direccion = Column(String(255), nullable=False)
    horario = Column(String(100), nullable=False)
    dias = Column(String(100), nullable=False)
    telefono = Column(String(50), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    donations = relationship("Donation", back_populates="center")


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    centro_id = Column(Integer, ForeignKey("donation_centers.id", ondelete="SET NULL"), nullable=True)
    fecha = Column(Date, nullable=False)
    hemoglobina = Column(String(20), default="14.0 g/dl")
    serologia = Column(String(50), default="Negativa")
    presion_arterial = Column(String(20), default="120/80")
    resultado = Column(String(20), default="OK")
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="donations")
    center = relationship("DonationCenter", back_populates="donations")


class BloodStock(Base):
    __tablename__ = "blood_stock"

    id = Column(Integer, primary_key=True, index=True)
    grupo_sanguineo = Column(String(10), unique=True, nullable=False)
    unidades = Column(Integer, default=0, nullable=False)
    max_unidades = Column(Integer, default=60, nullable=False)
    estado = Column(String(20), default="OK")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("blood_stock.id", ondelete="CASCADE"), nullable=False)
    grupo_sanguineo = Column(String(10), nullable=False)
    tipo = Column(String(20), nullable=False) # EGRESO, INGRESO
    unidades = Column(Integer, default=1, nullable=False)
    motivo = Column(String(100), nullable=False)
    destinatario = Column(String(200), nullable=False)
    responsable_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    responsable_nombre = Column(String(150), nullable=True)
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stock = relationship("BloodStock")
    responsable = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    tipo = Column(String(20), nullable=False) # urgent, green, orange, info
    titulo = Column(String(200), nullable=False)
    cuerpo = Column(Text, nullable=False)
    tiempo_relativo = Column(String(50), default="Hace un momento")
    leida = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


class UrgentAlert(Base):
    __tablename__ = "urgent_alerts"

    id = Column(Integer, primary_key=True, index=True)
    grupo_requerido = Column(String(10), nullable=False)
    centro_nombre = Column(String(150), nullable=False)
    mensaje = Column(Text, nullable=False)
    emisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    total_notificados = Column(Integer, default=0)
    activa = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MvpMetric(Base):
    __tablename__ = "mvp_metrics"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    meta = Column(String(50), nullable=True)
    valor_actual = Column(String(50), nullable=True)
    cumplido = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DonationAppointment(Base):
    __tablename__ = "donation_appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    centro_id = Column(Integer, ForeignKey("donation_centers.id"), nullable=False)
    fecha = Column(String(20), nullable=False)
    franja_horaria = Column(String(50), nullable=False)
    alerta_id = Column(Integer, ForeignKey("urgent_alerts.id"), nullable=True)
    motivo = Column(String(200), default="Donación voluntaria")
    estado = Column(String(20), default="Confirmada") # Confirmada, Completada, Cancelada
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    centro = relationship("DonationCenter")
    alerta = relationship("UrgentAlert")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(100), unique=True, index=True, nullable=False)
    valor = Column(String(255), nullable=False)
    descripcion = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

