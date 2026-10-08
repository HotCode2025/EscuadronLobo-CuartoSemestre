// ============================================================
// SOY DONANTE — API Client (Connects Frontend to Python FastAPI)
// ============================================================

const API_BASE = '/api';

class ApiClient {
    static getAuthToken() {
        return localStorage.getItem('soydonante_token') || '';
    }

    static setAuthToken(token) {
        if (token) {
            localStorage.setItem('soydonante_token', token);
        } else {
            localStorage.removeItem('soydonante_token');
        }
    }

    static getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    static async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options,
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Error en la solicitud' }));
                throw new Error(errorData.detail || `HTTP Error ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            console.error(`[API Error] ${endpoint}:`, err);
            throw err;
        }
    }

    // 1. Auth & Profile
    static async login(dni, fecha) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ dni, fecha }),
        });
        if (data.access_token) {
            this.setAuthToken(data.access_token);
        }
        return data;
    }

    static async getProfile() {
        return await this.request('/auth/me');
    }

    static async updatePhone(telefono) {
        return await this.request('/auth/me', {
            method: 'PUT',
            body: JSON.stringify({ telefono }),
        });
    }

    // 2. Dashboard
    static async getDashboardStats() {
        return await this.request('/dashboard/stats');
    }

    static async getChartData() {
        return await this.request('/dashboard/chart');
    }

    // 3. Donations
    static async getMyDonations() {
        return await this.request('/donations/my-history');
    }

    static async addDonation(donationData) {
        return await this.request('/donations', {
            method: 'POST',
            body: JSON.stringify(donationData),
        });
    }

    // 4. Donors Management
    static async getDonors(query = '') {
        const q = query ? `?q=${encodeURIComponent(query)}` : '';
        return await this.request(`/donors${q}`);
    }

    static async registerDonor(donorData) {
        return await this.request('/donors', {
            method: 'POST',
            body: JSON.stringify(donorData),
        });
    }

    static async getDonorFull(donorId) {
        return await this.request(`/donors/${donorId}/full`);
    }

    static async updateDonorStatus(donorId, esApto) {
        return await this.request(`/donors/${donorId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ es_apto: esApto }),
        });
    }

    // 5. Donation Centers
    static async getCenters(includeInactive = false) {
        return await this.request(`/centers${includeInactive ? '?include_inactive=true' : ''}`);
    }

    static async createCenter(centerData) {
        return await this.request('/centers', {
            method: 'POST',
            body: JSON.stringify(centerData),
        });
    }

    static async updateCenter(id, centerData) {
        return await this.request(`/centers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(centerData),
        });
    }

    static async toggleCenter(id) {
        return await this.request(`/centers/${id}/toggle`, {
            method: 'PUT',
        });
    }

    static async deleteCenter(id) {
        return await this.request(`/centers/${id}`, {
            method: 'DELETE',
        });
    }

    // 6. Blood Stock
    static async getStock() {
        return await this.request('/stock');
    }

    static async updateStock(id, unidades) {
        return await this.request(`/stock/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ unidades }),
        });
    }

    static async consumeStock(consumptionData) {
        return await this.request('/stock/consume', {
            method: 'POST',
            body: JSON.stringify(consumptionData),
        });
    }

    static async addStockIncome(incomeData) {
        return await this.request('/stock/income', {
            method: 'POST',
            body: JSON.stringify(incomeData),
        });
    }

    static async getStockMovements() {
        return await this.request('/stock/movements');
    }

    // 7. Notifications & Alerts
    static async getNotifications() {
        return await this.request('/notifications');
    }

    static async markNotificationRead(id) {
        return await this.request(`/notifications/${id}/read`, { method: 'PUT' });
    }

    static async markAllNotificationsRead() {
        return await this.request('/notifications/read-all', { method: 'PUT' });
    }

    static async sendUrgentAlert(grupo, centro, mensaje) {
        return await this.request('/alerts', {
            method: 'POST',
            body: JSON.stringify({ grupo, centro, mensaje }),
        });
    }

    static async getActiveAlertForUser() {
        return await this.request('/alerts/active-for-user');
    }

    // 8. Reports
    static async getMvpMetrics() {
        return await this.request('/reports/metrics');
    }

    static async getReportsSummary() {
        return await this.request('/reports/summary');
    }

    // 9. Donation Appointments / Turnos
    static async createAppointment(appointmentData) {
        return await this.request('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData),
        });
    }

    static async getMyAppointments() {
        return await this.request('/appointments/my');
    }

    static async cancelAppointment(id) {
        return await this.request(`/appointments/${id}/cancel`, { method: 'PUT' });
    }

    // 10. Admin Appointments & Notification
    static async getAllAppointments(estado = '') {
        const q = estado && estado !== 'Todos' ? `?estado=${encodeURIComponent(estado)}` : '';
        return await this.request(`/appointments${q}`);
    }

    static async updateAppointmentStatus(id, estado, notasAdmin = '', notificarDonante = true, mensajeNotificacion = '') {
        return await this.request(`/appointments/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({
                estado,
                notas_admin: notasAdmin,
                notificar_donante: notificarDonante,
                mensaje_notificacion: mensajeNotificacion,
            }),
        });
    }

    static async notifyDonorAppointment(id, titulo, cuerpo, tipo = 'blue') {
        return await this.request(`/appointments/${id}/notify`, {
            method: 'POST',
            body: JSON.stringify({ titulo, cuerpo, tipo }),
        });
    }

    static async rescheduleAppointment(id, data) {
        return await this.request(`/appointments/${id}/reschedule`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    static async createAdminAppointment(data) {
        return await this.request('/appointments/admin', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // 11. Settings
    static async getSettings() {
        return await this.request('/settings');
    }

    static async getSetting(clave) {
        return await this.request(`/settings/${clave}`);
    }

    static async updateSetting(clave, valor) {
        return await this.request(`/settings/${clave}`, {
            method: 'PUT',
            body: JSON.stringify({ valor }),
        });
    }
}
