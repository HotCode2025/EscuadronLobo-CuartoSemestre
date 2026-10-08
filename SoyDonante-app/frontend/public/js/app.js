// ============================================================
// SOY DONANTE — Frontend App JS (Fullstack 100% Funcional)
// ============================================================

let currentUser = null;

// Matriz médica de compatibilidad sanguínea
const BLOOD_COMPAT = {
  'O+':  { donaA: 'O+, A+, B+, AB+', recibeDe: 'O+, O–' },
  'O–':  { donaA: 'Todos los grupos (Donante universal)', recibeDe: 'O–' },
  'A+':  { donaA: 'A+, AB+', recibeDe: 'A+, A–, O+, O–' },
  'A–':  { donaA: 'A+, A–, AB+, AB–', recibeDe: 'A–, O–' },
  'B+':  { donaA: 'B+, AB+', recibeDe: 'B+, B–, O+, O–' },
  'B–':  { donaA: 'B+, B–, AB+, AB–', recibeDe: 'B–, O–' },
  'AB+': { donaA: 'AB+ (Receptor universal)', recibeDe: 'Todos los grupos' },
  'AB–': { donaA: 'AB+, AB–', recibeDe: 'AB–, A–, B–, O–' },
};

// Matriz médica de compatibilidad para donación y transfusión
function canDonorDonateToGroup(donorGroup, targetGroup) {
  if (!donorGroup || !targetGroup) return true;
  const norm = g => String(g).replace(/–/g, '-').trim().toUpperCase();
  const d = norm(donorGroup);
  const t = norm(targetGroup);

  const compatMatrix = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
  };

  const allowedTargets = compatMatrix[d] || [];
  return allowedTargets.includes(t);
}

function extractBloodGroupFromText(text) {
  if (!text) return null;
  const m = String(text).match(/\b(AB|A|B|O)\s*([+\-–])/i);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const sign = m[2] === '–' ? '-' : m[2];
  return `${letter}${sign}`;
}

// ---------- HELPERS ----------
function initials(name) {
  if (!name) return 'SD';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function stockColor(u, max) {
  const p = u / max;
  if (p < 0.2) return 'var(--red)';
  if (p < 0.45) return 'var(--orange)';
  return 'var(--green)';
}

function aptTag(apt, fechaProxima = null) {
  if (!apt) {
    return `<span class="tag red">✗ No disponible</span>`;
  }
  if (fechaProxima) {
    const hoy = new Date().toISOString().split('T')[0];
    if (fechaProxima > hoy) {
      const fProx = new Date(fechaProxima + 'T00:00:00');
      const fHoy = new Date(hoy + 'T00:00:00');
      const diffTime = fProx - fHoy;
      const diasRestantes = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      return `<span class="tag orange" title="Período de recuperación biológica hasta el ${formatDate(fechaProxima)}">⏳ Espera (${diasRestantes}d)</span>`;
    }
  }
  return `<span class="tag green">✓ Apto</span>`;
}

// Formatear fecha dd/mm/yyyy
function formatDate(dStr) {
  if (!dStr) return 'A coordinar';
  const parts = dStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------- DONOR STATUS & APPOINTMENTS (EXPERIENCIA DEL DONANTE) ----------

function getDonorStatusDetails(user) {
  if (!user || user.rol !== 'Donante') return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let diasRestantes = 0;
  let esApto = true;

  if (user.fecha_proxima_donacion) {
    const proxima = new Date(user.fecha_proxima_donacion + 'T00:00:00');
    const diffTime = proxima.getTime() - hoy.getTime();
    diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    esApto = diasRestantes <= 0;
  }

  if (diasRestantes < 0) diasRestantes = 0;

  const periodoEspera = 90;
  const diasTranscurridos = Math.max(0, periodoEspera - diasRestantes);
  const porcentajeRecuperacion = Math.min(100, Math.round((diasTranscurridos / periodoEspera) * 100));

  const totalDonaciones = user.total_donaciones || 0;
  let rango = "Futuro Donante Solidario 🌟";
  if (totalDonaciones >= 6) {
    rango = "Guardián de Vidas 👑";
  } else if (totalDonaciones >= 3) {
    rango = "Héroe Comunitario 🦸";
  } else if (totalDonaciones >= 1) {
    rango = "Donante Activo 🩸";
  }

  return {
    esApto,
    diasRestantes,
    fechaProxima: user.fecha_proxima_donacion,
    porcentajeRecuperacion,
    rango,
    totalDonaciones,
    vidasSalvalas: totalDonaciones * 3,
    litros: (totalDonaciones * 0.45).toFixed(1)
  };
}

async function populateCentersSelect(selectEl, preselectedId = null) {
  if (!selectEl) return;
  if (!allCentersCache || !allCentersCache.length) {
    try {
      allCentersCache = await ApiClient.getCenters();
    } catch (e) {
      console.error('Error cargando centros', e);
    }
  }

  selectEl.innerHTML = (allCentersCache || []).map(c => `
    <option value="${c.id}" ${preselectedId && c.id == preselectedId ? 'selected' : ''}>
      ${c.nombre} (${c.direccion})
    </option>
  `).join('');

  updateAppointmentCenterInfo();
}

function updateAppointmentCenterInfo() {
  const sel = document.getElementById('appointment-centro');
  const infoEl = document.getElementById('appointment-centro-info');
  if (!sel || !infoEl || !allCentersCache || !allCentersCache.length) return;
  const centerId = parseInt(sel.value);
  const center = allCentersCache.find(c => c.id === centerId);
  if (center) {
    infoEl.innerHTML = `🕐 <strong>Horario:</strong> ${center.horario} (${center.dias}) &middot; 📞 ${center.telefono || 'Atención en centro'}`;
  }
}

async function openAppointmentModal(preselectedDate = null, preselectedCenterId = null, alertId = null, alertTitle = null) {
  if (!currentUser) {
    alert('Por favor iniciá sesión para agendar tu turno de donación.');
    return;
  }

  // Validación médica de compatibilidad si proviene de un pedido urgente
  if (alertTitle && currentUser.rol === 'Donante') {
    const reqGroup = extractBloodGroupFromText(alertTitle);
    if (reqGroup && !canDonorDonateToGroup(currentUser.grupo_sanguineo, reqGroup)) {
      alert(`⚠️ Incompatibilidad sanguínea:\n\nTu grupo sanguíneo es ${currentUser.grupo_sanguineo} y la alerta solicita sangre del grupo ${reqGroup}.\n\nPor razones médicas de transfusión y seguridad del paciente, no es posible postularte a esta solicitud. ¡Muchas gracias por tu predisposición! Te avisaremos cuando haya un llamado para tu grupo.`);
      return;
    }
  }

  const modal = document.getElementById('appointment-modal');
  const sel = document.getElementById('appointment-centro');
  const dateInput = document.getElementById('appointment-fecha');
  const alertBanner = document.getElementById('appointment-alert-banner');
  const alertDesc = document.getElementById('appointment-alert-desc');
  const alertIdInput = document.getElementById('appointment-alert-id');

  await populateCentersSelect(sel, preselectedCenterId);
  if (sel) sel.onchange = updateAppointmentCenterInfo;

  const hoyStr = new Date().toISOString().split('T')[0];
  if (dateInput) {
    dateInput.min = hoyStr;
    if (preselectedDate && preselectedDate >= hoyStr) {
      dateInput.value = preselectedDate;
    } else {
      dateInput.value = hoyStr;
    }
  }

  if (alertBanner) {
    if (alertTitle) {
      alertBanner.style.display = 'block';
      if (alertDesc) alertDesc.textContent = alertTitle;
      if (alertIdInput) alertIdInput.value = alertId || '';
    } else {
      alertBanner.style.display = 'none';
      if (alertIdInput) alertIdInput.value = '';
    }
  }

  if (modal) modal.classList.add('open');
}

function closeAppointmentModal() {
  const modal = document.getElementById('appointment-modal');
  if (modal) modal.classList.remove('open');
}

async function submitAppointment() {
  const centroId = parseInt(document.getElementById('appointment-centro').value);
  const fecha = document.getElementById('appointment-fecha').value;
  const franja = document.getElementById('appointment-franja').value;
  const notas = document.getElementById('appointment-notas').value.trim();
  const alertaId = parseInt(document.getElementById('appointment-alert-id').value) || null;
  const alertDesc = document.getElementById('appointment-alert-desc');

  if (!fecha) {
    alert('Por favor seleccioná una fecha para tu turno.');
    return;
  }

  // Doble verificación médica antes de registrar
  if (currentUser && currentUser.rol === 'Donante') {
    if (!currentUser.es_apto) {
      alert('⚠️ No podés solicitar un turno: actualmente figurás como no apto para donar sangre por prescripción médica.');
      return;
    }
    const hoy = new Date().toISOString().split('T')[0];
    if (currentUser.fecha_proxima_donacion && currentUser.fecha_proxima_donacion > hoy) {
      const fProx = new Date(currentUser.fecha_proxima_donacion + 'T00:00:00');
      const fHoy = new Date(hoy + 'T00:00:00');
      const dias = Math.max(1, Math.ceil((fProx - fHoy) / (1000 * 60 * 60 * 24)));
      alert(`⏳ Período de recuperación biológica:\n\nTu última donación fue reciente y restan ${dias} días para tu próxima fecha habilitada (${formatDate(currentUser.fecha_proxima_donacion)}). Para proteger tu salud, no es posible agendar un turno antes de dicha fecha.`);
      return;
    }
    if (alertDesc && alertDesc.textContent) {
      const reqGroup = extractBloodGroupFromText(alertDesc.textContent);
      if (reqGroup && !canDonorDonateToGroup(currentUser.grupo_sanguineo, reqGroup)) {
        alert(`⚠️ Incompatibilidad sanguínea:\n\nTu grupo sanguíneo es ${currentUser.grupo_sanguineo} y la alerta solicita grupo ${reqGroup}. No podés registrar un turno para este pedido incompatible.`);
        return;
      }
    }
  }

  try {
    const res = await ApiClient.createAppointment({
      centro_id: centroId,
      fecha: fecha,
      franja_horaria: franja,
      alerta_id: alertaId,
      notas: notas,
      motivo: alertaId ? 'Respuesta a llamado solidario urgente' : 'Donación voluntaria'
    });

    closeAppointmentModal();
    alert(`🎉 ¡Excelente! Turno de donación confirmado.\n\n• Centro: ${res.centro_nombre}\n• Fecha: ${formatDate(res.fecha)} (${res.franja_horaria})\n• Dirección: ${res.centro_direccion}\n\nRecordá no venir en ayunas de líquidos (tomá té, café, frutas; evitá lácteos y grasas) y llevar tu DNI. ¡Muchas gracias por tu compromiso!`);

    renderDashboard();
    renderPerfil();
    updateNotifBadge();
  } catch (err) {
    alert(`Error al agendar turno: ${err.message || 'Verificá los datos e intentá de nuevo.'}`);
  }
}

async function handleCancelAppointment(appointmentId) {
  if (!confirm('¿Estás seguro de que deseás cancelar este turno de donación?')) return;
  try {
    await ApiClient.cancelAppointment(appointmentId);
    alert('Turno cancelado. Podés agendar uno nuevo en cualquier momento que te quede cómodo.');
    renderDashboard();
    renderPerfil();
    updateNotifBadge();
  } catch (e) {
    alert('Error al cancelar turno.');
  }
}

function respondToAlert(alertTitle, alertDesc, targetGroup = null) {
  if (!targetGroup) targetGroup = extractBloodGroupFromText(alertTitle) || extractBloodGroupFromText(alertDesc);

  if (targetGroup && currentUser && currentUser.rol === 'Donante') {
    if (!canDonorDonateToGroup(currentUser.grupo_sanguineo, targetGroup)) {
      alert(`⚠️ Incompatibilidad sanguínea:\n\nTu grupo sanguíneo es ${currentUser.grupo_sanguineo} y esta urgencia médica solicita sangre para receptores del grupo ${targetGroup}.\n\nPara proteger la salud del paciente receptor, no es posible postularte a esta solicitud. ¡Te notificaremos cuando haya una necesidad para tu grupo!`);
      return;
    }
  }

  let matchingCenter = null;
  if (allCentersCache && allCentersCache.length) {
    matchingCenter = allCentersCache.find(c => (alertDesc || '').includes(c.nombre) || (alertTitle || '').includes(c.nombre));
  }
  const centerId = matchingCenter ? matchingCenter.id : null;
  openAppointmentModal(null, centerId, null, `${alertTitle}: ${alertDesc}`);
}

async function renderDonorHeroWidget() {
  const container = document.getElementById('donor-hero-widget');
  const topbarBtn = document.getElementById('topbar-btn-quiero-donar');

  if (!currentUser) return;

  if (currentUser.rol !== 'Donante') {
    if (container) container.innerHTML = '';
    if (topbarBtn) topbarBtn.style.display = 'none';
    return;
  }

  if (topbarBtn) topbarBtn.style.display = 'inline-flex';

  const details = getDonorStatusDetails(currentUser);

  let citas = [];
  try {
    citas = await ApiClient.getMyAppointments();
  } catch (e) {
    console.error(e);
  }

  const turnoActivo = (citas || []).find(c => c.estado === 'Confirmada');

  let htmlTurno = '';
  if (turnoActivo) {
    htmlTurno = `
      <div style="background:white;color:var(--navy);border-radius:12px;padding:16px 20px;margin-top:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;box-shadow:0 4px 14px rgba(0,0,0,0.06);border:1px solid #E2E8F0">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:42px;height:42px;border-radius:10px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:20px">
            📅
          </div>
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:0.5px">Turno confirmado de donación</div>
            <div style="font-size:15px;font-weight:800;color:var(--navy)">${turnoActivo.centro_nombre} &middot; ${formatDate(turnoActivo.fecha)}</div>
            <div style="font-size:12px;color:var(--gray)">Franja: ${turnoActivo.franja_horaria} &middot; ${turnoActivo.centro_direccion}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(turnoActivo.centro_nombre + ', ' + turnoActivo.centro_direccion + ', Mendoza')}" target="_blank" class="btn btn-outline btn-sm" style="font-size:12px;text-decoration:none">
            📍 Cómo llegar
          </a>
          <button class="btn btn-outline btn-sm" style="color:var(--red);border-color:var(--red);font-size:12px" onclick="handleCancelAppointment(${turnoActivo.id})">
            Cancelar turno
          </button>
        </div>
      </div>
    `;
  }

  let heroBanner = '';
  if (details.esApto) {
    heroBanner = `
      <div class="card" style="background:linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%);color:white;padding:26px 28px;border-radius:16px;box-shadow:0 8px 24px rgba(46,125,50,0.25);border:none">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px">
          <div style="max-width:650px">
            <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.22);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:0.5px;margin-bottom:10px">
              <span>✓ APTO PARA DONAR</span>
            </div>
            <div style="font-size:25px;font-weight:900;line-height:1.2">¡Hola ${currentUser.nombre}! Ya podés volver a donar sangre</div>
            <div style="font-size:14px;opacity:0.95;margin-top:6px;line-height:1.5">
              Tu organismo recuperó sus valores óptimos de glóbulos rojos. Tu donación hoy puede salvar hasta <strong>3 vidas</strong> en los centros hospitalarios de Mendoza.
            </div>
          </div>
          <div>
            <button class="btn" style="background:white;color:#1B5E20;font-weight:900;font-size:15px;padding:12px 24px;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,0.18);border:none;display:flex;align-items:center;gap:8px" onclick="openAppointmentModal()">
              <span>🩸</span> Quiero donar sangre
            </button>
          </div>
        </div>
        ${htmlTurno}
      </div>
    `;
  } else {
    heroBanner = `
      <div class="card" style="background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%);color:white;padding:26px 28px;border-radius:16px;box-shadow:0 8px 24px rgba(15,23,42,0.25);border:none">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px">
          <div style="max-width:650px">
            <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(245,158,11,0.25);color:#FDE68A;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:0.5px;margin-bottom:10px">
              <span>⏳ RECUPERACIÓN BIOLÓGICA</span>
            </div>
            <div style="font-size:23px;font-weight:900;line-height:1.2">Te faltan ${details.diasRestantes} días para volver a donar</div>
            <div style="font-size:14px;opacity:0.88;margin-top:6px;line-height:1.5">
              Fecha estimada disponible: <strong>${formatDate(details.fechaProxima)}</strong>. El cuerpo regenera progresivamente el hierro y los hematíes para cuidar tu salud. ¡Gracias por tu enorme solidaridad!
            </div>
            <div style="margin-top:16px">
              <div style="display:flex;justify-content:space-between;font-size:12px;opacity:0.8;margin-bottom:6px">
                <span>Recuperación celular</span>
                <span>${details.porcentajeRecuperacion}%</span>
              </div>
              <div style="background:rgba(255,255,255,0.12);border-radius:8px;height:9px;overflow:hidden">
                <div style="background:linear-gradient(90deg, #F59E0B, #10B981);height:100%;width:${details.porcentajeRecuperacion}%;border-radius:8px"></div>
              </div>
            </div>
          </div>
          <div>
            <button class="btn btn-outline" style="color:white;border-color:rgba(255,255,255,0.4);padding:10px 18px;font-weight:700;font-size:13px" onclick="openAppointmentModal('${details.fechaProxima}')">
              📅 Agendar para esa fecha
            </button>
          </div>
        </div>
        ${htmlTurno}
      </div>
    `;
  }

  const metricsBar = `
    <div class="grid grid-3 mb-24" style="margin-top:16px;gap:14px">
      <div class="card" style="padding:16px 20px;display:flex;align-items:center;gap:14px">
        <div style="font-size:28px">❤️</div>
        <div>
          <div style="font-size:11px;color:var(--gray);font-weight:700;text-transform:uppercase">Vidas que pudiste ayudar</div>
          <div style="font-size:22px;font-weight:900;color:var(--red)">Hasta ${details.vidasSalvalas} personas</div>
          <div style="font-size:11px;color:var(--gray)">3 vidas por cada donación</div>
        </div>
      </div>
      <div class="card" style="padding:16px 20px;display:flex;align-items:center;gap:14px">
        <div style="font-size:28px">🩸</div>
        <div>
          <div style="font-size:11px;color:var(--gray);font-weight:700;text-transform:uppercase">Litros de vida donados</div>
          <div style="font-size:22px;font-weight:900;color:var(--navy)">${details.litros} L</div>
          <div style="font-size:11px;color:var(--gray)">${details.totalDonaciones} donaciones en total</div>
        </div>
      </div>
      <div class="card" style="padding:16px 20px;display:flex;align-items:center;gap:14px">
        <div style="font-size:28px">🏅</div>
        <div>
          <div style="font-size:11px;color:var(--gray);font-weight:700;text-transform:uppercase">Nivel de Donante</div>
          <div style="font-size:16px;font-weight:800;color:var(--navy-mid)">${details.rango}</div>
          <div style="font-size:11px;color:var(--green);font-weight:600">Comunidad Soy Donante</div>
        </div>
      </div>
    </div>
  `;

  if (container) {
    container.innerHTML = heroBanner + metricsBar;
  }
}

// ---------- RENDER FUNCTIONS ----------

async function renderDashboard() {
  // 1. Hero Widget para donantes (Semáforo, Días restantes, Turnos activos)
  await renderDonorHeroWidget();

  try {
    const stats = await ApiClient.getDashboardStats();
    document.getElementById('stat-donaciones').textContent = stats.mis_donaciones;
    document.getElementById('stat-donantes').textContent = stats.donantes_activos;
    document.getElementById('stat-alertas').textContent = stats.alertas_activas;
    document.getElementById('stat-centros').textContent = stats.centros_habilitados;
  } catch (err) {
    console.error('Error cargando stats', err);
  }

  // Recent donors
  try {
    const donantes = await ApiClient.getDonors();
    const wrap = document.getElementById('recent-donors');
    if (wrap) {
      wrap.innerHTML = donantes.slice(0, 5).map(d => `
        <div class="donor-row">
          <div class="donor-avatar">${initials(d.nombre + ' ' + d.apellido)}</div>
          <div style="flex:1">
            <div class="donor-name">${d.nombre} ${d.apellido}</div>
            <div class="donor-meta">DNI ${d.dni} · ${d.grupo_sanguineo}</div>
          </div>
          <div class="blood-group" style="font-size:12px;width:36px;height:36px">${d.grupo_sanguineo}</div>
          ${aptTag(d.es_apto, d.fecha_proxima_donacion)}
        </div>`).join('');
    }
  } catch (err) {
    console.error('Error cargando donantes recientes', err);
  }

  // Alerts section
  await renderDashboardAlertsOnly();

  // Monthly chart
  renderChart();
}

async function renderDashboardAlertsOnly() {
  const alertWrap = document.getElementById('dashboard-alerts');
  if (!alertWrap) return;
  try {
    const notifs = await ApiClient.getNotifications();
    const urgentes = notifs.filter(n => n.tipo === 'urgent');
    if (urgentes.length === 0) {
      alertWrap.innerHTML = `<div class="alert success" style="margin-bottom:0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <div><div class="alert-title">Sin alertas críticas activas</div><div class="alert-body">El nivel de reservas se encuentra controlado en los centros provinciales.</div></div>
      </div>`;
    } else {
      alertWrap.innerHTML = urgentes.map(n => {
        const reqGroup = extractBloodGroupFromText(n.titulo) || extractBloodGroupFromText(n.cuerpo);
        const isCompatible = !reqGroup || !currentUser || currentUser.rol !== 'Donante' || canDonorDonateToGroup(currentUser.grupo_sanguineo, reqGroup);

        return `
        <div class="alert urgent" style="flex-direction:column;align-items:flex-start">
          <div style="display:flex;gap:12px;width:100%">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div style="flex:1">
              <div class="alert-title">${n.titulo}</div>
              <div class="alert-body">${n.cuerpo}</div>
            </div>
          </div>
          ${currentUser && currentUser.rol === 'Donante' ? (() => {
            const hoy = new Date().toISOString().split('T')[0];
            const isEnEspera = currentUser.fecha_proxima_donacion && currentUser.fecha_proxima_donacion > hoy;
            let diasEspera = 0;
            if (isEnEspera) {
              const fProx = new Date(currentUser.fecha_proxima_donacion + 'T00:00:00');
              const fHoy = new Date(hoy + 'T00:00:00');
              diasEspera = Math.max(1, Math.ceil((fProx - fHoy) / (1000 * 60 * 60 * 24)));
            }

            if (!currentUser.es_apto) {
              return `
              <div style="margin-top:10px;padding-left:32px">
                <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px">
                  <span style="font-size:14px">🚫</span>
                  <span style="font-size:12px;color:#991B1B;font-weight:600">
                    No podés postularte: actualmente figurás como no apto para donar sangre.
                  </span>
                </div>
              </div>`;
            }

            if (isEnEspera) {
              return `
              <div style="margin-top:10px;padding-left:32px">
                <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px">
                  <span style="font-size:14px">⏳</span>
                  <span style="font-size:12px;color:#92400E;font-weight:600">
                    En recuperación biológica (${diasEspera} días restantes, disponible a partir del ${formatDate(currentUser.fecha_proxima_donacion)}). Para cuidar tu salud, no podés postularte a esta solicitud.
                  </span>
                </div>
              </div>`;
            }

            if (!isCompatible) {
              return `
              <div style="margin-top:10px;padding-left:32px">
                <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px">
                  <span style="font-size:14px">🚫</span>
                  <span style="font-size:12px;color:#92400E;font-weight:600">
                    Tu grupo <strong>(${currentUser.grupo_sanguineo})</strong> no es compatible para este pedido (requiere <strong>${reqGroup}</strong>).
                  </span>
                </div>
              </div>`;
            }

            return `
            <div style="margin-top:10px;padding-left:32px">
              <button class="btn btn-sm" style="background:white;color:var(--red);font-weight:700;font-size:12px;border:1px solid #FECACA;padding:6px 14px;box-shadow:0 2px 6px rgba(0,0,0,0.06);display:flex;align-items:center;gap:6px" onclick="respondToAlert('${escapeHtml(n.titulo)}', '${escapeHtml(n.cuerpo)}', '${reqGroup || ''}')">
                <span>✋</span> Me sumo a donar para este pedido
              </button>
            </div>`;
          })() : ''}
        </div>`;
      }).join('');
    }
  } catch (err) {
    console.error('Error cargando alertas de dashboard', err);
  }
}

async function renderChart() {
  try {
    const chartData = await ApiClient.getChartData();
    const max = Math.max(...chartData.map(d => d.val));
    const wrap = document.getElementById('chart-bars');
    if (!wrap) return;
    wrap.innerHTML = chartData.map(d => `
      <div class="chart-bar" style="height:${Math.round((d.val / max) * 100)}%">
        <div class="bar-value">${d.val}</div>
        <div class="bar-label">${d.mes}</div>
      </div>`).join('');
  } catch (err) {
    console.error('Error cargando gráfico', err);
  }
}

// ---------------- PERFIL DINÁMICO ----------------
async function renderPerfil() {
  if (!currentUser) return;

  const fullName = `${currentUser.nombre} ${currentUser.apellido}`;
  const pAvatar = document.getElementById('profile-avatar');
  const pName = document.getElementById('profile-display-name');
  const pDni = document.getElementById('profile-display-dni');
  const pGroup = document.getElementById('profile-badge-group');
  const pCompat = document.getElementById('profile-compat');
  const pState = document.getElementById('profile-state-text');
  const pNextDate = document.getElementById('profile-next-date');
  const pStatusBadge = document.getElementById('profile-status-badge');

  if (pAvatar) pAvatar.textContent = initials(fullName);
  if (pName) pName.textContent = fullName;
  if (pDni) pDni.textContent = `DNI ${currentUser.dni}`;
  if (pGroup) pGroup.textContent = currentUser.grupo_sanguineo;

  // Compatibilidad médica real
  const compatInfo = BLOOD_COMPAT[currentUser.grupo_sanguineo];
  if (pCompat && compatInfo) {
    pCompat.textContent = `Puede donar a: ${compatInfo.donaA}`;
  }

  // Estado apto con cálculo dinámico de días y recuperación
  const details = getDonorStatusDetails(currentUser);
  if (details) {
    if (pState) {
      pState.textContent = details.esApto ? 'Apto para donar' : `Espera: ${details.diasRestantes} días`;
      pState.style.color = details.esApto ? 'var(--green)' : 'var(--orange)';
    }
    if (pStatusBadge) {
      pStatusBadge.innerHTML = details.esApto
        ? `<span class="tag green" style="font-weight:700">✓ Apto para donar hoy</span>`
        : `<span class="tag orange" style="font-weight:700">⏳ En recuperación (${details.diasRestantes} días restantes)</span>`;
    }
    if (pNextDate) {
      pNextDate.textContent = details.esApto ? '¡Inmediata disponible!' : formatDate(details.fechaProxima);
    }
  } else {
    if (pState) pState.textContent = currentUser.es_apto ? 'Apto' : 'No disponible';
    if (pStatusBadge) {
      pStatusBadge.innerHTML = currentUser.es_apto
        ? `<span class="tag green">✓ Apto para donar</span>`
        : `<span class="tag red">✗ En período de espera</span>`;
    }
    if (pNextDate) pNextDate.textContent = formatDate(currentUser.fecha_proxima_donacion);
  }

  // Alerta activa en zona para su grupo
  try {
    const alertData = await ApiClient.getActiveAlertForUser();
    const alertBox = document.getElementById('profile-alert-box');
    const alertText = document.getElementById('profile-alert-text');
    if (alertBox && alertText) {
      if (alertData.has_alert) {
        alertBox.style.display = 'block';
        alertText.innerHTML = `Se necesitan donantes del grupo <strong>${alertData.grupo}</strong> en ${alertData.centro}. ${alertData.mensaje}`;
      } else {
        alertBox.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('Error cargando alerta de perfil', e);
  }

  // Historial personal de donaciones dentro de Mi Perfil
  const histWrap = document.getElementById('profile-history-list');
  const countBadge = document.getElementById('profile-history-count');
  if (histWrap) {
    try {
      const full = await ApiClient.getDonorFull(currentUser.id);
      const donaciones = (full && full.donaciones) ? full.donaciones : [];
      if (countBadge) {
        countBadge.textContent = `${donaciones.length} ${donaciones.length === 1 ? 'donación' : 'donaciones'}`;
      }
      if (!donaciones.length) {
        histWrap.innerHTML = `
          <div style="text-align:center;padding:24px;color:var(--gray)">
            <div style="font-size:26px;margin-bottom:6px">🩸</div>
            <div style="font-weight:600;color:var(--navy)">Sin donaciones registradas aún</div>
            <div style="font-size:13px;margin-top:4px">Tus donaciones realizadas en centros de Hemoterapia de Mendoza se listarán aquí junto con tus resultados de estudios.</div>
          </div>`;
      } else {
        histWrap.innerHTML = donaciones.map(d => `
          <div class="history-row" style="padding:12px 0">
            <div class="history-date-box">
              <div class="hdb-day">${String(d.dia).padStart(2, '0')}</div>
              <div class="hdb-month">${d.mes}</div>
              <div style="font-size:10px;color:var(--gray);margin-top:2px">${d.anio || ''}</div>
            </div>
            <div class="history-info">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div class="history-hospital">${d.hospital}</div>
                <span class="tag green" style="font-size:11px">${d.resultado || 'OK'}</span>
              </div>
              <div class="history-meta" style="margin-top:4px">
                Hemoglobina: <strong>${d.hemoglobina}</strong> &middot; 
                Serología: <strong>${d.serologia}</strong> &middot; 
                Presión: <strong>${d.presion_arterial}</strong>
              </div>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error('Error cargando donaciones de perfil', e);
    }
  }
}

// ---------------- HISTORIAL DE DONACIONES ----------------
async function renderHistorial() {
  const wrap = document.getElementById('historial-list');
  const countBadge = document.getElementById('historial-count-badge');
  const nextBanner = document.getElementById('historial-next-banner');
  if (!wrap) return;

  try {
    const donaciones = await ApiClient.getMyDonations();
    if (countBadge) countBadge.textContent = `${donaciones.length} registros`;

    // Banner de próxima donación dinámico
    if (nextBanner && currentUser) {
      nextBanner.textContent = `Próxima donación disponible: ${formatDate(currentUser.fecha_proxima_donacion)}`;
    }

    if (!donaciones.length) {
      wrap.innerHTML = `<div style="text-align:center;padding:32px;color:var(--gray)">Sin donaciones registradas aún. ¡Registrá tu primera donación con el botón superior!</div>`;
      return;
    }

    wrap.innerHTML = donaciones.map(d => `
      <div class="history-row">
        <div class="history-date-box">
          <div class="hdb-day">${String(d.dia).padStart(2, '0')}</div>
          <div class="hdb-month">${d.mes}</div>
          <div style="font-size:10px;color:var(--gray);margin-top:2px">${d.anio || ''}</div>
        </div>
        <div class="history-info">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="history-hospital">${d.hospital}</div>
            <div class="blood-group" style="font-size:12px;width:34px;height:34px" title="Grupo">${d.donante_grupo || '—'}</div>
          </div>
          <div style="font-size:13px;font-weight:600;color:var(--navy);margin:4px 0">
            👤 Donante: <span style="color:var(--red-dark)">${d.donante_nombre || 'Donante'}</span> 
            <span style="font-size:12px;color:var(--gray);font-weight:400">· DNI ${d.donante_dni || '—'}</span>
          </div>
          <div class="history-meta">Hemoglobina: ${d.hemoglobina} · Serología: ${d.serologia} · Presión: ${d.presion_arterial}</div>
        </div>
        <span class="tag green" style="white-space:nowrap;align-self:center">${d.resultado}</span>
      </div>`).join('');
  } catch (err) {
    console.error('Error cargando historial', err);
    wrap.innerHTML = `<div style="color:var(--red);padding:16px">Error conectando con el servidor.</div>`;
  }
}

// ---------------- DONANTES Y FICHA MÉDICA ----------------
async function renderDonantes(filter = '') {
  const wrap = document.getElementById('donantes-list');
  if (!wrap) return;

  try {
    const donantes = await ApiClient.getDonors(filter);
    if (!donantes.length) {
      wrap.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--gray);padding:24px">Sin resultados coincidentes</td></tr>`;
      return;
    }
    wrap.innerHTML = donantes.map(d => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:12px">
            <div class="donor-avatar">${initials(d.nombre + ' ' + d.apellido)}</div>
            <div>
              <div style="font-weight:600;color:var(--navy)">${d.nombre} ${d.apellido}</div>
              <div style="font-size:12px;color:var(--gray)">DNI ${d.dni}</div>
            </div>
          </div>
        </td>
        <td><div class="blood-group" style="font-size:12px;width:36px;height:36px">${d.grupo_sanguineo}</div></td>
        <td style="font-weight:600">${d.rol}</td>
        <td>${aptTag(d.es_apto, d.fecha_proxima_donacion)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="openDonorDetail(${d.id})">Ver ficha</button>
            <button class="btn btn-primary btn-sm" onclick="openDonationModal(${d.id})" title="Registrar donación">+ Donar</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    console.error('Error cargando lista de donantes', err);
  }
}

async function openDonorDetail(donorId) {
  const modal = document.getElementById('donor-detail-modal');
  const body = document.getElementById('donor-detail-body');
  const title = document.getElementById('donor-detail-title');
  if (!modal || !body) return;

  modal.classList.add('open');
  body.innerHTML = `<div style="text-align:center;padding:24px;color:var(--gray)">Cargando ficha del donante...</div>`;

  try {
    const d = await ApiClient.getDonorFull(donorId);
    if (title) title.textContent = `Ficha Médica: ${d.nombre} ${d.apellido}`;

    const compat = BLOOD_COMPAT[d.grupo_sanguineo] || { donaA: '—', recibeDe: '—' };

    let donationsHtml = '<div style="font-size:13px;color:var(--gray);margin-top:6px">Sin donaciones previas registradas.</div>';
    if (d.donaciones && d.donaciones.length > 0) {
      donationsHtml = d.donaciones.map(don => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-border);font-size:13px">
          <div><strong>${don.hospital}</strong> <span style="color:var(--gray)">(${don.dia}/${don.mes}/${don.anio})</span></div>
          <span class="tag green">${don.resultado}</span>
        </div>
      `).join('');
    }

    body.innerHTML = `
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:18px">
        <div class="blood-group" style="width:54px;height:54px;font-size:20px">${d.grupo_sanguineo}</div>
        <div>
          <div style="font-size:18px;font-weight:800;color:var(--navy)">${d.nombre} ${d.apellido}</div>
          <div style="font-size:13px;color:var(--gray)">DNI ${d.dni} &middot; Nacimiento: ${formatDate(d.fecha_nacimiento)}</div>
          <div style="font-size:13px;color:var(--gray)">Teléfono: ${d.telefono || 'No registrado'}</div>
        </div>
      </div>

      <div class="grid grid-2 mb-14" style="gap:12px">
        <div style="background:var(--gray-light);padding:12px;border-radius:8px">
          <div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase">Compatibilidad</div>
          <div style="font-size:12px;margin-top:4px"><strong>Dona a:</strong> ${compat.donaA}</div>
          <div style="font-size:12px;margin-top:2px"><strong>Recibe de:</strong> ${compat.recibeDe}</div>
        </div>
        <div style="background:var(--gray-light);padding:12px;border-radius:8px">
          <div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase">Estado Actual</div>
          <div style="margin-top:6px">${aptTag(d.es_apto, d.fecha_proxima_donacion)}</div>
          <div style="font-size:11px;color:var(--gray);margin-top:6px">Próxima fecha apta: <strong>${formatDate(d.fecha_proxima_donacion)}</strong></div>
        </div>
      </div>

      <div style="margin-top:14px">
        <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:6px">Historial de donaciones (${d.total_donaciones})</div>
        <div style="max-height:160px;overflow-y:auto">${donationsHtml}</div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:14px;border-top:1px solid var(--gray-border);gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="toggleDonorAptitude(${d.id}, ${!d.es_apto})">
          ${d.es_apto ? 'Marcar como No disponible' : 'Habilitar como Apto'}
        </button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="closeDonorDetailModal(); openDonationModal(${d.id});">
            🩸 Registrar donación
          </button>
          <button class="btn btn-outline btn-sm" onclick="closeDonorDetailModal()">Cerrar ficha</button>
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color:var(--red);padding:16px">Error al cargar la ficha del donante.</div>`;
  }
}

async function toggleDonorAptitude(donorId, newApto) {
  try {
    await ApiClient.updateDonorStatus(donorId, newApto);
    openDonorDetail(donorId);
    renderDonantes();
  } catch (err) {
    alert('Error al actualizar estado del donante.');
  }
}

function closeDonorDetailModal() {
  document.getElementById('donor-detail-modal').classList.remove('open');
}

// ---------------- REGISTRAR NUEVO DONANTE ----------------
function openDonorModal() {
  document.getElementById('donor-modal').classList.add('open');
}

function closeDonorModal() {
  document.getElementById('donor-modal').classList.remove('open');
}

async function submitNewDonor() {
  const nombre = document.getElementById('new-donor-name').value.trim();
  const apellido = document.getElementById('new-donor-surname').value.trim();
  const dni = document.getElementById('new-donor-dni').value.trim();
  const fecha = document.getElementById('new-donor-birth').value;
  const grupo = document.getElementById('new-donor-group').value;
  const telefono = document.getElementById('new-donor-phone').value.trim();

  if (!nombre || !apellido || !dni || !fecha) {
    alert('Completá todos los campos requeridos (Nombre, Apellido, DNI y Fecha).');
    return;
  }

  try {
    await ApiClient.registerDonor({
      nombre,
      apellido,
      dni,
      fecha_nacimiento: fecha,
      grupo_sanguineo: grupo,
      telefono: telefono || '+54 9 261 000-0000',
      rol: 'Donante',
      es_apto: true,
    });
    closeDonorModal();
    alert(`✅ Donante ${nombre} ${apellido} registrado exitosamente en la base de datos.`);
    if (!currentUser) {
      document.getElementById('input-dni').value = dni;
      document.getElementById('input-fecha').value = fecha;
      await handleLogin();
    } else {
      renderDonantes();
      renderDashboard();
    }
  } catch (err) {
    alert(`Error: ${err.message || 'No se pudo registrar el donante'}`);
  }
}

// ---------------- REGISTRAR DONACIÓN ----------------
let currentAppointmentToCompleteId = null;

async function openDonationModal(preselectedDonorId = null, preselectedCenterId = null, appointmentIdToComplete = null) {
  currentAppointmentToCompleteId = appointmentIdToComplete || null;
  const modal = document.getElementById('donation-modal');
  const sel = document.getElementById('donation-centro');
  const dateInput = document.getElementById('donation-fecha');
  const donorSelectGroup = document.getElementById('donation-donor-select-group');
  const donorInfoCard = document.getElementById('donation-donor-info-card');
  const donorSelect = document.getElementById('donation-user-id');
  const donorInfoText = document.getElementById('donation-donor-info-text');
  const donorHiddenId = document.getElementById('donation-donor-hidden-id');

  // Prellenar fecha de hoy
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Cargar centros de donación en el select
  try {
    const centros = await ApiClient.getCenters();
    if (sel) {
      sel.innerHTML = centros.map(c => 
        `<option value="${c.id}" ${preselectedCenterId && c.id == preselectedCenterId ? 'selected' : ''}>${c.nombre}</option>`
      ).join('');
    }
  } catch (e) {
    console.error(e);
  }

  // Cargar donante según el rol del usuario
  try {
    if (currentUser && currentUser.rol === 'Administrador') {
      if (donorSelectGroup) donorSelectGroup.style.display = 'block';
      if (donorInfoCard) donorInfoCard.style.display = 'none';

      // Cargar lista completa de donantes para que el administrador elija
      const donantes = await ApiClient.getDonors();
      if (donorSelect) {
        donorSelect.innerHTML = donantes.map(d => 
          `<option value="${d.id}" ${preselectedDonorId && d.id == preselectedDonorId ? 'selected' : ''}>${d.nombre} ${d.apellido} · DNI ${d.dni} (Grupo ${d.grupo_sanguineo})</option>`
        ).join('');
        if (preselectedDonorId) {
          donorSelect.value = preselectedDonorId;
        }
      }
    } else if (currentUser) {
      if (donorSelectGroup) donorSelectGroup.style.display = 'none';
      if (donorInfoCard) donorInfoCard.style.display = 'block';
      if (donorInfoText) {
        donorInfoText.textContent = `${currentUser.nombre} ${currentUser.apellido} · DNI ${currentUser.dni} (Grupo ${currentUser.grupo_sanguineo})`;
      }
      if (donorHiddenId) {
        donorHiddenId.value = currentUser.id;
      }
    }
  } catch (e) {
    console.error('Error cargando donantes en modal', e);
  }

  modal.classList.add('open');
}

function closeDonationModal() {
  currentAppointmentToCompleteId = null;
  document.getElementById('donation-modal').classList.remove('open');
}

async function submitNewDonation() {
  if (!currentUser) return;
  const centroId = parseInt(document.getElementById('donation-centro').value);
  const fecha = document.getElementById('donation-fecha').value;
  const hemoglobina = document.getElementById('donation-hemoglobina').value;
  const presion = document.getElementById('donation-presion').value;
  const serologia = document.getElementById('donation-serologia').value;

  if (!fecha) {
    alert('Seleccioná la fecha de donación.');
    return;
  }

  let targetUserId;
  let donorName = '';
  if (currentUser.rol === 'Administrador') {
    const sel = document.getElementById('donation-user-id');
    targetUserId = parseInt(sel.value);
    donorName = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : 'Donante';
  } else {
    targetUserId = currentUser.id;
    donorName = `${currentUser.nombre} ${currentUser.apellido} (Grupo ${currentUser.grupo_sanguineo})`;
  }

  if (!targetUserId) {
    alert('Por favor seleccioná el donante al que corresponde esta donación.');
    return;
  }

  try {
    await ApiClient.addDonation({
      user_id: targetUserId,
      centro_id: centroId,
      fecha: fecha,
      hemoglobina: hemoglobina || '14.0 g/dl',
      presion_arterial: presion || '120/80',
      serologia: serologia,
      resultado: 'OK',
    });

    // Si provenía de un turno asignado, marcarlo automáticamente como Completada
    if (currentAppointmentToCompleteId) {
      try {
        await ApiClient.updateAppointmentStatus(
          currentAppointmentToCompleteId,
          'Completada',
          'Donación presencial realizada y asentada en el sistema.',
          true,
          '¡Muchas gracias por asistir a tu turno y donar sangre! Tu donación ya fue asentada y tu constancia está en Mi Perfil.'
        );
      } catch (errApt) {
        console.error('Error al actualizar turno a completado:', errApt);
      }
      currentAppointmentToCompleteId = null;
    }

    closeDonationModal();
    alert(`✅ Donación registrada exitosamente.\n• Donante: ${donorName}\n• Se sumó 1 unidad al stock de sangre provincial.\n• Se actualizó su próxima fecha apta (+90 días).`);

    // Refrescar perfil, historial, donantes, dashboard, stock, reportes y alertas
    currentUser = await ApiClient.getProfile();
    renderHistorial();
    renderDonantes();
    renderDashboard();
    renderPerfil();
    renderStock();
    renderReportes();
    updateNotifBadge();
    if (typeof renderTurnosAdmin === 'function') {
      renderTurnosAdmin();
    }
  } catch (err) {
    alert('Error al registrar donación.');
  }
}

// ---------------- CENTROS INTERACTIVOS Y FILTROS POR ZONA ----------------
let allCentersCache = [];
let currentZoneFilter = 'all';
let currentSearchTerm = '';

function getCenterZone(nombre, direccion) {
  const text = ((nombre || '') + ' ' + (direccion || '')).toLowerCase();
  if (text.includes('tupungato') || text.includes('tunuyán') || text.includes('san carlos')) return 'Valle de Uco';
  if (text.includes('san martín') || text.includes('rivadavia') || text.includes('junín') || text.includes('la paz') || text.includes('santa rosa')) return 'Zona Este';
  if (text.includes('san rafael') || text.includes('alvear') || text.includes('malargüe')) return 'Zona Sur';
  return 'Gran Mendoza';
}

function filterCentersByZone(zone, btnElement) {
  currentZoneFilter = zone;
  document.querySelectorAll('#centros-zone-filters button').forEach(b => {
    b.classList.remove('btn-primary', 'active');
    b.classList.add('btn-outline');
  });
  if (btnElement) {
    btnElement.classList.remove('btn-outline');
    btnElement.classList.add('btn-primary', 'active');
  }
  renderCentrosFiltered();
}

function filterCentersSearch(term) {
  currentSearchTerm = (term || '').toLowerCase().trim();
  renderCentrosFiltered();
}

function renderCentrosFiltered() {
  const wrap = document.getElementById('centros-list');
  if (!wrap || !allCentersCache.length) return;

  const filtered = allCentersCache.filter(c => {
    const zone = getCenterZone(c.nombre, c.direccion);
    const matchesZone = currentZoneFilter === 'all' || zone === currentZoneFilter;
    const matchesSearch = !currentSearchTerm || 
      c.nombre.toLowerCase().includes(currentSearchTerm) || 
      c.direccion.toLowerCase().includes(currentSearchTerm) ||
      zone.toLowerCase().includes(currentSearchTerm);
    return matchesZone && matchesSearch;
  });

  const countBadge = document.getElementById('centros-count-badge');
  if (countBadge) countBadge.textContent = allCentersCache.length;

  if (!filtered.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:32px;color:var(--gray)">No se encontraron centros para la zona o búsqueda seleccionada.</div>`;
    return;
  }

  wrap.innerHTML = filtered.map(c => {
    const zone = getCenterZone(c.nombre, c.direccion);
    const mapsQuery = encodeURIComponent(`${c.nombre}, ${c.direccion}, Mendoza, Argentina`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    const telClean = (c.telefono || '').replace(/[^\d+]/g, '');

    return `
    <div class="center-card" style="transition:box-shadow .2s;border:1px solid #E2E8F0">
      <div class="center-icon" style="background:#EFF6FF;color:var(--blue)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div>
            <div class="center-name" style="font-size:16px;font-weight:800;color:var(--navy)">${c.nombre}</div>
            <div class="center-addr" style="margin-top:2px">${c.direccion}</div>
          </div>
          <span class="tag navy" style="font-size:11px;font-weight:700">${zone}</span>
        </div>
        <div class="center-hours" style="margin-top:8px">🕐 <strong>Horario:</strong> ${c.horario} (${c.dias})</div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary btn-sm" style="font-weight:700" onclick="openAppointmentModal(null, ${c.id})">
            🩸 Quiero donar acá
          </button>
          <a href="${mapsUrl}" target="_blank" class="btn btn-outline btn-sm" style="text-decoration:none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Ver en Google Maps
          </a>
          ${c.telefono ? `
          <a href="tel:${telClean}" class="btn btn-outline btn-sm" style="text-decoration:none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${c.telefono}
          </a>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

async function renderCentros() {
  const wrap = document.getElementById('centros-list');
  if (!wrap) return;

  try {
    allCentersCache = await ApiClient.getCenters();
    renderCentrosFiltered();
  } catch (err) {
    console.error('Error cargando centros', err);
  }
}

// ---------------- NOTIFICACIONES ----------------
async function renderNotificaciones() {
  const wrap = document.getElementById('notif-list');
  if (!wrap) return;

  try {
    const notifs = await ApiClient.getNotifications();
    const icons = {
      urgent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      green:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
      orange: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    wrap.innerHTML = notifs.map(n => `
      <div class="notif-item ${!n.leida ? 'notif-unread' : ''}" onclick="markNotifRead(${n.id}, this)">
        <div class="notif-icon ${n.tipo}">${icons[n.tipo] || icons.orange}</div>
        <div class="notif-text">
          <div class="notif-title">${n.titulo}</div>
          <div class="notif-body">${n.cuerpo}</div>
          <div class="notif-time">${n.tiempo_relativo}</div>
        </div>
      </div>`).join('');
  } catch (err) {
    console.error('Error cargando notificaciones', err);
  }
}

async function markNotifRead(id, element) {
  try {
    await ApiClient.markNotificationRead(id);
    if (element) element.classList.remove('notif-unread');
    updateNotifBadge();
  } catch (err) {
    console.error('Error al marcar notificación', err);
  }
}

let realtimePollerId = null;
let lastKnownNotifIds = new Set();
let isInitialNotifLoad = true;

// Sonido sutil de notificación con Web Audio API (nativo, sin archivos externos)
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Dos tonos suaves y agradables
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Si el navegador bloqueó audio antes de interacción del usuario, ignorar silenciosamente
  }
}

function showToastNotification(title, body) {
  const container = document.getElementById('toast-notif-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-notif';
  toast.innerHTML = `
    <div style="font-size:22px;line-height:1">🩸</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:800;color:var(--navy)">${escapeHtml(title)}</div>
      <div style="font-size:12px;color:var(--navy-mid);margin-top:2px;line-height:1.4">${escapeHtml(body)}</div>
    </div>
    <button style="color:var(--gray);font-size:18px;line-height:1;padding:2px;cursor:pointer" title="Cerrar">&times;</button>
  `;

  toast.addEventListener('click', () => {
    navigate('notificaciones');
    toast.remove();
  });

  const closeBtn = toast.querySelector('button');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toast.remove();
    });
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 250);
  }, 6000);
}

async function updateNotifBadge(forceSilent = false) {
  if (!currentUser) return;
  try {
    const notifs = await ApiClient.getNotifications();
    const unread = notifs.filter(n => !n.leida).length;

    // Actualizar campanita topbar con el número rojo palpitante
    const dot = document.getElementById('notif-dot');
    if (dot) {
      dot.textContent = unread > 9 ? '9+' : unread;
      dot.style.display = unread > 0 ? 'flex' : 'none';
    }

    // Actualizar badge en menú lateral
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'inline-block' : 'none';
    }

    // Actualizar stat de alertas en dashboard
    const statAlertas = document.getElementById('stat-alertas');
    if (statAlertas) {
      statAlertas.textContent = unread;
    }

    // Detectar notificaciones nuevas que llegaron en tiempo real
    if (!forceSilent && !isInitialNotifLoad) {
      const newUnread = notifs.filter(n => !n.leida && !lastKnownNotifIds.has(n.id));
      if (newUnread.length > 0) {
        playNotificationChime();
        const latest = newUnread[0];
        showToastNotification(latest.titulo, latest.cuerpo);

        // Si el usuario está mirando actualmente la página de notificaciones, re-renderizar la lista en vivo
        const pageNotif = document.getElementById('page-notificaciones');
        if (pageNotif && pageNotif.classList.contains('active')) {
          renderNotificaciones();
        }

        // Si está en dashboard, actualizar alertas en vivo
        const pageDash = document.getElementById('page-dashboard');
        if (pageDash && pageDash.classList.contains('active')) {
          renderDashboardAlertsOnly();
        }
      }
    }

    // Actualizar conjunto de IDs conocidos
    lastKnownNotifIds = new Set(notifs.map(n => n.id));
    isInitialNotifLoad = false;
  } catch (err) {
    console.error('Error al actualizar notificaciones en tiempo real:', err);
  }
}

function startRealtimeNotifications() {
  if (realtimePollerId) clearInterval(realtimePollerId);
  isInitialNotifLoad = true;
  updateNotifBadge(true);

  // Polling automático en tiempo real cada 3.5 segundos
  realtimePollerId = setInterval(async () => {
    if (!currentUser) return;
    await updateNotifBadge(false);

    // Si es Administrador y está en la página de turnos, refrescar turnos en vivo silenciosamente
    if (currentUser.rol === 'Administrador') {
      const pageTurnos = document.getElementById('page-turnos');
      if (pageTurnos && pageTurnos.classList.contains('active')) {
        try {
          allAppointmentsCache = await ApiClient.getAllAppointments();
          renderTurnosTableFiltered();
        } catch (e) {}
      }
    }
  }, 3500);
}

function stopRealtimeNotifications() {
  if (realtimePollerId) {
    clearInterval(realtimePollerId);
    realtimePollerId = null;
  }
}

// ---------------- STOCK DE SANGRE Y CONTROL DE EGRESOS ----------------
async function renderStock() {
  const wrap = document.getElementById('stock-list');
  if (!wrap) return;

  try {
    const stock = await ApiClient.getStock();
    wrap.innerHTML = stock.map(s => {
      const pct = Math.round((s.unidades / s.max_unidades) * 100);
      const color = stockColor(s.unidades, s.max_unidades);
      const tag = s.unidades < 12 ? `<span class="tag red">Crítico</span>` : s.unidades < 27 ? `<span class="tag orange">Bajo</span>` : `<span class="tag green">OK</span>`;
      return `
      <div class="stock-row">
        <div class="blood-group stock-bg">${s.grupo_sanguineo}</div>
        <div class="stock-bar">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray);margin-bottom:4px">
            <span><strong>${s.unidades}</strong> / ${s.max_unidades} unidades</span><span>${pct}%</span>
          </div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        </div>
        ${tag}
        <div style="display:flex;gap:6px;margin-left:8px;align-items:center">
          <button class="btn btn-outline btn-sm" style="padding:4px 9px;font-size:11px;color:var(--red);border-color:var(--red);display:flex;align-items:center;gap:3px;font-weight:600" title="Registrar baja o consumo con trazabilidad obligatoria" onclick="openStockConsumptionModal(${s.id}, '${s.grupo_sanguineo}', ${s.unidades})">
            <span>🔻</span> Consumir
          </button>
          <button class="btn btn-outline btn-sm" style="padding:4px 9px;font-size:11px;color:var(--green);border-color:var(--green);display:flex;align-items:center;gap:3px;font-weight:600" title="Registrar ingreso de stock (transferencia, colecta, etc.)" onclick="openStockIncomeModal(${s.id}, '${s.grupo_sanguineo}', ${s.unidades}, ${s.max_unidades})">
            <span>➕</span> Ingresar
          </button>
        </div>
      </div>`;
    }).join('');

    // Cargar trazabilidad de movimientos en la tabla inferior
    renderStockMovements();
  } catch (err) {
    console.error('Error cargando stock', err);
  }
}

function openStockConsumptionModal(stockId, grupo, availableUnits) {
  if (!currentUser) {
    alert('Debes iniciar sesión con una cuenta autorizada.');
    return;
  }
  if (currentUser.rol !== 'Administrador') {
    alert('Acceso restringido: solo el personal de Hemoterapia o Administradores puede registrar bajas de stock.');
    return;
  }
  if (availableUnits <= 0) {
    alert(`No hay stock disponible del grupo ${grupo} para dar de baja.`);
    return;
  }

  const modal = document.getElementById('stock-consume-modal');
  const idInput = document.getElementById('consume-stock-id');
  const grupoInput = document.getElementById('consume-grupo');
  const dispInput = document.getElementById('consume-disponibles');
  const unInput = document.getElementById('consume-unidades');
  const destInput = document.getElementById('consume-destinatario');
  const respInput = document.getElementById('consume-responsable');
  const notasInput = document.getElementById('consume-notas');

  if (idInput) idInput.value = stockId;
  if (grupoInput) grupoInput.value = grupo;
  if (dispInput) dispInput.value = `${availableUnits} bolsa(s) en banco`;
  if (unInput) {
    unInput.value = 1;
    unInput.max = availableUnits;
  }
  if (destInput) destInput.value = '';
  if (respInput) respInput.value = `${currentUser.nombre} ${currentUser.apellido} (DNI ${currentUser.dni} · ${currentUser.rol})`;
  if (notasInput) notasInput.value = '';

  if (modal) modal.classList.add('open');
}

function closeStockConsumeModal() {
  const modal = document.getElementById('stock-consume-modal');
  if (modal) modal.classList.remove('open');
}

async function submitStockConsumption() {
  const stockId = parseInt(document.getElementById('consume-stock-id').value);
  const grupo = document.getElementById('consume-grupo').value;
  const unidades = parseInt(document.getElementById('consume-unidades').value);
  const motivo = document.getElementById('consume-motivo').value;
  const destinatario = document.getElementById('consume-destinatario').value.trim();
  const notas = document.getElementById('consume-notas').value.trim();

  if (!unidades || unidades < 1) {
    alert('Por favor ingresá al menos 1 unidad para la baja.');
    return;
  }

  if (!destinatario) {
    alert('Es obligatorio ingresar el destinatario (paciente, historia clínica, quirófano o campaña de destino) para la trazabilidad y auditoría.');
    document.getElementById('consume-destinatario').focus();
    return;
  }

  try {
    const res = await ApiClient.consumeStock({
      stock_id: stockId,
      grupo_sanguineo: grupo,
      unidades: unidades,
      motivo: motivo,
      destinatario: destinatario,
      notas: notas
    });

    closeStockConsumeModal();
    alert(`✅ Egreso de stock registrado con éxito.\n• Grupo: ${grupo}\n• Unidades dadas de baja: ${unidades}\n• Destinado a: ${destinatario}\n• Motivo: ${motivo}\n• Operador: ${res.responsable_nombre || currentUser.nombre}`);

    // Refrescar vistas
    renderStock();
    renderStockMovements();
    renderDashboard();
    renderReportes();
    updateNotifBadge();
  } catch (err) {
    alert(`Error al registrar consumo de stock: ${err.message || 'Verificá los datos e intentá de nuevo.'}`);
  }
}

async function renderStockMovements() {
  const tbody = document.getElementById('stock-movements-list');
  if (!tbody) return;

  try {
    const movements = await ApiClient.getStockMovements();
    if (!movements || movements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--gray);padding:24px">No hay registros de movimientos en el sistema todavía.</td></tr>`;
      return;
    }

    tbody.innerHTML = movements.map(m => {
      const tipoTag = m.tipo === 'EGRESO'
        ? `<span class="tag red" style="font-weight:700">🔻 EGRESO</span>`
        : `<span class="tag green" style="font-weight:700">⬆ INGRESO</span>`;
      const fecha = m.fecha_formateada || (m.created_at ? new Date(m.created_at).toLocaleString('es-AR') : 'Reciente');
      const unidadesText = m.tipo === 'EGRESO' ? `-${m.unidades}` : `+${m.unidades}`;
      const badgeGrupo = `<span class="blood-group" style="width:30px;height:30px;font-size:11px;display:inline-flex">${m.grupo_sanguineo}</span>`;

      return `
        <tr>
          <td style="font-size:12px;color:var(--navy);white-space:nowrap">${fecha}</td>
          <td>${tipoTag}</td>
          <td>${badgeGrupo}</td>
          <td style="font-weight:700;color:${m.tipo === 'EGRESO' ? 'var(--red)' : 'var(--green)'}">${unidadesText} bolsa(s)</td>
          <td><strong>${escapeHtml(m.destinatario || '—')}</strong></td>
          <td style="font-size:12px;color:var(--navy-mid)">${escapeHtml(m.motivo || '—')}</td>
          <td style="font-size:12px;color:var(--navy)">
            <div style="font-weight:600">${escapeHtml(m.responsable_nombre || 'Servicio de Hemoterapia')}</div>
          </td>
          <td style="font-size:11px;color:var(--gray);max-width:220px">${escapeHtml(m.notas || '—')}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error cargando movimientos de stock', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--red);padding:16px">Error al cargar historial de movimientos.</td></tr>`;
  }
}

function openStockIncomeModal(stockId, grupo, currentUnits, maxUnits) {
  if (!currentUser) {
    alert('Debes iniciar sesión con una cuenta autorizada.');
    return;
  }
  if (currentUser.rol !== 'Administrador') {
    alert('Acceso restringido: solo el personal de Hemoterapia o Administradores puede registrar ingresos de stock.');
    return;
  }

  const modal = document.getElementById('stock-income-modal');
  const idInput = document.getElementById('income-stock-id');
  const grupoInput = document.getElementById('income-grupo');
  const unInput = document.getElementById('income-unidades');
  const origInput = document.getElementById('income-origen');
  const respInput = document.getElementById('income-responsable');
  const notasInput = document.getElementById('income-notas');

  if (idInput) idInput.value = stockId;
  if (grupoInput) grupoInput.value = grupo;
  if (unInput) {
    unInput.value = 1;
    unInput.max = Math.max(1, maxUnits - currentUnits);
  }
  if (origInput) origInput.value = '';
  if (respInput) respInput.value = `${currentUser.nombre} ${currentUser.apellido} (DNI ${currentUser.dni} · ${currentUser.rol})`;
  if (notasInput) notasInput.value = '';

  if (modal) modal.classList.add('open');
}

function closeStockIncomeModal() {
  const modal = document.getElementById('stock-income-modal');
  if (modal) modal.classList.remove('open');
}

async function submitStockIncome() {
  const stockId = parseInt(document.getElementById('income-stock-id').value);
  const grupo = document.getElementById('income-grupo').value;
  const unidades = parseInt(document.getElementById('income-unidades').value);
  const motivo = document.getElementById('income-motivo').value;
  const origen = document.getElementById('income-origen').value.trim();
  const notas = document.getElementById('income-notas').value.trim();

  if (!unidades || unidades < 1) {
    alert('Por favor ingresá al menos 1 unidad para el ingreso.');
    return;
  }

  if (!origen) {
    alert('Es obligatorio ingresar el centro o entidad de origen (hospital derivador, colecta externa o campaña) para la trazabilidad y auditoría.');
    document.getElementById('income-origen').focus();
    return;
  }

  try {
    const res = await ApiClient.addStockIncome({
      stock_id: stockId,
      grupo_sanguineo: grupo,
      unidades: unidades,
      motivo: motivo,
      origen: origen,
      notas: notas
    });

    closeStockIncomeModal();
    alert(`✅ Ingreso de stock registrado con éxito.\n• Grupo: ${grupo}\n• Unidades ingresadas: +${unidades}\n• Origen: ${origen}\n• Vía/Motivo: ${motivo}\n• Operador: ${res.responsable_nombre || currentUser.nombre}`);

    // Refrescar vistas
    renderStock();
    renderStockMovements();
    renderDashboard();
    renderReportes();
    updateNotifBadge();
  } catch (err) {
    alert(`Error al registrar ingreso de stock: ${err.message || 'Verificá los datos e intentá de nuevo.'}`);
  }
}

// ---------------- REPORTES Y MÉTRICAS ----------------
async function renderReportes() {
  try {
    const summary = await ApiClient.getReportsSummary();
    const totalEl = document.getElementById('report-total-donaciones');
    const tasaEl = document.getElementById('report-tasa-respuesta');
    const tiempoEl = document.getElementById('report-tiempo-respuesta');
    const redEl = document.getElementById('report-reduccion-llamadas');
    const tbody = document.getElementById('report-grupos-body');

    if (totalEl) totalEl.textContent = summary.total_donaciones;
    if (tasaEl) tasaEl.textContent = summary.tasa_respuesta;
    if (tiempoEl) tiempoEl.textContent = summary.tiempo_respuesta;
    if (redEl) redEl.textContent = summary.reduccion_llamadas;

    if (tbody && summary.grupos) {
      tbody.innerHTML = summary.grupos.map(g => `
        <tr>
          <td><strong>${g.grupo}</strong></td>
          <td>${g.donaciones}</td>
          <td>${g.porcentaje}</td>
          <td><span class="tag ${g.tendencia_tipo}">${g.tendencia}</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error cargando reportes summary', err);
  }

  // Cargar métricas del MVP
  try {
    const metrics = await ApiClient.getMvpMetrics();
    const wrap = document.getElementById('report-mvp-metrics-wrap');
    if (wrap && metrics.length) {
      wrap.innerHTML = metrics.map((m, idx) => `
        <div class="stock-row" style="${idx === metrics.length - 1 ? 'border:none' : ''}">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${m.nombre}</div>
            <div style="font-size:11px;color:var(--gray)">${m.meta || ''}</div>
          </div>
          <span class="tag ${m.cumplido ? 'green' : 'orange'}">${m.valor_actual} ${m.cumplido ? '✓' : ''}</span>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Error cargando MVP metrics', e);
  }
}

// ---------------- TARJETA DIGITAL (DESCARGA Y COMPARTIR) ----------------
function renderTarjeta() {
  if (!currentUser) return;
  const nameEl = document.querySelector('.dc-name');
  const dniEl = document.querySelector('.dc-dni');
  const groupEl = document.querySelector('.dc-group');
  const cardCompat = document.getElementById('card-compat');

  if (nameEl) nameEl.textContent = `${currentUser.nombre} ${currentUser.apellido}`;
  if (dniEl) dniEl.textContent = `DNI ${currentUser.dni}`;
  if (groupEl) groupEl.textContent = currentUser.grupo_sanguineo;

  const compat = BLOOD_COMPAT[currentUser.grupo_sanguineo];
  if (cardCompat && compat) {
    cardCompat.textContent = `Compatible con: ${compat.donaA}`;
  }

  // Generar QR visual usable
  const qr = document.getElementById('qr-dots');
  if (qr) {
    const qrData = encodeURIComponent(`SOY DONANTE MENDOZA | Donante: ${currentUser.nombre} ${currentUser.apellido} | DNI: ${currentUser.dni} | Grupo: ${currentUser.grupo_sanguineo} | Estado: ${currentUser.es_apto ? 'Apto' : 'En recuperación'}`);
    qr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=4&data=${qrData}" alt="QR Donante" style="width:100%;height:100%;object-fit:contain;display:block" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\\'font-size:10px;color:#991B1B;font-weight:bold;text-align:center;padding:4px\\'>QR OFICIAL<br>${currentUser.dni}</div>';" />`;
  }
}

function downloadDigitalCard() {
  if (!currentUser) return;

  // Generación gráfica de tarjeta con HTML5 Canvas en alta resolución
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  // Fondo degradado rojo institucional
  const grad = ctx.createLinearGradient(0, 0, 800, 480);
  grad.addColorStop(0, '#8E1A18');
  grad.addColorStop(0.6, '#B71C1C');
  grad.addColorStop(1, '#E53935');
  ctx.fillStyle = grad;
  ctx.roundRect ? ctx.roundRect(0, 0, 800, 480, 28) : ctx.rect(0, 0, 800, 480);
  ctx.fill();

  // Texto de encabezado
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.fillText('SOY DONANTE · SISTEMA OFICIAL DE MENDOZA', 48, 64);

  // Nombre del Donante
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 38px Inter, sans-serif';
  ctx.fillText(`${currentUser.nombre} ${currentUser.apellido}`.toUpperCase(), 48, 126);

  // DNI
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '22px Inter, sans-serif';
  ctx.fillText(`DNI ${currentUser.dni}  ·  Estado: APTO`, 48, 168);

  // Grupo Sanguíneo en tamaño grande
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 110px Inter, sans-serif';
  ctx.fillText(currentUser.grupo_sanguineo, 48, 300);

  // Compatibilidad
  const compat = BLOOD_COMPAT[currentUser.grupo_sanguineo] || { donaA: 'Todos' };
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '20px Inter, sans-serif';
  ctx.fillText(`Donante compatible con: ${compat.donaA}`, 48, 350);

  // Pie de tarjeta
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText('Servicio de Hemoterapia · Ministerio de Salud de Mendoza · Verificación oficial', 48, 420);

  // Generar descarga
  const a = document.createElement('a');
  a.download = `Tarjeta_Donante_${currentUser.dni}_${currentUser.grupo_sanguineo}.png`;
  a.href = canvas.toDataURL('image/png');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function shareDigitalCard() {
  if (!currentUser) return;
  const shareData = {
    title: 'Mi Tarjeta Digital de Donante',
    text: `Soy donante de sangre voluntario en Mendoza (Grupo ${currentUser.grupo_sanguineo}). ¡Sumate vos también a donar vida!`,
    url: window.location.origin,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (e) {
      console.log('Compartir cancelado');
    }
  } else {
    // Fallback: copiar al portapapeles
    navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`).then(() => {
      alert('📋 ¡Enlace e información de donante copiada al portapapeles!');
    }).catch(() => {
      alert(`Información de donante: ${shareData.text}`);
    });
  }
}

// ---------------- GESTIÓN Y ASIGNACIÓN DE TURNOS (ADMINISTRACIÓN) ----------------
let allAppointmentsCache = [];
let turnosFilterState = 'Todos';
let turnosFilterSearch = '';
let currentNotifyingApt = null;

async function renderTurnosAdmin() {
  if (!currentUser || currentUser.rol !== 'Administrador') return;

  const tableBody = document.getElementById('turnos-table-body');
  if (!tableBody) return;

  try {
    allAppointmentsCache = await ApiClient.getAllAppointments();

    // 1. Calcular KPIs
    const total = allAppointmentsCache.length;
    const pendientes = allAppointmentsCache.filter(a => a.estado === 'Pendiente').length;
    const confirmados = allAppointmentsCache.filter(a => a.estado === 'Confirmada').length;
    const completados = allAppointmentsCache.filter(a => a.estado === 'Completada').length;
    const cancelados = allAppointmentsCache.filter(a => a.estado === 'Cancelada').length;

    const kpiTotal = document.getElementById('turnos-kpi-total');
    const kpiPen = document.getElementById('turnos-kpi-pendientes');
    const kpiConf = document.getElementById('turnos-kpi-confirmados');
    const kpiComp = document.getElementById('turnos-kpi-completados');

    if (kpiTotal) kpiTotal.textContent = total;
    if (kpiPen) kpiPen.textContent = pendientes;
    if (kpiConf) kpiConf.textContent = confirmados;
    if (kpiComp) kpiComp.textContent = completados;

    // Badges en pestañas
    const cAll = document.getElementById('turnos-count-all');
    const cPen = document.getElementById('turnos-count-pen');
    const cConf = document.getElementById('turnos-count-conf');
    const cComp = document.getElementById('turnos-count-comp');
    const cCanc = document.getElementById('turnos-count-canc');

    if (cAll) cAll.textContent = total;
    if (cPen) cPen.textContent = pendientes;
    if (cConf) cConf.textContent = confirmados;
    if (cComp) cComp.textContent = completados;
    if (cCanc) cCanc.textContent = cancelados;

    // Badge en sidebar
    const sideBadge = document.getElementById('turnos-pending-badge');
    if (sideBadge) {
      sideBadge.textContent = pendientes;
      sideBadge.style.display = pendientes > 0 ? 'inline-block' : 'none';
    }

    renderTurnosTableFiltered();
  } catch (err) {
    console.error('Error cargando turnos admin:', err);
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--red);padding:24px">Error al cargar turnos: ${escapeHtml(err.message || '')}</td></tr>`;
  }
}

function renderTurnosTableFiltered() {
  const tableBody = document.getElementById('turnos-table-body');
  if (!tableBody) return;

  let filtered = allAppointmentsCache.slice();

  // Filtrar por estado
  if (turnosFilterState !== 'Todos') {
    filtered = filtered.filter(a => a.estado === turnosFilterState);
  }

  // Filtrar por texto de búsqueda
  if (turnosFilterSearch.trim()) {
    const q = turnosFilterSearch.toLowerCase().trim();
    filtered = filtered.filter(a => 
      (a.donante_nombre || '').toLowerCase().includes(q) ||
      (a.donante_dni || '').includes(q) ||
      (a.centro_nombre || '').toLowerCase().includes(q) ||
      (a.donante_grupo || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:36px;color:var(--gray)">
          <div style="font-size:28px;margin-bottom:8px">📅</div>
          <div style="font-weight:700;color:var(--navy);font-size:15px">No se encontraron turnos con los filtros actuales</div>
          <div style="font-size:12px;margin-top:4px">Podés cambiar de pestaña o limpiar el buscador para ver más resultados.</div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(a => {
    let estadoTag = '';
    if (a.estado === 'Pendiente') {
      estadoTag = `<span class="tag orange" style="font-weight:700">⏳ Pendiente</span>`;
    } else if (a.estado === 'Confirmada') {
      estadoTag = `<span class="tag green" style="font-weight:700">✅ Confirmada</span>`;
    } else if (a.estado === 'Completada') {
      estadoTag = `<span class="tag" style="background:#EFF6FF;color:#1D4ED8;font-weight:700">🩸 Completada</span>`;
    } else if (a.estado === 'Cancelada') {
      estadoTag = `<span class="tag" style="background:#FEE2E2;color:#B91C1C;font-weight:700">❌ Cancelada</span>`;
    } else {
      estadoTag = `<span class="tag navy">${escapeHtml(a.estado)}</span>`;
    }

    const cleanTel = (a.donante_telefono || '').replace(/\D/g, '');
    const waUrl = cleanTel ? `https://wa.me/${cleanTel.startsWith('54') ? cleanTel : '549' + cleanTel}?text=${encodeURIComponent(`Hola ${a.donante_nombre}, te contactamos desde el Servicio de Hemoterapia de Mendoza con respecto a tu turno de donación del ${formatDate(a.fecha)}.`)}` : '';

    return `
      <tr>
        <td>
          <div style="font-weight:800;color:var(--navy)">${formatDate(a.fecha)}</div>
          <div style="font-size:12px;color:var(--gray)">${escapeHtml(a.franja_horaria)}</div>
        </td>
        <td>
          <div style="font-weight:800;color:var(--navy)">${escapeHtml(a.donante_nombre)}</div>
          <div style="font-size:12px;color:var(--gray)">DNI ${escapeHtml(a.donante_dni)}</div>
        </td>
        <td>
          <div class="blood-group" style="width:34px;height:34px;font-size:12px">${escapeHtml(a.donante_grupo || '—')}</div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:12px;font-weight:600">${escapeHtml(a.donante_telefono || 'Sin tel')}</span>
            ${waUrl ? `
              <a href="${waUrl}" target="_blank" title="Contactar por WhatsApp" class="btn btn-outline btn-sm" style="padding:2px 7px;font-size:11px;color:#15803D;border-color:#86EFAC;text-decoration:none">
                💬 WA
              </a>
            ` : ''}
          </div>
        </td>
        <td>
          <div style="font-weight:700;font-size:13px;color:var(--navy)">${escapeHtml(a.centro_nombre)}</div>
          <div style="font-size:11px;color:var(--gray)">${escapeHtml(a.centro_direccion)}</div>
        </td>
        <td>
          <div style="font-size:12px;color:var(--navy-mid)">${escapeHtml(a.motivo)}</div>
          ${a.notas ? `<div style="font-size:11px;color:var(--gray);font-style:italic;margin-top:2px">Nota: ${escapeHtml(a.notas)}</div>` : ''}
        </td>
        <td>
          ${estadoTag}
        </td>
        <td style="text-align:right">
          <div style="display:inline-flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap">
            ${a.estado === 'Pendiente' ? `
              <button class="btn btn-sm" style="background:#16A34A;color:white;font-weight:700;font-size:11px;padding:5px 9px;border:none;border-radius:6px" title="Aprobar y confirmar turno" onclick="quickConfirmAppointment(${a.id}, '${escapeHtml(a.donante_nombre)}')">
                ✓ Confirmar
              </button>
            ` : ''}

            ${a.estado === 'Confirmada' ? `
              <button class="btn btn-sm" style="background:#B71C1C;color:white;font-weight:700;font-size:11px;padding:5px 9px;border:none;border-radius:6px" title="El donante asistió: asentar extracción en banco" onclick="completeAppointmentDonation(${a.id}, ${a.user_id}, ${a.centro_id})">
                🩸 Registrar Donación
              </button>
            ` : ''}

            <button class="btn btn-outline btn-sm" style="color:var(--blue);border-color:var(--blue);font-weight:700;font-size:11px;padding:4px 8px" title="Notificar en app o WhatsApp" onclick="openNotifyDonorModal(${a.id})">
              💬 Notificar
            </button>

            <button class="btn btn-outline btn-sm" style="color:#D97706;border-color:#FCD34D;font-weight:700;font-size:11px;padding:4px 8px" title="Reprogramar fecha y horario" onclick="openRescheduleModal(${a.id})">
              🔄 Reprog.
            </button>

            ${a.estado !== 'Cancelada' ? `
              <button class="btn btn-outline btn-sm" style="color:var(--red);border-color:var(--red);font-weight:700;font-size:11px;padding:4px 8px" title="Cancelar turno" onclick="adminCancelAppointment(${a.id}, '${escapeHtml(a.donante_nombre)}')">
                ❌ Cancelar
              </button>
            ` : ''}

            <button class="btn btn-outline btn-sm" style="padding:4px 7px;font-size:12px" title="Cambiar estado" onclick="openAppointmentStatusModal(${a.id})">
              ⚙️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterTurnosByEstado(estado, btn) {
  turnosFilterState = estado;
  const container = document.getElementById('turnos-status-filters');
  if (container) {
    container.querySelectorAll('button').forEach(b => {
      b.classList.remove('btn-primary', 'active');
      b.classList.add('btn-outline');
    });
    if (btn) {
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary', 'active');
    }
  }
  renderTurnosTableFiltered();
}

function filterTurnosSearch(term) {
  turnosFilterSearch = term || '';
  renderTurnosTableFiltered();
}

async function quickConfirmAppointment(aptId, donorName) {
  try {
    await ApiClient.updateAppointmentStatus(
      aptId,
      'Confirmada',
      'Confirmado rápidamente desde el panel de turnos.',
      true,
      `✅ ¡Turno confirmado! Tu turno para donar sangre ha sido confirmado por el personal de Hemoterapia. Te esperamos en el horario indicado con tu DNI. ¡Muchas gracias por tu compromiso!`
    );
    alert(`✅ Turno #${aptId} de ${donorName} confirmado con éxito. Se le envió una notificación al donante.`);
    renderTurnosAdmin();
  } catch (e) {
    alert(`Error al confirmar turno: ${e.message || ''}`);
  }
}

function completeAppointmentDonation(aptId, userId, centerId) {
  openDonationModal(userId, centerId, aptId);
}

// ---------- MODAL NOTIFICAR DONANTE ----------
function openNotifyDonorModal(aptId) {
  const apt = (allAppointmentsCache || []).find(a => a.id === aptId);
  if (!apt) {
    alert('Turno no encontrado.');
    return;
  }

  currentNotifyingApt = apt;

  document.getElementById('notify-appointment-id').value = apt.id;
  document.getElementById('notify-donor-phone').value = apt.donante_telefono || '';
  document.getElementById('notify-appointment-date').value = apt.fecha;
  document.getElementById('notify-appointment-center').value = apt.centro_nombre;

  const nameEl = document.getElementById('notify-donor-name');
  const metaEl = document.getElementById('notify-donor-meta');
  const phoneBadge = document.getElementById('notify-donor-phone-badge');

  if (nameEl) nameEl.textContent = apt.donante_nombre;
  if (metaEl) metaEl.textContent = `DNI ${apt.donante_dni} · Grupo ${apt.donante_grupo} · Turno: ${formatDate(apt.fecha)} (${apt.franja_horaria})`;
  if (phoneBadge) phoneBadge.textContent = apt.donante_telefono ? `📱 ${apt.donante_telefono}` : '📱 Sin teléfono registrado';

  // Plantilla por defecto según estado
  if (apt.estado === 'Pendiente') {
    applyNotifyTemplate('confirmacion');
  } else if (apt.estado === 'Confirmada') {
    applyNotifyTemplate('recordatorio');
  } else if (apt.estado === 'Completada') {
    applyNotifyTemplate('agradecimiento');
  } else {
    applyNotifyTemplate('recordatorio');
  }

  document.getElementById('notify-donor-modal').classList.add('open');
}

function closeNotifyDonorModal() {
  currentNotifyingApt = null;
  document.getElementById('notify-donor-modal').classList.remove('open');
}

function applyNotifyTemplate(templateType) {
  if (!currentNotifyingApt) return;
  const apt = currentNotifyingApt;
  const titleInput = document.getElementById('notify-title-input');
  const bodyInput = document.getElementById('notify-body-input');

  const fechaFmt = formatDate(apt.fecha);

  if (templateType === 'confirmacion') {
    if (titleInput) titleInput.value = '✅ Tu turno de donación ha sido confirmado';
    if (bodyInput) bodyInput.value = `¡Hola ${apt.donante_nombre}! Tu turno de donación de sangre para el ${fechaFmt} (${apt.franja_horaria}) en ${apt.centro_nombre} (${apt.centro_direccion}) ha sido confirmado. Recordá asistir con tu DNI y buen descanso. ¡Gracias por donar vida!`;
  } else if (templateType === 'recordatorio') {
    if (titleInput) titleInput.value = '🔔 Recordatorio de tu turno y requisitos para donar';
    if (bodyInput) bodyInput.value = `¡Hola ${apt.donante_nombre}! Te recordamos tu turno de donación programado para el ${fechaFmt} (${apt.franja_horaria}) en ${apt.centro_nombre}. Importante: no vengas en ayunas (desayuná infusiones dulces, té, mate o café y frutas; evitá lácteos y grasas) y llevá tu DNI. ¡Te esperamos!`;
  } else if (templateType === 'reprogramar') {
    if (titleInput) titleInput.value = '⏳ Consulta sobre reprogramación de turno';
    if (bodyInput) bodyInput.value = `Hola ${apt.donante_nombre}, nos comunicamos desde el centro de donación de ${apt.centro_nombre}. Por motivos operativos te consultamos si es posible ajustar el horario de tu turno del ${fechaFmt}. Por favor responder a este mensaje o reprogramar desde la app.`;
  } else if (templateType === 'agradecimiento') {
    if (titleInput) titleInput.value = '❤️ ¡Muchas gracias por tu compromiso solidario!';
    if (bodyInput) bodyInput.value = `Estimado/a ${apt.donante_nombre}, desde todo el equipo de Hemoterapia te agradecemos inmensamente por acercarte a donar sangre el ${fechaFmt}. Con tu gesto solidario ayudás a salvar vidas en nuestra provincia. ¡Tu constancia ya está en Mi Perfil!`;
  }
}

async function submitDonorNotification() {
  const aptId = parseInt(document.getElementById('notify-appointment-id').value);
  const title = document.getElementById('notify-title-input').value.trim();
  const body = document.getElementById('notify-body-input').value.trim();

  if (!title || !body) {
    alert('Por favor completá el título y cuerpo del mensaje.');
    return;
  }

  try {
    await ApiClient.notifyDonorAppointment(aptId, title, body, 'blue');
    alert('✅ Notificación enviada con éxito a la cuenta del donante. Recibirá una alerta en la campana y su panel de notificaciones.');
    closeNotifyDonorModal();
  } catch (e) {
    alert(`Error al enviar notificación: ${e.message || ''}`);
  }
}

function sendNotifyWhatsApp() {
  if (!currentNotifyingApt) return;
  const rawPhone = document.getElementById('notify-donor-phone').value || '';
  const body = document.getElementById('notify-body-input').value.trim();

  const cleanTel = rawPhone.replace(/\D/g, '');
  if (!cleanTel) {
    alert('El donante no tiene un número de teléfono celular registrado para WhatsApp.');
    return;
  }

  const intlNumber = cleanTel.startsWith('54') ? cleanTel : `549${cleanTel}`;
  const url = `https://wa.me/${intlNumber}?text=${encodeURIComponent(body)}`;
  window.open(url, '_blank');
}

// ---------- MODAL CAMBIO DE ESTADO DE TURNO ----------
function openAppointmentStatusModal(aptId) {
  const apt = (allAppointmentsCache || []).find(a => a.id === aptId);
  if (!apt) {
    alert('Turno no encontrado.');
    return;
  }

  document.getElementById('status-modal-appointment-id').value = apt.id;
  document.getElementById('status-modal-donor-name').value = `${apt.donante_nombre} (DNI ${apt.donante_dni}) - Fecha: ${formatDate(apt.fecha)}`;
  document.getElementById('status-modal-new-estado').value = apt.estado;
  document.getElementById('status-modal-notas').value = apt.notas || '';
  document.getElementById('status-modal-notify-donor').checked = true;

  document.getElementById('appointment-status-modal').classList.add('open');
}

function closeAppointmentStatusModal() {
  document.getElementById('appointment-status-modal').classList.remove('open');
}

async function submitAppointmentStatusChange() {
  const aptId = parseInt(document.getElementById('status-modal-appointment-id').value);
  const newEstado = document.getElementById('status-modal-new-estado').value;
  const notas = document.getElementById('status-modal-notas').value.trim();
  const notify = document.getElementById('status-modal-notify-donor').checked;

  try {
    await ApiClient.updateAppointmentStatus(aptId, newEstado, notas, notify);
    alert('✅ Estado de turno actualizado correctamente.');
    closeAppointmentStatusModal();
    renderTurnosAdmin();
  } catch (e) {
    alert(`Error al actualizar estado: ${e.message || ''}`);
  }
}

// ============================================================
//  AGENDA / CALENDARIO INTERACTIVO DE TURNOS (ADMINISTRACIÓN)
// ============================================================
let turnosCalendarDate = new Date();
let selectedAgendaDate = null;
let donorsListCache = [];

function setTurnosViewMode(mode) {
  const tableContainer = document.getElementById('turnos-table-view-container');
  const calContainer = document.getElementById('turnos-calendar-view-container');
  const btnTable = document.getElementById('turnos-view-table-btn');
  const btnCal = document.getElementById('turnos-view-cal-btn');

  if (mode === 'calendar') {
    if (tableContainer) tableContainer.style.display = 'none';
    if (calContainer) calContainer.style.display = 'block';
    if (btnTable) {
      btnTable.style.background = 'transparent';
      btnTable.style.color = 'var(--gray)';
      btnTable.style.fontWeight = '600';
      btnTable.style.boxShadow = 'none';
    }
    if (btnCal) {
      btnCal.style.background = 'white';
      btnCal.style.color = 'var(--navy)';
      btnCal.style.fontWeight = '700';
      btnCal.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
    }
    renderTurnosCalendar();
  } else {
    if (tableContainer) tableContainer.style.display = 'block';
    if (calContainer) calContainer.style.display = 'none';
    if (btnTable) {
      btnTable.style.background = 'white';
      btnTable.style.color = 'var(--navy)';
      btnTable.style.fontWeight = '700';
      btnTable.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
    }
    if (btnCal) {
      btnCal.style.background = 'transparent';
      btnCal.style.color = 'var(--gray)';
      btnCal.style.fontWeight = '600';
      btnCal.style.boxShadow = 'none';
    }
    renderTurnosTableFiltered();
  }
}

function navigateTurnosCalendar(step) {
  if (step === 0) {
    turnosCalendarDate = new Date();
  } else {
    turnosCalendarDate.setMonth(turnosCalendarDate.getMonth() + step);
  }
  renderTurnosCalendar();
}

function renderTurnosCalendar() {
  const grid = document.getElementById('calendar-days-grid-body');
  const label = document.getElementById('calendar-current-month-label');
  if (!grid || !label) return;

  const year = turnosCalendarDate.getFullYear();
  const month = turnosCalendarDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  label.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const aptsByDate = {};
  (allAppointmentsCache || []).forEach(apt => {
    if (!apt.fecha) return;
    if (!aptsByDate[apt.fecha]) aptsByDate[apt.fecha] = [];
    aptsByDate[apt.fecha].push(apt);
  });

  let cellsHtml = '';

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    cellsHtml += `
      <div class="calendar-day-cell other-month">
        <div class="calendar-day-header">
          <span class="calendar-day-num">${dayNum}</span>
        </div>
      </div>
    `;
  }

  for (let day = 1; day <= totalDays; day++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dayStr === todayStr;
    const dayApts = aptsByDate[dayStr] || [];
    const count = dayApts.length;

    let chipsHtml = '';
    const visibleApts = dayApts.slice(0, 3);
    visibleApts.forEach(apt => {
      const hora = apt.franja_horaria ? apt.franja_horaria.split('–')[0].trim() : '';
      chipsHtml += `
        <div class="calendar-turn-chip chip-${apt.estado}" onclick="event.stopPropagation(); openDayAgenda('${dayStr}')" title="${escapeHtml(apt.donante_nombre)} (${apt.donante_grupo}) - ${apt.franja_horaria} [${apt.estado}]">
          <span class="calendar-turn-time">${hora}</span>
          <span class="calendar-turn-group">${escapeHtml(apt.donante_grupo || '')}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;flex:1">${escapeHtml(apt.donante_nombre.split(' ')[0])}</span>
        </div>
      `;
    });

    if (dayApts.length > 3) {
      chipsHtml += `<div class="calendar-more-link" onclick="event.stopPropagation(); openDayAgenda('${dayStr}')">+${dayApts.length - 3} más</div>`;
    }

    cellsHtml += `
      <div class="calendar-day-cell ${isToday ? 'today' : ''}" onclick="openDayAgenda('${dayStr}')" style="cursor:pointer">
        <div class="calendar-day-header">
          <span class="calendar-day-num">${day}</span>
          ${count > 0 ? `<span class="calendar-day-count">${count} ${count === 1 ? 'turno' : 'turnos'}</span>` : ''}
        </div>
        <div class="calendar-chips-container">
          ${chipsHtml}
        </div>
      </div>
    `;
  }

  const totalCells = startDayOfWeek + totalDays;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    cellsHtml += `
      <div class="calendar-day-cell other-month">
        <div class="calendar-day-header">
          <span class="calendar-day-num">${day}</span>
        </div>
      </div>
    `;
  }

  grid.innerHTML = cellsHtml;
}

function openDayAgenda(dateStr) {
  selectedAgendaDate = dateStr;
  const modal = document.getElementById('modal-day-agenda');
  const title = document.getElementById('day-agenda-modal-title');
  const body = document.getElementById('day-agenda-modal-body');
  if (!modal || !body) return;

  if (title) title.textContent = `📅 Agenda de Turnos: ${formatDate(dateStr)}`;

  const dayApts = (allAppointmentsCache || []).filter(a => a.fecha === dateStr);

  if (dayApts.length === 0) {
    body.innerHTML = `
      <div style="text-align:center;padding:36px;color:var(--gray)">
        <div style="font-size:32px;margin-bottom:8px">📭</div>
        <div style="font-weight:700;color:var(--navy);font-size:15px">No hay turnos agendados para esta fecha</div>
        <div style="font-size:12px;margin-top:4px">Hacé clic abajo para asignar un turno en este día.</div>
      </div>
    `;
  } else {
    body.innerHTML = dayApts.map(a => {
      let estadoBadge = '';
      if (a.estado === 'Confirmada') estadoBadge = '<span class="tag green">✅ Confirmada</span>';
      else if (a.estado === 'Pendiente') estadoBadge = '<span class="tag orange">⏳ Pendiente</span>';
      else if (a.estado === 'Completada') estadoBadge = '<span class="tag" style="background:#EFF6FF;color:#1D4ED8">🩸 Completada</span>';
      else if (a.estado === 'Cancelada') estadoBadge = '<span class="tag" style="background:#FEE2E2;color:#B91C1C">❌ Cancelada</span>';
      else estadoBadge = `<span class="tag navy">${escapeHtml(a.estado)}</span>`;

      return `
        <div style="background:#F8FAFC;border:1px solid var(--gray-border);border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span class="blood-group" style="width:28px;height:28px;font-size:11px">${escapeHtml(a.donante_grupo || '')}</span>
              <strong style="color:var(--navy);font-size:15px">${escapeHtml(a.donante_nombre)}</strong>
              <span style="font-size:12px;color:var(--gray)">DNI ${escapeHtml(a.donante_dni)}</span>
              ${estadoBadge}
            </div>
            <div style="font-size:12.5px;color:var(--navy-mid)">
              ⏰ <strong>${escapeHtml(a.franja_horaria)}</strong> &middot; 🏥 ${escapeHtml(a.centro_nombre)}
            </div>
            ${a.donante_telefono ? `<div style="font-size:12px;color:var(--gray);margin-top:2px">📞 ${escapeHtml(a.donante_telefono)}</div>` : ''}
            ${a.notas ? `<div style="font-size:11.5px;color:#475569;margin-top:2px;font-style:italic">Nota: ${escapeHtml(a.notas)}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn btn-outline btn-sm" style="font-size:11px;color:#D97706;border-color:#FCD34D" onclick="closeDayAgendaModal(); openRescheduleModal(${a.id})">
              🔄 Reprogramar
            </button>
            ${a.estado !== 'Cancelada' ? `
              <button class="btn btn-outline btn-sm" style="font-size:11px;color:var(--red);border-color:var(--red)" onclick="closeDayAgendaModal(); adminCancelAppointment(${a.id}, '${escapeHtml(a.donante_nombre)}')">
                ❌ Cancelar
              </button>
            ` : ''}
            <button class="btn btn-outline btn-sm" style="font-size:11px;color:var(--blue);border-color:var(--blue)" onclick="closeDayAgendaModal(); openNotifyDonorModal(${a.id})">
              💬 Contactar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  modal.classList.add('open');
}

function closeDayAgendaModal() {
  const modal = document.getElementById('modal-day-agenda');
  if (modal) modal.classList.remove('open');
}

function openAdminNewAppointmentForDate() {
  closeDayAgendaModal();
  openAdminNewAppointmentModal(selectedAgendaDate);
}

async function adminCancelAppointment(id, donorName) {
  if (!confirm(`¿Estás seguro de que deseás cancelar el turno de ${donorName}? Se notificará al donante.`)) return;
  try {
    await ApiClient.updateAppointmentStatus(id, 'Cancelada', 'Cancelado por el Servicio de Hemoterapia', true, 'Tu turno de donación ha sido cancelado. Podés solicitar uno nuevo cuando gustes.');
    alert('Turno cancelado y donante notificado.');
    allAppointmentsCache = await ApiClient.getAllAppointments();
    renderTurnosAdmin();
    renderTurnosCalendar();
  } catch (err) {
    alert(`Error al cancelar turno: ${err.message || ''}`);
  }
}

function openRescheduleModal(appointmentId) {
  const modal = document.getElementById('modal-reschedule-appointment');
  const apt = (allAppointmentsCache || []).find(a => a.id === appointmentId);
  if (!modal || !apt) return;

  document.getElementById('resched-appointment-id').value = apt.id;
  document.getElementById('resched-donor-name').value = `${apt.donante_nombre} (DNI ${apt.donante_dni}) - ${apt.centro_nombre}`;
  document.getElementById('resched-new-fecha').value = apt.fecha || '';
  document.getElementById('resched-new-franja').value = apt.franja_horaria || '09:00 – 10:00';
  document.getElementById('resched-motivo').value = '';
  document.getElementById('resched-notify-donor').checked = true;

  modal.classList.add('open');
}

function closeRescheduleModal() {
  const modal = document.getElementById('modal-reschedule-appointment');
  if (modal) modal.classList.remove('open');
}

async function submitRescheduleAppointment() {
  const id = parseInt(document.getElementById('resched-appointment-id').value);
  const nuevaFecha = document.getElementById('resched-new-fecha').value;
  const nuevaFranja = document.getElementById('resched-new-franja').value;
  const motivo = document.getElementById('resched-motivo').value.trim();
  const notificar = document.getElementById('resched-notify-donor').checked;

  if (!nuevaFecha) {
    alert('Por favor seleccioná una fecha.');
    return;
  }

  try {
    await ApiClient.rescheduleAppointment(id, {
      nueva_fecha: nuevaFecha,
      nueva_franja_horaria: nuevaFranja,
      motivo: motivo,
      notificar_donante: notificar
    });

    closeRescheduleModal();
    alert('✅ Turno reprogramado con éxito.');
    allAppointmentsCache = await ApiClient.getAllAppointments();
    renderTurnosAdmin();
    renderTurnosCalendar();
  } catch (err) {
    alert(`Error al reprogramar turno: ${err.message || ''}`);
  }
}

async function openAdminNewAppointmentModal(preselectedDate = null) {
  const modal = document.getElementById('modal-admin-new-appointment');
  const userSelect = document.getElementById('admin-new-apt-user');
  const centerSelect = document.getElementById('admin-new-apt-centro');
  const fechaInput = document.getElementById('admin-new-apt-fecha');
  const warningEl = document.getElementById('admin-new-apt-donor-warning');
  if (!modal) return;

  if (fechaInput) {
    fechaInput.value = preselectedDate || new Date().toISOString().split('T')[0];
  }
  if (warningEl) {
    warningEl.style.display = 'none';
    warningEl.innerHTML = '';
  }

  try {
    donorsListCache = await ApiClient.getDonors();
    const donantesSolo = donorsListCache.filter(d => d.rol === 'Donante');
    if (userSelect) {
      userSelect.innerHTML = donantesSolo.map(d => `
        <option value="${d.id}">${d.nombre} ${d.apellido} (DNI ${d.dni} - ${d.grupo_sanguineo})</option>
      `).join('');
    }

    const centros = await ApiClient.getCenters(false);
    if (centerSelect) {
      centerSelect.innerHTML = centros.map(c => `
        <option value="${c.id}">${c.nombre} (${c.direccion})</option>
      `).join('');
    }

    checkAdminSelectedDonorAptitude();
    modal.classList.add('open');
  } catch (err) {
    console.error('Error cargando datos para asignar turno:', err);
    alert('Error al cargar datos para asignar turno.');
  }
}

function checkAdminSelectedDonorAptitude() {
  const userSelect = document.getElementById('admin-new-apt-user');
  const warningEl = document.getElementById('admin-new-apt-donor-warning');
  if (!userSelect || !warningEl) return;

  const selectedId = parseInt(userSelect.value);
  const donor = (donorsListCache || []).find(d => d.id === selectedId);
  if (!donor) return;

  const hoy = new Date().toISOString().split('T')[0];
  if (!donor.es_apto) {
    warningEl.style.display = 'block';
    warningEl.innerHTML = `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;padding:6px 10px;font-size:12px;color:#991B1B">⚠️ Advertencia médica: Este donante está registrado como <strong>No Apto</strong>.</div>`;
  } else if (donor.fecha_proxima_donacion && donor.fecha_proxima_donacion > hoy) {
    const fProx = new Date(donor.fecha_proxima_donacion + 'T00:00:00');
    const fHoy = new Date(hoy + 'T00:00:00');
    const dias = Math.max(1, Math.ceil((fProx - fHoy) / (1000 * 60 * 60 * 24)));
    warningEl.style.display = 'block';
    warningEl.innerHTML = `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:6px 10px;font-size:12px;color:#92400E">⏳ Período de recuperación: Al donante le restan <strong>${dias} días</strong> de descanso (disponible el ${formatDate(donor.fecha_proxima_donacion)}).</div>`;
  } else {
    warningEl.style.display = 'none';
    warningEl.innerHTML = '';
  }
}

function closeAdminNewAppointmentModal() {
  const modal = document.getElementById('modal-admin-new-appointment');
  if (modal) modal.classList.remove('open');
}

async function submitAdminNewAppointment() {
  const userId = parseInt(document.getElementById('admin-new-apt-user').value);
  const centroId = parseInt(document.getElementById('admin-new-apt-centro').value);
  const fecha = document.getElementById('admin-new-apt-fecha').value;
  const franja = document.getElementById('admin-new-apt-franja').value;
  const motivo = document.getElementById('admin-new-apt-motivo').value.trim();
  const notify = document.getElementById('admin-new-apt-notify').checked;

  if (!userId || !centroId || !fecha) {
    alert('Por favor completá los campos obligatorios.');
    return;
  }

  try {
    await ApiClient.createAdminAppointment({
      user_id: userId,
      centro_id: centroId,
      fecha: fecha,
      franja_horaria: franja,
      motivo: motivo || 'Turno asignado por Hemoterapia',
      notificar_donante: notify
    });

    closeAdminNewAppointmentModal();
    alert('✅ Turno asignado con éxito y registrado en la agenda.');
    allAppointmentsCache = await ApiClient.getAllAppointments();
    renderTurnosAdmin();
    renderTurnosCalendar();
  } catch (err) {
    alert(`Error al asignar turno: ${err.message || ''}`);
  }
}

// ============================================================
//  CONFIGURACIÓN DEL SISTEMA Y GESTIÓN DE CENTROS (CRUD)
// ============================================================
let configCentersCache = [];

async function renderConfiguracion() {
  if (!currentUser || currentUser.rol !== 'Administrador') return;

  // 1. Cargar Días de Espera
  try {
    const setting = await ApiClient.getSetting('dias_espera_donacion');
    const inputDias = document.getElementById('config-dias-espera');
    const tagDias = document.getElementById('config-status-tag');
    if (inputDias && setting && setting.valor) {
      inputDias.value = setting.valor;
    }
    if (tagDias && setting && setting.valor) {
      tagDias.textContent = `Activo: ${setting.valor} días`;
    }
  } catch (err) {
    console.error('Error cargando configuración de días:', err);
  }

  // 2. Cargar Centros de Donación
  renderConfigCentersTable();
}

async function saveConfigDiasEspera() {
  const inputDias = document.getElementById('config-dias-espera');
  const tagDias = document.getElementById('config-status-tag');
  if (!inputDias) return;

  const dias = parseInt(inputDias.value);
  if (isNaN(dias) || dias < 1 || dias > 365) {
    alert('Por favor ingresá un número de días válido entre 1 y 365.');
    return;
  }

  try {
    await ApiClient.updateSetting('dias_espera_donacion', String(dias));
    if (tagDias) tagDias.textContent = `Activo: ${dias} días`;
    alert(`✅ Configuración guardada: Intervalo establecido en ${dias} días entre donaciones.`);
  } catch (err) {
    alert(`Error al guardar configuración: ${err.message || ''}`);
  }
}

async function renderConfigCentersTable() {
  const body = document.getElementById('config-centers-table-body');
  if (!body) return;

  try {
    configCentersCache = await ApiClient.getCenters(true);
    filterConfigCenters(document.getElementById('config-centers-search')?.value || '');
  } catch (err) {
    console.error('Error cargando centros para configuración:', err);
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--red);padding:24px">Error al cargar centros: ${escapeHtml(err.message || '')}</td></tr>`;
  }
}

function filterConfigCenters(query = '') {
  const body = document.getElementById('config-centers-table-body');
  if (!body) return;

  let list = configCentersCache.slice();
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    list = list.filter(c => 
      c.nombre.toLowerCase().includes(q) ||
      c.direccion.toLowerCase().includes(q) ||
      (c.telefono || '').includes(q)
    );
  }

  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--gray)">No se encontraron centros de donación.</td></tr>`;
    return;
  }

  body.innerHTML = list.map(c => `
    <tr>
      <td>
        <strong style="color:var(--navy);font-size:14px">${escapeHtml(c.nombre)}</strong>
      </td>
      <td style="font-size:13px;color:var(--gray)">${escapeHtml(c.direccion)}</td>
      <td style="font-size:13px;font-weight:600">${escapeHtml(c.horario)}</td>
      <td style="font-size:13px">${escapeHtml(c.dias)}</td>
      <td style="font-size:13px;color:var(--navy-mid)">${escapeHtml(c.telefono || '—')}</td>
      <td>
        ${c.activo 
          ? `<span class="tag green">● Habilitado</span>` 
          : `<span class="tag" style="background:#F1F5F9;color:#64748B">○ Deshabilitado</span>`}
      </td>
      <td style="text-align:right">
        <div style="display:inline-flex;gap:6px;align-items:center">
          <button class="btn btn-outline btn-sm" style="font-size:11.5px;padding:4px 8px" onclick="openCenterModal(${c.id})">
            ✏️ Editar
          </button>
          <button class="btn btn-outline btn-sm" style="font-size:11.5px;padding:4px 8px;color:${c.activo ? '#D97706' : 'var(--green)'};border-color:${c.activo ? '#FCD34D' : 'var(--green)'}" onclick="toggleCenterStatus(${c.id})">
            ${c.activo ? '⏸️ Deshabilitar' : '▶️ Habilitar'}
          </button>
          <button class="btn btn-outline btn-sm" style="font-size:11.5px;padding:4px 8px;color:var(--red);border-color:var(--red)" onclick="deleteCenterConfirm(${c.id}, '${escapeHtml(c.nombre)}')">
            🗑️ Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCenterModal(centerId = null) {
  const modal = document.getElementById('modal-center-form');
  const title = document.getElementById('center-modal-title');
  if (!modal) return;

  const idInput = document.getElementById('center-form-id');
  const nombreInput = document.getElementById('center-form-nombre');
  const dirInput = document.getElementById('center-form-direccion');
  const horInput = document.getElementById('center-form-horario');
  const diasInput = document.getElementById('center-form-dias');
  const telInput = document.getElementById('center-form-telefono');
  const actInput = document.getElementById('center-form-activo');

  if (centerId) {
    const center = configCentersCache.find(c => c.id === centerId);
    if (!center) return;
    if (title) title.textContent = `✏️ Modificar Centro: ${center.nombre}`;
    idInput.value = center.id;
    nombreInput.value = center.nombre;
    dirInput.value = center.direccion;
    horInput.value = center.horario;
    diasInput.value = center.dias;
    telInput.value = center.telefono || '';
    actInput.checked = center.activo;
  } else {
    if (title) title.textContent = `➕ Nuevo Centro de Donación`;
    idInput.value = '';
    nombreInput.value = '';
    dirInput.value = '';
    horInput.value = 'Lun–Vie  8:00 – 12:00';
    diasInput.value = 'Lunes a Viernes';
    telInput.value = '+54 261 ';
    actInput.checked = true;
  }

  modal.classList.add('open');
}

function closeCenterModal() {
  const modal = document.getElementById('modal-center-form');
  if (modal) modal.classList.remove('open');
}

async function submitCenterForm() {
  const id = document.getElementById('center-form-id').value;
  const nombre = document.getElementById('center-form-nombre').value.trim();
  const direccion = document.getElementById('center-form-direccion').value.trim();
  const horario = document.getElementById('center-form-horario').value.trim();
  const dias = document.getElementById('center-form-dias').value.trim();
  const telefono = document.getElementById('center-form-telefono').value.trim();
  const activo = document.getElementById('center-form-activo').checked;

  if (!nombre || !direccion || !horario || !dias) {
    alert('Por favor completá los campos obligatorios (Nombre, Dirección, Horario, Días).');
    return;
  }

  const payload = { nombre, direccion, horario, dias, telefono, activo };

  try {
    if (id) {
      await ApiClient.updateCenter(parseInt(id), payload);
      alert('✅ Centro actualizado con éxito.');
    } else {
      await ApiClient.createCenter(payload);
      alert('🎉 Centro de donación registrado con éxito.');
    }

    closeCenterModal();
    renderConfigCentersTable();
    renderCentros();
  } catch (err) {
    alert(`Error al guardar centro: ${err.message || ''}`);
  }
}

async function toggleCenterStatus(centerId) {
  try {
    await ApiClient.toggleCenter(centerId);
    renderConfigCentersTable();
    renderCentros();
  } catch (err) {
    alert(`Error al cambiar estado del centro: ${err.message || ''}`);
  }
}

async function deleteCenterConfirm(centerId, name) {
  if (!confirm(`¿Estás seguro de que deseás eliminar o deshabilitar el centro "${name}"?`)) return;
  try {
    await ApiClient.deleteCenter(centerId);
    alert('Centro eliminado o deshabilitado con éxito.');
    renderConfigCentersTable();
    renderCentros();
  } catch (err) {
    alert(`Error: ${err.message || ''}`);
  }
}

// ---------------- NAVEGACIÓN Y CONTROL DE ACCESO POR ROL ----------------
function updateRoleUI() {
  if (!currentUser) return;
  const isAdmin = currentUser.rol === 'Administrador';

  // 1. Sidebar: Ocultar bloque completo de Administración a los donantes (pacientes)
  const adminSection = document.getElementById('sidebar-admin-section');
  if (adminSection) {
    adminSection.style.display = isAdmin ? 'block' : 'none';
  }

  if (isAdmin) {
    ApiClient.getAllAppointments('Pendiente').then(list => {
      const b = document.getElementById('turnos-pending-badge');
      if (b) {
        b.textContent = list.length;
        b.style.display = list.length > 0 ? 'inline-block' : 'none';
      }
    }).catch(() => {});
  }

  // 2. Dashboard: Ocultar Donantes recientes y Nueva alerta si no es personal de hemoterapia
  const btnNuevaAlerta = document.getElementById('dashboard-btn-nueva-alerta');
  if (btnNuevaAlerta) {
    btnNuevaAlerta.style.display = isAdmin ? 'inline-flex' : 'none';
  }
  const recentDonorsCard = document.getElementById('dashboard-recent-donors-card');
  if (recentDonorsCard) {
    recentDonorsCard.style.display = isAdmin ? 'block' : 'none';
  }

  // 3. Botón Quiero Donar en topbar visible para donantes
  const topbarBtnQuieroDonar = document.getElementById('topbar-btn-quiero-donar');
  if (topbarBtnQuieroDonar) {
    topbarBtnQuieroDonar.style.display = (!isAdmin && currentUser) ? 'inline-flex' : 'none';
  }

  // 4. Dashboard: Ocultar tarjeta 'Donantes activos' para pacientes (solo visible para personal de Hemoterapia)
  const cardDonantes = document.getElementById('card-stat-donantes');
  const statsGrid = document.getElementById('dashboard-stats-grid');
  if (cardDonantes && statsGrid) {
    if (isAdmin) {
      cardDonantes.style.display = 'flex';
      statsGrid.className = 'grid grid-4 mb-24';
    } else {
      cardDonantes.style.display = 'none';
      statsGrid.className = 'grid grid-3 mb-24';
    }
  }
}

function navigate(page) {
  // Restricción de acceso: Páginas de administración solo para personal autorizado
  const adminPages = ['donantes', 'stock', 'reportes', 'turnos'];
  if (adminPages.includes(page) && (!currentUser || currentUser.rol !== 'Administrador')) {
    alert('🔒 Acceso restringido: Esta sección es exclusiva para el personal autorizado del Servicio de Hemoterapia.');
    navigate('perfil');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetPage = document.getElementById('page-' + page);
  if (targetPage) targetPage.classList.add('active');

  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  const titles = {
    dashboard:     'Panel de control',
    perfil:        'Mi perfil de donante',
    historial:     'Historial de donaciones',
    tarjeta:       'Tarjeta digital de grupo sanguíneo',
    informacion:   'Tenés que saber antes de donar',
    requisitos:    'Requisitos para donar sangre',
    donantes:      'Gestión de donantes',
    centros:       'Centros de donación',
    notificaciones:'Notificaciones y alertas',
    stock:         'Stock de sangre',
    reportes:      'Reportes y métricas',
    turnos:        'Gestión y Asignación de Turnos de Donación',
    configuracion: 'Configuración del Sistema y Centros',
  };

  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[page] || 'Soy Donante';

  // Render on demand
  if (page === 'dashboard')      renderDashboard();
  if (page === 'perfil')         renderPerfil();
  if (page === 'historial')      renderHistorial();
  if (page === 'donantes')       renderDonantes();
  if (page === 'centros')        renderCentros();
  if (page === 'notificaciones') renderNotificaciones();
  if (page === 'stock')          renderStock();
  if (page === 'tarjeta')        renderTarjeta();
  if (page === 'reportes')       renderReportes();
  if (page === 'turnos')         renderTurnosAdmin();
  if (page === 'configuracion')  renderConfiguracion();
  if (page === 'informacion')    renderInformacion();
  if (page === 'requisitos')     renderRequisitos();

  document.getElementById('sidebar').classList.remove('open');
}

// ============================================================
//  TENÉS QUE SABER  +  REQUISITOS  (contenido informativo)
// ============================================================

const ICON_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const DROP_PATH = 'M12 2C12 2 4 10 4 15.5C4 19.09 7.58 22 12 22C16.42 22 20 19.09 20 15.5C20 10 12 2 12 2Z';

const ICONS = {
  drop:     `<svg ${ICON_ATTR}><path d="${DROP_PATH}"/></svg>`,
  dropFill: `<svg viewBox="0 0 24 24"><path d="${DROP_PATH}"/></svg>`,
  check:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  cross:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  clock:    `<svg ${ICON_ATTR}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>`,
  venus:    `<svg ${ICON_ATTR}><circle cx="12" cy="9" r="5.5"/><line x1="12" y1="14.5" x2="12" y2="22"/><line x1="8.5" y1="18.5" x2="15.5" y2="18.5"/></svg>`,
  mars:     `<svg ${ICON_ATTR}><circle cx="10" cy="14" r="5.5"/><line x1="14" y1="10" x2="20.5" y2="3.5"/><polyline points="15 3.5 20.5 3.5 20.5 9"/></svg>`,
  virus:    `<svg ${ICON_ATTR}><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>`,
  heart:    `<svg ${ICON_ATTR}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  pulse:    `<svg ${ICON_ATTR}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/><polyline points="6.5 12 9.5 12 11 9 13.2 15 14.7 12 17.5 12"/></svg>`,
  syringe:  `<svg ${ICON_ATTR}><path d="M18 2l4 4M16 4l4 4M14 6l4 4"/><path d="M13 7L5 15v4h4l8-8"/><path d="M9 11l4 4M3 21l2-2"/></svg>`,
  pill:     `<svg ${ICON_ATTR}><path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l10-10a4.95 4.95 0 0 1 7 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>`,
  idcard:   `<svg ${ICON_ATTR}><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.5-1.6 1.7-2.3 3-2.3s2.5.7 3 2.3"/><line x1="14.5" y1="10" x2="19" y2="10"/><line x1="14.5" y1="14" x2="19" y2="14"/></svg>`,
  calendar: `<svg ${ICON_ATTR}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  scale:    `<svg ${ICON_ATTR}><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7.5 10a6 6 0 0 1 9 0"/><line x1="12" y1="10.5" x2="14" y2="8"/></svg>`,
  coffee:   `<svg ${ICON_ATTR}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  noPill:   `<svg ${ICON_ATTR}><circle cx="12" cy="12" r="10"/><path d="M9.2 14.8a2.5 2.5 0 0 1-3.5-3.5l3.6-3.6a2.5 2.5 0 0 1 3.5 3.5z" transform="translate(3 0)"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg>`,
  moon:     `<svg ${ICON_ATTR}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
};

function verdict(tipo, cond, res, extra = '') {
  const ico = tipo === 'yes' ? ICONS.check : tipo === 'no' ? ICONS.cross : ICONS.clock;
  return `
    <div class="verdict ${tipo}">
      <div class="verdict-ico">${ico}</div>
      <div class="verdict-body">
        ${cond ? `<div class="verdict-cond">${cond}</div>` : ''}
        <div class="verdict-res">${res}</div>
      </div>
      ${extra}
    </div>`;
}

function infoCard(icon, titulo, cuerpo, nota = '') {
  return `
    <article class="card info-card">
      <div class="info-head">
        <div class="info-ico">${icon}</div>
        <h3 class="info-title">${titulo}</h3>
      </div>
      ${cuerpo}
      ${nota ? `<p class="info-note">${nota}</p>` : ''}
    </article>`;
}

const FRECUENCIA = [
  { quien: 'Mujeres', veces: 3, icon: ICONS.venus },
  { quien: 'Hombres', veces: 4, icon: ICONS.mars },
];

const REQUISITOS = [
  { icon: ICONS.idcard,   titulo: 'DNI',                 texto: 'Concurrir con DNI u otro documento que acredite identidad.' },
  { icon: ICONS.calendar, titulo: 'Edad',                fig: '16–65', unidad: 'años',  texto: 'Tener entre 16 y 65 años.' },
  { icon: ICONS.virus,    titulo: 'Enfermedades',        texto: 'No haber padecido enfermedades de transmisión sanguínea.' },
  { icon: ICONS.scale,    titulo: 'Peso',                fig: '+50',   unidad: 'kg',    texto: 'Pesar más de 50 Kg.' },
  { icon: ICONS.pulse,    titulo: 'Salud',               texto: 'Gozar de buena salud.' },
  { icon: ICONS.coffee,   titulo: 'Desayuno',            texto: 'Desayunar antes de donar.' },
  { icon: ICONS.noPill,   titulo: 'Drogas',              texto: 'No consumir drogas ilegales.' },
  { icon: ICONS.moon,     titulo: 'Descanso',            texto: 'Descansar bien la noche anterior.' },
  { icon: ICONS.syringe,  titulo: 'Tatuajes / piercings', fig: '6',    unidad: 'meses', texto: 'No haberse hecho tatuajes, perforaciones o cirugías dentro de los últimos 6 meses.' },
];

function renderInformacion() {
  const wrap = document.getElementById('info-content');
  if (!wrap) return;

  const freq = `
    <section class="freq-card">
      <div class="freq-title">¿Cada cuánto podés donar sangre?</div>
      <div class="freq-grid">
        ${FRECUENCIA.map(f => `
          <div class="freq-item">
            <div class="freq-who">${f.icon}${f.quien}</div>
            <div class="freq-count">
              <span class="freq-num">${f.veces}</span>
              <span class="freq-unit">veces al año</span>
            </div>
            <div class="freq-drops" aria-hidden="true">${ICONS.dropFill.repeat(f.veces)}</div>
          </div>`).join('')}
      </div>
      <div class="freq-note">
        ${ICONS.clock}
        <span>Recordá que deben transcurrir un mínimo de <strong>8 semanas</strong> entre donaciones.</span>
      </div>
    </section>`;

  const hepatitis = infoCard(ICONS.virus, 'Si tuviste hepatitis',
    `<div class="stack" style="gap:10px">
       ${verdict('yes', 'Hepatitis A', 'Podés donar sangre')}
       ${verdict('no',  'Hepatitis B o C', 'No podés donar sangre')}
     </div>`);

  const vacunas = infoCard(ICONS.syringe, 'Si vas a donar sangre y te vacunaste contra',
    `<div class="stack" style="gap:10px">
       ${verdict('wait', 'Varicela · Rubéola · Sarampión · Fiebre amarilla', 'Tenés que esperar 28 días',
          '<div class="verdict-when"><strong>28</strong><span>días</span></div>')}
       ${verdict('wait', 'COVID', 'Esperá 3 días',
          '<div class="verdict-when"><strong>3</strong><span>días</span></div>')}
       ${verdict('yes',  'Hepatitis B · Gripe', 'Podés donar inmediatamente si te encontrás bien')}
     </div>`);

  const lactancia = infoCard(ICONS.heart, 'Si estás en período de lactancia',
    verdict('no', '', 'No podés donar sangre'),
    'Te esperamos cuando finalice esa linda etapa.');

  const levotiroxina = infoCard(ICONS.pill, 'Si tomás levotiroxina',
    verdict('yes', '', 'Podés donar sangre'));

  const menstruacion = infoCard(ICONS.drop, 'Si estás menstruando',
    verdict('yes', '', 'Podés donar sangre'),
    'Siempre que te sientas bien.');

  wrap.innerHTML = `
    <div class="stack">
      ${freq}
      <div class="grid grid-2">${hepatitis}${vacunas}</div>
      <div class="grid grid-3">${lactancia}${levotiroxina}${menstruacion}</div>
    </div>`;
}

function renderRequisitos() {
  const wrap = document.getElementById('req-content');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="stack">
      <section class="req-hero">
        <div class="req-hero-ico">${ICONS.drop}</div>
        <div class="req-hero-text">
          <div class="req-hero-title">Requisitos para donar sangre</div>
          <div class="req-hero-sub">Revisá que cumplas estas condiciones antes de ir a donar.</div>
        </div>
      </section>

      <div class="grid grid-3">
        ${REQUISITOS.map(r => `
          <article class="card req-card">
            <div class="req-top">
              <div class="req-ico">${r.icon}</div>
              <h3 class="req-name">${r.titulo}</h3>
              ${r.fig ? `<div class="req-fig"><strong>${r.fig}</strong><span>${r.unidad}</span></div>` : ''}
            </div>
            <p class="req-text">${r.texto}</p>
          </article>`).join('')}
      </div>

      <section class="req-closing">
        <div class="req-closing-ico">${ICONS.dropFill}</div>
        <div>
          <div class="req-closing-title">Tu gesto, su vida.</div>
          <div class="req-closing-sub">Sé el motivo por el cual alguien vuelve a sonreír.</div>
        </div>
        <div class="req-closing-end"><strong>Pequeño gesto, gran impacto.</strong>¡Te esperamos!</div>
      </section>
    </div>`;
}

// ---------------- MODALES Y ALERTAS ----------------
function openAlertModal() {
  document.getElementById('alert-modal').classList.add('open');
}

function closeAlertModal() {
  document.getElementById('alert-modal').classList.remove('open');
}

async function sendAlert() {
  const grupo = document.getElementById('alert-grupo').value;
  const centro = document.getElementById('alert-centro').value;
  const msg = document.getElementById('alert-msg').value;
  if (!msg.trim()) { alert('Ingresá un mensaje para la alerta.'); return; }

  try {
    const res = await ApiClient.sendUrgentAlert(grupo, centro, msg);
    closeAlertModal();
    alert(`✅ Alerta urgente emitida.\nGrupo: ${res.grupo_requerido}\nCentro: ${res.centro_nombre}\nDonantes notificados: ~${res.total_notificados}`);
    document.getElementById('alert-msg').value = '';
    renderDashboard();
  } catch (err) {
    alert('Error al enviar la alerta urgente.');
  }
}

async function sendStockAlert() {
  const grupo = document.getElementById('stock-grupo').value;
  const centro = document.getElementById('stock-centro').value;
  const msg = document.getElementById('stock-msg').value;
  if (!msg.trim()) { alert('Ingresá un mensaje para la alerta.'); return; }

  try {
    const res = await ApiClient.sendUrgentAlert(grupo, centro, msg);
    alert(`✅ Alerta urgente enviada a donantes del grupo ${res.grupo_requerido} en ${res.centro_nombre}.`);
    document.getElementById('stock-msg').value = '';
    renderDashboard();
  } catch (err) {
    alert('Error al enviar la alerta urgente.');
  }
}

function openSettingsModal() {
  document.getElementById('settings-modal').classList.add('open');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.remove('open');
}

function requestPushNotifications() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        alert('🔔 ¡Notificaciones push habilitadas correctamente!');
        new Notification('Soy Donante Mendoza', {
          body: 'Notificaciones activadas. Recibirás avisos urgentes cuando se necesite tu grupo sanguíneo.',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🩸</text></svg>',
        });
      } else {
        alert('No se otorgaron permisos para notificaciones en el navegador.');
      }
    });
  } else {
    alert('Tu navegador no soporta notificaciones de escritorio.');
  }
}

async function handleProfileSave() {
  const phoneInput = document.getElementById('input-phone');
  if (!phoneInput) return;
  const newPhone = phoneInput.value.trim();
  try {
    currentUser = await ApiClient.updatePhone(newPhone);
    alert('✅ Teléfono actualizado correctamente en la base de datos.');
  } catch (err) {
    alert('Error al actualizar la información.');
  }
}

// ---------------- LOGIN / LOGOUT ----------------
async function handleLogin() {
  const dni   = document.getElementById('input-dni').value.replace(/\./g, '').trim();
  const fecha = document.getElementById('input-fecha').value.trim();
  const err   = document.getElementById('login-error');

  try {
    const data = await ApiClient.login(dni, fecha);
    currentUser = data.user;
    err.style.display = 'none';

    // Actualizar datos del usuario en sidebar
    const fullName = `${currentUser.nombre} ${currentUser.apellido}`;
    document.querySelector('.user-avatar').textContent = initials(fullName);
    document.querySelector('.user-name').textContent   = fullName;
    document.querySelector('.user-role').textContent   = `${currentUser.rol} · ${currentUser.grupo_sanguineo}`;

    // Llenar inputs de perfil
    const pName = document.getElementById('profile-nombre');
    const pDni  = document.getElementById('profile-dni');
    const pBirth = document.getElementById('profile-birth');
    const pGroup = document.getElementById('profile-group');
    const pPhone = document.getElementById('input-phone');

    if (pName)  pName.value = fullName;
    if (pDni)   pDni.value = currentUser.dni;
    if (pBirth) pBirth.value = currentUser.fecha_nacimiento;
    if (pGroup) pGroup.value = currentUser.grupo_sanguineo;
    if (pPhone) pPhone.value = currentUser.telefono || '';

    // Mostrar aplicación
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display    = 'flex';

    updateRoleUI();
    startRealtimeNotifications();
    navigate(currentUser.rol === 'Administrador' ? 'dashboard' : 'perfil');
  } catch (error) {
    err.style.display = 'block';
    document.getElementById('input-dni').style.borderColor   = 'var(--red)';
    document.getElementById('input-fecha').style.borderColor = 'var(--red)';
  }
}

function handleLogout() {
  stopRealtimeNotifications();
  ApiClient.setAuthToken('');
  currentUser = null;
  document.getElementById('app-shell').style.display    = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('input-dni').value   = '';
  document.getElementById('input-fecha').value = '';
  document.getElementById('input-dni').style.borderColor   = '';
  document.getElementById('input-fecha').style.borderColor = '';
  document.getElementById('login-error').style.display = 'none';
}

// ---------------- INICIALIZACIÓN ----------------
document.addEventListener('DOMContentLoaded', async () => {
  // Navigation event listeners
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  // Mobile menu
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  // Buscador de donantes en tiempo real
  const search = document.getElementById('donor-search');
  if (search) {
    let timeout = null;
    search.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => renderDonantes(search.value), 300);
    });
  }

  // Soporte tecla Enter en login
  ['input-dni', 'input-fecha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  });

  // Verificar si hay sesión persistente
  const token = ApiClient.getAuthToken();
  if (token) {
    try {
      currentUser = await ApiClient.getProfile();
      if (currentUser) {
        const fullName = `${currentUser.nombre} ${currentUser.apellido}`;
        document.querySelector('.user-avatar').textContent = initials(fullName);
        document.querySelector('.user-name').textContent   = fullName;
        document.querySelector('.user-role').textContent   = `${currentUser.rol} · ${currentUser.grupo_sanguineo}`;

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-shell').style.display    = 'flex';

        updateRoleUI();
        startRealtimeNotifications();
        navigate(currentUser.rol === 'Administrador' ? 'dashboard' : 'perfil');
        return;
      }
    } catch (e) {
      ApiClient.setAuthToken('');
    }
  }
});
