from typing import List, Optional
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app import models, schemas

# Month names Spanish helper
MESES_ES = {
    1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr',
    5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Ago',
    9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
}

def authenticate_user(db: Session, dni: str, fecha_str: str) -> Optional[models.User]:
    clean_dni = dni.replace(".", "").strip()
    user = db.query(models.User).filter(models.User.dni == clean_dni).first()
    if not user:
        return None
    
    user_date = user.fecha_nacimiento.strftime("%Y-%m-%d")
    alt_date = user.fecha_nacimiento.strftime("%d/%m/%Y")
    
    if fecha_str == user_date or fecha_str == alt_date:
        return user
    return None

def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_dni(db: Session, dni: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.dni == dni).first()

def create_donor(db: Session, user_in: schemas.UserCreate) -> models.User:
    clean_dni = user_in.dni.replace(".", "").strip()
    existing = get_user_by_dni(db, clean_dni)
    if existing:
        raise ValueError("Ya existe un donante registrado con ese DNI.")
    
    # Calcular próxima donación sugerida (hoy mismo si es nuevo)
    user = models.User(
        dni=clean_dni,
        fecha_nacimiento=user_in.fecha_nacimiento,
        nombre=user_in.nombre,
        apellido=user_in.apellido,
        email=user_in.email,
        telefono=user_in.telefono,
        grupo_sanguineo=user_in.grupo_sanguineo,
        rol="Donante",
        es_apto=user_in.es_apto,
        fecha_proxima_donacion=date.today()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_donor_status(db: Session, donor_id: int, es_apto: bool) -> Optional[models.User]:
    user = get_user_by_id(db, donor_id)
    if user:
        user.es_apto = es_apto
        db.commit()
        db.refresh(user)
    return user

def get_donor_full(db: Session, donor_id: int) -> Optional[dict]:
    donor = get_user_by_id(db, donor_id)
    if not donor:
        return None
    
    donations = get_user_donations(db, donor_id)
    return {
        "id": donor.id,
        "dni": donor.dni,
        "fecha_nacimiento": donor.fecha_nacimiento,
        "nombre": donor.nombre,
        "apellido": donor.apellido,
        "email": donor.email,
        "telefono": donor.telefono,
        "grupo_sanguineo": donor.grupo_sanguineo,
        "rol": donor.rol,
        "es_apto": donor.es_apto,
        "fecha_proxima_donacion": donor.fecha_proxima_donacion,
        "created_at": donor.created_at,
        "donaciones": donations,
        "total_donaciones": len(donations)
    }

def get_all_users(db: Session, query: Optional[str] = None) -> List[models.User]:
    q = db.query(models.User)
    if query:
        search = f"%{query.lower()}%"
        q = q.filter(
            (models.User.nombre.ilike(search)) |
            (models.User.apellido.ilike(search)) |
            (models.User.dni.ilike(search)) |
            (models.User.grupo_sanguineo.ilike(search))
        )
    return q.order_by(models.User.id.desc()).all()

def update_user_phone(db: Session, user_id: int, telefono: str) -> Optional[models.User]:
    user = get_user_by_id(db, user_id)
    if user:
        user.telefono = telefono
        db.commit()
        db.refresh(user)
    return user

def get_user_donations(db: Session, user_id: Optional[int] = None) -> List[dict]:
    q = db.query(models.Donation)
    if user_id is not None:
        q = q.filter(models.Donation.user_id == user_id)
    donations = q.order_by(models.Donation.fecha.desc(), models.Donation.id.desc()).all()
    res = []
    for d in donations:
        hospital_name = d.center.nombre if d.center else "Banco Central de Sangre"
        donante_nom = f"{d.user.nombre} {d.user.apellido}" if d.user else "Donante"
        donante_dni = d.user.dni if d.user else "—"
        donante_grp = d.user.grupo_sanguineo if d.user else "—"
        res.append({
            "id": d.id,
            "user_id": d.user_id,
            "centro_id": d.centro_id,
            "fecha": d.fecha,
            "dia": d.fecha.day,
            "mes": MESES_ES.get(d.fecha.month, "Ene"),
            "anio": d.fecha.year,
            "hospital": hospital_name,
            "hemoglobina": d.hemoglobina,
            "serologia": d.serologia,
            "presion_arterial": d.presion_arterial,
            "resultado": d.resultado,
            "notas": d.notas,
            "donante_nombre": donante_nom,
            "donante_dni": donante_dni,
            "donante_grupo": donante_grp,
        })
    return res

def create_donation(db: Session, donation_in: schemas.DonationCreate) -> models.Donation:
    donation = models.Donation(
        user_id=donation_in.user_id,
        centro_id=donation_in.centro_id,
        fecha=donation_in.fecha,
        hemoglobina=donation_in.hemoglobina,
        serologia=donation_in.serologia,
        presion_arterial=donation_in.presion_arterial,
        resultado=donation_in.resultado,
        notas=donation_in.notas
    )
    db.add(donation)
    
    # Actualizar fecha de próxima donación con intervalo configurable y sumar al stock
    user = get_user_by_id(db, donation_in.user_id)
    if user:
        dias_espera = 90
        try:
            dias_espera = int(get_setting(db, "dias_espera_donacion", default="90"))
        except Exception:
            dias_espera = 90
        user.fecha_proxima_donacion = donation_in.fecha + timedelta(days=dias_espera)

        # Si la serología no es reactiva y el resultado es OK, sumar 1 bolsa al stock
        if donation_in.serologia != "Positiva" and donation_in.resultado == "OK" and user.grupo_sanguineo:
            grupo = user.grupo_sanguineo
            stock = db.query(models.BloodStock).filter(
                (models.BloodStock.grupo_sanguineo == grupo) |
                (models.BloodStock.grupo_sanguineo == grupo.replace('-', '–')) |
                (models.BloodStock.grupo_sanguineo == grupo.replace('–', '-'))
            ).first()
            if stock:
                stock.unidades = min(stock.unidades + 1, stock.max_unidades)
                pct = stock.unidades / stock.max_unidades if stock.max_unidades > 0 else 0
                if pct < 0.2:
                    stock.estado = "Crítico"
                elif pct < 0.45:
                    stock.estado = "Bajo"
                else:
                    stock.estado = "OK"

                # Registrar movimiento de ingreso para auditoría
                mov_in = models.StockMovement(
                    stock_id=stock.id,
                    grupo_sanguineo=stock.grupo_sanguineo,
                    tipo="INGRESO",
                    unidades=1,
                    motivo="Donación voluntaria apta",
                    destinatario="Banco Central de Sangre",
                    responsable_id=user.id,
                    responsable_nombre=f"{user.nombre} {user.apellido} (Donante DNI {user.dni})",
                    notas=f"Control: Hgb {donation_in.hemoglobina}, Presión {donation_in.presion_arterial}"
                )
                db.add(mov_in)

        hospital_name = "Centro de Hemoterapia"
        if donation_in.centro_id:
            center = db.query(models.DonationCenter).filter(models.DonationCenter.id == donation_in.centro_id).first()
            if center:
                hospital_name = center.nombre

        # Crear notificación de donación registrada
        notif = models.Notification(
            user_id=user.id,
            tipo="green",
            titulo="Donación registrada",
            cuerpo=f"Tu donación en {hospital_name} fue registrada con éxito e ingresada al stock provincial ({user.grupo_sanguineo}).",
            tiempo_relativo="Hace un momento",
            leida=False
        )
        db.add(notif)
        
    db.commit()
    db.refresh(donation)
    return donation

def sync_stock_with_donations(db: Session):
    """Sincroniza el stock de sangre asegurando que refleje al menos las donaciones aptas existentes."""
    stocks = db.query(models.BloodStock).all()
    for s in stocks:
        grupo = s.grupo_sanguineo
        count = db.query(models.Donation).join(models.User).filter(
            (models.User.grupo_sanguineo == grupo) |
            (models.User.grupo_sanguineo == grupo.replace('-', '–')) |
            (models.User.grupo_sanguineo == grupo.replace('–', '-')),
            models.Donation.serologia != "Positiva",
            models.Donation.resultado == "OK"
        ).count()
        if count > s.unidades:
            s.unidades = min(count, s.max_unidades)
            pct = s.unidades / s.max_unidades if s.max_unidades > 0 else 0
            if pct < 0.2:
                s.estado = "Crítico"
            elif pct < 0.45:
                s.estado = "Bajo"
            else:
                s.estado = "OK"
    db.commit()

def get_donation_centers(db: Session, include_inactive: bool = False) -> List[models.DonationCenter]:
    q = db.query(models.DonationCenter)
    if not include_inactive:
        q = q.filter(models.DonationCenter.activo == True)
    return q.order_by(models.DonationCenter.id.asc()).all()

def get_donation_center_by_id(db: Session, center_id: int) -> Optional[models.DonationCenter]:
    return db.query(models.DonationCenter).filter(models.DonationCenter.id == center_id).first()

def create_donation_center(db: Session, center_in: schemas.DonationCenterCreate) -> models.DonationCenter:
    center = models.DonationCenter(
        nombre=center_in.nombre.strip(),
        direccion=center_in.direccion.strip(),
        horario=center_in.horario.strip(),
        dias=center_in.dias.strip(),
        telefono=center_in.telefono.strip() if center_in.telefono else None,
        activo=center_in.activo if center_in.activo is not None else True
    )
    db.add(center)
    db.commit()
    db.refresh(center)
    return center

def update_donation_center(db: Session, center_id: int, center_in: schemas.DonationCenterUpdate) -> Optional[models.DonationCenter]:
    center = get_donation_center_by_id(db, center_id)
    if not center:
        return None
    if center_in.nombre is not None:
        center.nombre = center_in.nombre.strip()
    if center_in.direccion is not None:
        center.direccion = center_in.direccion.strip()
    if center_in.horario is not None:
        center.horario = center_in.horario.strip()
    if center_in.dias is not None:
        center.dias = center_in.dias.strip()
    if center_in.telefono is not None:
        center.telefono = center_in.telefono.strip()
    if center_in.activo is not None:
        center.activo = center_in.activo
    db.commit()
    db.refresh(center)
    return center

def toggle_donation_center_status(db: Session, center_id: int) -> Optional[models.DonationCenter]:
    center = get_donation_center_by_id(db, center_id)
    if not center:
        return None
    center.activo = not center.activo
    db.commit()
    db.refresh(center)
    return center

def delete_donation_center(db: Session, center_id: int) -> bool:
    center = get_donation_center_by_id(db, center_id)
    if not center:
        return False
    has_appointments = db.query(models.DonationAppointment).filter(models.DonationAppointment.centro_id == center_id).count() > 0
    has_donations = db.query(models.Donation).filter(models.Donation.centro_id == center_id).count() > 0
    if has_appointments or has_donations:
        center.activo = False
        db.commit()
        return True
    db.delete(center)
    db.commit()
    return True

def get_blood_stock(db: Session) -> List[models.BloodStock]:
    return db.query(models.BloodStock).order_by(models.BloodStock.id).all()

def update_blood_stock(db: Session, stock_id: int, unidades: int) -> Optional[models.BloodStock]:
    stock = db.query(models.BloodStock).filter(models.BloodStock.id == stock_id).first()
    if stock:
        stock.unidades = unidades
        pct = unidades / stock.max_unidades
        if pct < 0.2:
            stock.estado = "Crítico"
        elif pct < 0.45:
            stock.estado = "Bajo"
        else:
            stock.estado = "OK"
        db.commit()
        db.refresh(stock)
    return stock

def consume_blood_stock(db: Session, consumption_in: schemas.StockConsumptionCreate, user: Optional[models.User] = None) -> models.StockMovement:
    grupo = consumption_in.grupo_sanguineo
    stock = db.query(models.BloodStock).filter(
        (models.BloodStock.grupo_sanguineo == grupo) |
        (models.BloodStock.grupo_sanguineo == grupo.replace('-', '–')) |
        (models.BloodStock.grupo_sanguineo == grupo.replace('–', '-'))
    ).first()

    if not stock:
        raise ValueError(f"No se encontró el grupo sanguíneo {grupo} en el banco de stock.")

    if stock.unidades < consumption_in.unidades:
        raise ValueError(f"Stock insuficiente: no podés egresar {consumption_in.unidades} bolsa(s) porque solo hay {stock.unidades} disponible(s) del grupo {stock.grupo_sanguineo}.")

    # Descontar del inventario
    stock.unidades -= consumption_in.unidades
    pct = stock.unidades / stock.max_unidades if stock.max_unidades > 0 else 0
    if pct < 0.2:
        stock.estado = "Crítico"
    elif pct < 0.45:
        stock.estado = "Bajo"
    else:
        stock.estado = "OK"

    # Responsable de la baja
    resp_id = user.id if user else None
    resp_nom = f"{user.nombre} {user.apellido} (DNI {user.dni})" if user else "Personal de Hemoterapia"

    movement = models.StockMovement(
        stock_id=stock.id,
        grupo_sanguineo=stock.grupo_sanguineo,
        tipo="EGRESO",
        unidades=consumption_in.unidades,
        motivo=consumption_in.motivo,
        destinatario=consumption_in.destinatario,
        responsable_id=resp_id,
        responsable_nombre=resp_nom,
        notas=consumption_in.notas
    )
    db.add(movement)

    # Si bajó a nivel Crítico, alertar
    if stock.estado == "Crítico":
        notif = models.Notification(
            tipo="urgent",
            titulo=f"Stock crítico – Grupo {stock.grupo_sanguineo}",
            cuerpo=f"Las reservas de {stock.grupo_sanguineo} bajaron a {stock.unidades} bolsa(s) tras el egreso ({consumption_in.motivo} para {consumption_in.destinatario}).",
            tiempo_relativo="Hace un momento",
            leida=False
        )
        db.add(notif)

    db.commit()
    db.refresh(movement)
    return movement

def add_blood_stock_income(db: Session, income_in: schemas.StockIncomeCreate, user: Optional[models.User] = None) -> models.StockMovement:
    grupo = income_in.grupo_sanguineo
    stock = db.query(models.BloodStock).filter(
        (models.BloodStock.grupo_sanguineo == grupo) |
        (models.BloodStock.grupo_sanguineo == grupo.replace('-', '–')) |
        (models.BloodStock.grupo_sanguineo == grupo.replace('–', '-'))
    ).first()

    if not stock:
        raise ValueError(f"No se encontró el grupo sanguíneo {grupo} en el banco de stock.")

    if income_in.unidades < 1:
        raise ValueError("La cantidad de unidades a ingresar debe ser al menos 1 bolsa.")

    # Incrementar el inventario (hasta el máximo establecido)
    stock.unidades = min(stock.max_unidades, stock.unidades + income_in.unidades)
    pct = stock.unidades / stock.max_unidades if stock.max_unidades > 0 else 0
    if pct < 0.2:
        stock.estado = "Crítico"
    elif pct < 0.45:
        stock.estado = "Bajo"
    else:
        stock.estado = "OK"

    resp_id = user.id if user else None
    resp_nom = f"{user.nombre} {user.apellido} (DNI {user.dni})" if user else "Personal de Hemoterapia"

    movement = models.StockMovement(
        stock_id=stock.id,
        grupo_sanguineo=stock.grupo_sanguineo,
        tipo="INGRESO",
        unidades=income_in.unidades,
        motivo=income_in.motivo,
        destinatario=f"Origen: {income_in.origen}",
        responsable_id=resp_id,
        responsable_nombre=resp_nom,
        notas=income_in.notas
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

def get_stock_movements(db: Session, limit: int = 50) -> List[dict]:
    movements = db.query(models.StockMovement).order_by(models.StockMovement.created_at.desc(), models.StockMovement.id.desc()).limit(limit).all()
    res = []
    for m in movements:
        fecha_str = m.created_at.strftime('%d/%m/%Y %H:%M') if m.created_at else "Reciente"
        res.append({
            "id": m.id,
            "stock_id": m.stock_id,
            "grupo_sanguineo": m.grupo_sanguineo,
            "tipo": m.tipo,
            "unidades": m.unidades,
            "motivo": m.motivo,
            "destinatario": m.destinatario,
            "responsable_id": m.responsable_id,
            "responsable_nombre": m.responsable_nombre or "Servicio de Hemoterapia",
            "notas": m.notas or "",
            "created_at": m.created_at,
            "fecha_formateada": fecha_str
        })
    return res

def get_notifications(db: Session, user_id: Optional[int] = None) -> List[models.Notification]:
    q = db.query(models.Notification)
    if user_id:
        q = q.filter((models.Notification.user_id == user_id) | (models.Notification.user_id == None))
    return q.order_by(models.Notification.created_at.desc()).all()

def mark_notification_read(db: Session, notif_id: int) -> Optional[models.Notification]:
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if notif:
        notif.leida = True
        db.commit()
        db.refresh(notif)
    return notif

def mark_all_notifications_read(db: Session, user_id: int):
    db.query(models.Notification).filter(
        (models.Notification.user_id == user_id) | (models.Notification.user_id == None)
    ).update({"leida": True}, synchronize_session=False)
    db.commit()

def create_urgent_alert(db: Session, alert_in: schemas.UrgentAlertCreate, emisor_id: Optional[int] = None) -> models.UrgentAlert:
    compatibles_count = db.query(models.User).filter(models.User.rol == "Donante").count()
    
    alert = models.UrgentAlert(
        grupo_requerido=alert_in.grupo,
        centro_nombre=alert_in.centro,
        mensaje=alert_in.mensaje,
        emisor_id=emisor_id,
        total_notificados=compatibles_count,
        activa=True
    )
    db.add(alert)
    
    notif = models.Notification(
        tipo="urgent",
        titulo=f"Alerta urgente – Grupo {alert_in.grupo}",
        cuerpo=alert_in.mensaje,
        tiempo_relativo="Hace un momento",
        leida=False
    )
    db.add(notif)
    
    db.commit()
    db.refresh(alert)
    return alert

def is_blood_compatible(donor_group: str, required_group: str) -> bool:
    norm_d = (donor_group or "").replace("–", "-").strip().upper()
    norm_r = (required_group or "").replace("–", "-").strip().upper()
    compat = {
        "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
        "O+": ["O+", "A+", "B+", "AB+"],
        "A-": ["A-", "A+", "AB-", "AB+"],
        "A+": ["A+", "AB+"],
        "B-": ["B-", "B+", "AB-", "AB+"],
        "B+": ["B+", "AB+"],
        "AB-": ["AB-", "AB+"],
        "AB+": ["AB+"],
    }
    allowed = compat.get(norm_d, [])
    return norm_r in allowed

def get_active_alert_for_user(db: Session, user_group: str) -> Optional[models.UrgentAlert]:
    alerts = db.query(models.UrgentAlert).filter(models.UrgentAlert.activa == True).order_by(models.UrgentAlert.created_at.desc()).all()
    for a in alerts:
        if is_blood_compatible(user_group, a.grupo_requerido):
            return a
    return None

def get_dashboard_stats(db: Session, user_id: int) -> dict:
    mis_donaciones = db.query(models.Donation).filter(models.Donation.user_id == user_id).count()
    donantes_activos = db.query(models.User).filter(models.User.rol == "Donante").count()
    alertas_activas = db.query(models.Notification).filter(
        ((models.Notification.user_id == user_id) | (models.Notification.user_id == None)),
        models.Notification.leida == False
    ).count()
    centros_habilitados = db.query(models.DonationCenter).filter(models.DonationCenter.activo == True).count()

    return {
        "mis_donaciones": mis_donaciones,
        "donantes_activos": donantes_activos,
        "alertas_activas": alertas_activas,
        "centros_habilitados": centros_habilitados
    }

def get_chart_data(db: Session) -> List[dict]:
    # Meses del año
    meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    conteo_meses = {m: 0 for m in meses}

    donations = db.query(models.Donation).all()
    for d in donations:
        mes_nombre = MESES_ES.get(d.fecha.month)
        if mes_nombre in conteo_meses:
            conteo_meses[mes_nombre] += 1

    return [{"mes": m, "val": conteo_meses[m]} for m in meses]

def get_reports_summary(db: Session) -> dict:
    total_donations = db.query(models.Donation).count()
    total_donors = db.query(models.User).filter(models.User.rol == "Donante").count()

    # Contar donaciones por grupo sanguíneo real del donante
    grupos_orden = ['O+', 'O–', 'A+', 'A–', 'B+', 'B–', 'AB+', 'AB–']
    conteo_grupos = {g: 0 for g in grupos_orden}

    donations = db.query(models.Donation).all()
    for d in donations:
        if d.user and d.user.grupo_sanguineo in conteo_grupos:
            conteo_grupos[d.user.grupo_sanguineo] += 1

    grupos_data = []
    for g in grupos_orden:
        cant = conteo_grupos[g]
        pct = f"{round((cant / total_donations * 100))}%" if total_donations > 0 else "0%"
        grupos_data.append({
            "grupo": g,
            "donaciones": cant,
            "porcentaje": pct,
            "tendencia": "—" if cant == 0 else f"{cant} reg.",
            "tendencia_tipo": "gray" if cant == 0 else "green"
        })

    return {
        "total_donaciones": total_donations,
        "tasa_respuesta": "0%" if total_donors == 0 else f"{min(100, round((total_donations / total_donors) * 100))}%",
        "tiempo_respuesta": "—" if total_donations == 0 else "< 24h",
        "reduccion_llamadas": "—" if total_donations == 0 else "-50%",
        "grupos": grupos_data
    }

def create_donation_appointment(db: Session, user_id: int, apt_in: schemas.DonationAppointmentCreate) -> dict:
    center = db.query(models.DonationCenter).filter(models.DonationCenter.id == apt_in.centro_id).first()
    if not center:
        raise ValueError("Centro de donación no encontrado.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError("Usuario donante no encontrado.")

    # Verificación estricta de aptitud médica y período de espera biológica
    if not user.es_apto:
        raise ValueError("Actualmente no te encontrás registrado como apto para donar sangre.")
    if user.fecha_proxima_donacion and user.fecha_proxima_donacion > date.today():
        dias_rest = (user.fecha_proxima_donacion - date.today()).days
        raise ValueError(
            f"Te encontrás en período de recuperación biológica ({dias_rest} días restantes, disponible a partir del {user.fecha_proxima_donacion.strftime('%d/%m/%Y')})."
        )

    apt = models.DonationAppointment(
        user_id=user_id,
        centro_id=apt_in.centro_id,
        fecha=apt_in.fecha,
        franja_horaria=apt_in.franja_horaria,
        alerta_id=apt_in.alerta_id,
        motivo=apt_in.motivo or "Donación voluntaria",
        estado="Confirmada",
        notas=apt_in.notas
    )
    db.add(apt)

    # Si respondió a una alerta urgente, verificar compatibilidad y registrar impacto
    if apt_in.alerta_id:
        alert = db.query(models.UrgentAlert).filter(models.UrgentAlert.id == apt_in.alerta_id).first()
        if alert and alert.grupo_requerido:
            if not is_blood_compatible(user.grupo_sanguineo, alert.grupo_requerido):
                raise ValueError(
                    f"Incompatibilidad sanguínea: tu grupo ({user.grupo_sanguineo}) no es compatible para donar al grupo solicitado ({alert.grupo_requerido})."
                )
            alert.total_notificados = (alert.total_notificados or 0) + 1

    # Crear notificación personalizada y amigable
    notif = models.Notification(
        user_id=user_id,
        tipo="green",
        titulo="¡Turno confirmado para donar sangre!",
        cuerpo=f"Te esperamos el {apt_in.fecha} ({apt_in.franja_horaria}) en {center.nombre} ({center.direccion}). Recordá desayunar liviano sin grasas y llevar tu DNI. ¡Gracias por tu solidaridad!",
        tiempo_relativo="Hace un momento",
        leida=False
    )
    db.add(notif)

    db.commit()
    db.refresh(apt)

    return {
        "id": apt.id,
        "user_id": apt.user_id,
        "centro_id": apt.centro_id,
        "centro_nombre": center.nombre,
        "centro_direccion": center.direccion,
        "fecha": apt.fecha,
        "franja_horaria": apt.franja_horaria,
        "alerta_id": apt.alerta_id,
        "motivo": apt.motivo,
        "estado": apt.estado,
        "notas": apt.notas,
        "created_at": apt.created_at
    }

def get_user_appointments(db: Session, user_id: int) -> List[dict]:
    apts = db.query(models.DonationAppointment).filter(
        models.DonationAppointment.user_id == user_id
    ).order_by(models.DonationAppointment.created_at.desc()).all()

    res = []
    for a in apts:
        center_nombre = a.centro.nombre if a.centro else "Centro de Hemoterapia"
        center_dir = a.centro.direccion if a.centro else "Mendoza"
        res.append({
            "id": a.id,
            "user_id": a.user_id,
            "centro_id": a.centro_id,
            "centro_nombre": center_nombre,
            "centro_direccion": center_dir,
            "fecha": a.fecha,
            "franja_horaria": a.franja_horaria,
            "alerta_id": a.alerta_id,
            "motivo": a.motivo,
            "estado": a.estado,
            "notas": a.notas,
            "created_at": a.created_at
        })
    return res

def cancel_donation_appointment(db: Session, appointment_id: int, user_id: int) -> bool:
    apt = db.query(models.DonationAppointment).filter(
        models.DonationAppointment.id == appointment_id,
        models.DonationAppointment.user_id == user_id
    ).first()
    if not apt:
        return False
    apt.estado = "Cancelada"
    notif = models.Notification(
        user_id=user_id,
        tipo="orange",
        titulo="Turno de donación cancelado",
        cuerpo=f"Cancelaste tu turno del {apt.fecha}. Cuando quieras podés agendar uno nuevo en la app.",
        tiempo_relativo="Hace un momento",
        leida=False
    )
    db.add(notif)
    db.commit()
    return True

def get_all_appointments(db: Session, estado: Optional[str] = None) -> List[dict]:
    q = db.query(models.DonationAppointment)
    if estado and estado != "Todos":
        q = q.filter(models.DonationAppointment.estado == estado)
    apts = q.order_by(models.DonationAppointment.fecha.desc(), models.DonationAppointment.id.desc()).all()
    
    res = []
    for a in apts:
        donante_nombre = f"{a.user.nombre} {a.user.apellido}" if a.user else "Donante"
        donante_dni = a.user.dni if a.user else ""
        donante_grupo = a.user.grupo_sanguineo if a.user else ""
        donante_tel = a.user.telefono if a.user else ""
        donante_email = a.user.email if a.user else ""
        center_nombre = a.centro.nombre if a.centro else "Centro de Hemoterapia"
        center_dir = a.centro.direccion if a.centro else "Mendoza"

        res.append({
            "id": a.id,
            "user_id": a.user_id,
            "donante_nombre": donante_nombre,
            "donante_dni": donante_dni,
            "donante_grupo": donante_grupo,
            "donante_telefono": donante_tel,
            "donante_email": donante_email,
            "centro_id": a.centro_id,
            "centro_nombre": center_nombre,
            "centro_direccion": center_dir,
            "fecha": a.fecha,
            "franja_horaria": a.franja_horaria,
            "alerta_id": a.alerta_id,
            "motivo": a.motivo,
            "estado": a.estado,
            "notas": a.notas or "",
            "created_at": a.created_at
        })
    return res

def update_appointment_status(db: Session, appointment_id: int, status_in: schemas.AppointmentStatusUpdate) -> Optional[dict]:
    apt = db.query(models.DonationAppointment).filter(models.DonationAppointment.id == appointment_id).first()
    if not apt:
        return None
    
    apt.estado = status_in.estado
    if status_in.notas_admin:
        if apt.notas:
            apt.notas += f" | {status_in.notas_admin}"
        else:
            apt.notas = status_in.notas_admin
            
    if status_in.notificar_donante and apt.user_id:
        titulo = "Actualización de tu turno de donación"
        tipo = "blue"
        centro_txt = apt.centro.nombre if apt.centro else 'el centro'
        if status_in.estado == "Confirmada":
            tipo = "green"
            titulo = "✅ ¡Turno de donación confirmado!"
            cuerpo = status_in.mensaje_notificacion or f"Tu turno para el {apt.fecha} ({apt.franja_horaria}) en {centro_txt} ha sido confirmado. Te esperamos con DNI y buen descanso."
        elif status_in.estado == "Completada":
            tipo = "green"
            titulo = "🩸 ¡Donación realizada con éxito!"
            cuerpo = status_in.mensaje_notificacion or f"Muchas gracias por donar el {apt.fecha}. Tu generosidad salva vidas. Ya podés consultar tu constancia en Mi Perfil."
        elif status_in.estado == "Cancelada":
            tipo = "orange"
            titulo = "⚠️ Turno cancelado por el centro"
            cuerpo = status_in.mensaje_notificacion or f"El turno agendado para el {apt.fecha} en {centro_txt} ha sido cancelado. Podés reprogramarlo cuando gustes desde la app."
        else:
            cuerpo = status_in.mensaje_notificacion or f"El estado de tu turno ha cambiado a: {status_in.estado}."

        notif = models.Notification(
            user_id=apt.user_id,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            tiempo_relativo="Hace un momento",
            leida=False
        )
        db.add(notif)
        
    db.commit()
    db.refresh(apt)
    
    donante_nombre = f"{apt.user.nombre} {apt.user.apellido}" if apt.user else "Donante"
    return {
        "id": apt.id,
        "user_id": apt.user_id,
        "donante_nombre": donante_nombre,
        "donante_dni": apt.user.dni if apt.user else "",
        "donante_grupo": apt.user.grupo_sanguineo if apt.user else "",
        "donante_telefono": apt.user.telefono if apt.user else "",
        "donante_email": apt.user.email if apt.user else "",
        "centro_id": apt.centro_id,
        "centro_nombre": apt.centro.nombre if apt.centro else "",
        "centro_direccion": apt.centro.direccion if apt.centro else "",
        "fecha": apt.fecha,
        "franja_horaria": apt.franja_horaria,
        "alerta_id": apt.alerta_id,
        "motivo": apt.motivo,
        "estado": apt.estado,
        "notas": apt.notas or "",
        "created_at": apt.created_at
    }

def notify_appointment_donor(db: Session, appointment_id: int, notify_in: schemas.AppointmentNotifyDonor) -> Optional[models.Notification]:
    apt = db.query(models.DonationAppointment).filter(models.DonationAppointment.id == appointment_id).first()
    if not apt or not apt.user_id:
        return None
    notif = models.Notification(
        user_id=apt.user_id,
        tipo=notify_in.tipo or "blue",
        titulo=notify_in.titulo,
        cuerpo=notify_in.cuerpo,
        tiempo_relativo="Hace un momento",
        leida=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def reschedule_appointment(db: Session, appointment_id: int, resched_in: schemas.AppointmentRescheduleSchema) -> Optional[dict]:
    apt = db.query(models.DonationAppointment).filter(models.DonationAppointment.id == appointment_id).first()
    if not apt:
        return None

    fecha_anterior = apt.fecha
    franja_anterior = apt.franja_horaria
    apt.fecha = resched_in.nueva_fecha
    apt.franja_horaria = resched_in.nueva_franja_horaria
    apt.estado = "Confirmada"

    nota_txt = f"Reprogramado de {fecha_anterior} ({franja_anterior}) a {apt.fecha} ({apt.franja_horaria})"
    if resched_in.motivo:
        nota_txt += f" | Motivo: {resched_in.motivo}"
    if apt.notas:
        apt.notas += f" | {nota_txt}"
    else:
        apt.notas = nota_txt

    if resched_in.notificar_donante and apt.user_id:
        centro_nom = apt.centro.nombre if apt.centro else "el centro"
        notif = models.Notification(
            user_id=apt.user_id,
            tipo="blue",
            titulo="📅 Tu turno de donación ha sido reprogramado",
            cuerpo=resched_in.mensaje_notificacion or f"Tu turno en {centro_nom} ha sido reprogramado para el {apt.fecha} ({apt.franja_horaria}). Recordá asistir con tu DNI.",
            tiempo_relativo="Hace un momento",
            leida=False
        )
        db.add(notif)

    db.commit()
    db.refresh(apt)

    donante_nombre = f"{apt.user.nombre} {apt.user.apellido}" if apt.user else "Donante"
    return {
        "id": apt.id,
        "user_id": apt.user_id,
        "donante_nombre": donante_nombre,
        "donante_dni": apt.user.dni if apt.user else "",
        "donante_grupo": apt.user.grupo_sanguineo if apt.user else "",
        "donante_telefono": apt.user.telefono if apt.user else "",
        "donante_email": apt.user.email if apt.user else "",
        "centro_id": apt.centro_id,
        "centro_nombre": apt.centro.nombre if apt.centro else "",
        "centro_direccion": apt.centro.direccion if apt.centro else "",
        "fecha": apt.fecha,
        "franja_horaria": apt.franja_horaria,
        "alerta_id": apt.alerta_id,
        "motivo": apt.motivo,
        "estado": apt.estado,
        "notas": apt.notas or "",
        "created_at": apt.created_at
    }

def create_admin_appointment(db: Session, admin_apt_in: schemas.AdminAppointmentCreate) -> dict:
    center = db.query(models.DonationCenter).filter(models.DonationCenter.id == admin_apt_in.centro_id).first()
    if not center:
        raise ValueError("Centro de donación no encontrado.")
    user = db.query(models.User).filter(models.User.id == admin_apt_in.user_id).first()
    if not user:
        raise ValueError("Usuario donante no encontrado.")

    apt = models.DonationAppointment(
        user_id=admin_apt_in.user_id,
        centro_id=admin_apt_in.centro_id,
        fecha=admin_apt_in.fecha,
        franja_horaria=admin_apt_in.franja_horaria,
        motivo=admin_apt_in.motivo or "Turno asignado por Hemoterapia",
        estado="Confirmada",
        notas=admin_apt_in.notas
    )
    db.add(apt)

    if admin_apt_in.notificar_donante:
        notif = models.Notification(
            user_id=user.id,
            tipo="green",
            titulo="✅ Turno de donación asignado",
            cuerpo=f"El Servicio de Hemoterapia te ha asignado un turno para el {admin_apt_in.fecha} ({admin_apt_in.franja_horaria}) en {center.nombre} ({center.direccion}).",
            tiempo_relativo="Hace un momento",
            leida=False
        )
        db.add(notif)

    db.commit()
    db.refresh(apt)

    return {
        "id": apt.id,
        "user_id": apt.user_id,
        "donante_nombre": f"{user.nombre} {user.apellido}",
        "donante_dni": user.dni,
        "donante_grupo": user.grupo_sanguineo,
        "donante_telefono": user.telefono or "",
        "donante_email": user.email or "",
        "centro_id": apt.centro_id,
        "centro_nombre": center.nombre,
        "centro_direccion": center.direccion,
        "fecha": apt.fecha,
        "franja_horaria": apt.franja_horaria,
        "alerta_id": apt.alerta_id,
        "motivo": apt.motivo,
        "estado": apt.estado,
        "notas": apt.notas or "",
        "created_at": apt.created_at
    }

# ---------------- CONFIGURACIÓN DEL SISTEMA ----------------
def get_setting(db: Session, clave: str, default: str = "90") -> str:
    s = db.query(models.SystemSetting).filter(models.SystemSetting.clave == clave).first()
    if not s:
        s = models.SystemSetting(clave=clave, valor=default, descripcion="Intervalo de días de espera entre donaciones de sangre")
        db.add(s)
        db.commit()
        db.refresh(s)
    return s.valor

def get_all_settings(db: Session) -> List[models.SystemSetting]:
    # Asegurar que existe la clave por defecto
    get_setting(db, "dias_espera_donacion", "90")
    return db.query(models.SystemSetting).order_by(models.SystemSetting.clave.asc()).all()

def update_setting(db: Session, clave: str, valor: str) -> models.SystemSetting:
    s = db.query(models.SystemSetting).filter(models.SystemSetting.clave == clave).first()
    if not s:
        s = models.SystemSetting(clave=clave, valor=valor, descripcion="Intervalo de días de espera entre donaciones de sangre")
        db.add(s)
    else:
        s.valor = valor
    db.commit()
    db.refresh(s)
    return s

