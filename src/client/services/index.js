import { api } from '@/lib/axios';

const unwrap = (p) => p.then((r) => r.data);

// ---- Auth ----
export const authApi = {
  login: (data) => unwrap(api.post('/auth/login', data)),
  register: (data) => unwrap(api.post('/auth/register', data)),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
  // Reserva online (cuentas de cliente, scoped por barbería)
  registerClient: (data) => unwrap(api.post('/auth/client/register', data)),
  loginClient: (data) => unwrap(api.post('/auth/client/login', data)),
};

// ---- Portal público / reserva online ----
export const publicApi = {
  barbershop: (slug) => unwrap(api.get(`/public/barbershop/${slug}`)),
};

export const bookingApi = {
  me: () => unwrap(api.get('/booking/me')),
  availability: (params) => unwrap(api.get('/booking/availability', { params })),
  myAppointments: () => unwrap(api.get('/booking/appointments')),
  book: (data) => unwrap(api.post('/booking/appointments', data)),
  cancel: (id) => unwrap(api.post(`/booking/appointments/${id}/cancel`)),
};

// ---- Dashboard ----
export const dashboardApi = {
  summary: (branchId) =>
    unwrap(api.get('/dashboard/summary', { params: { branchId } })),
};

// ---- Branches ----
export const branchApi = {
  list: () => unwrap(api.get('/branches')),
  create: (data) => unwrap(api.post('/branches', data)),
  update: (id, data) => unwrap(api.put(`/branches/${id}`, data)),
  remove: (id) => unwrap(api.delete(`/branches/${id}`)),
};

// ---- Clients ----
export const clientApi = {
  list: (params) => unwrap(api.get('/clients', { params })),
  get: (id) => unwrap(api.get(`/clients/${id}`)),
  history: (id) => unwrap(api.get(`/clients/${id}/history`)),
  create: (data) => unwrap(api.post('/clients', data)),
  update: (id, data) => unwrap(api.put(`/clients/${id}`, data)),
  remove: (id) => unwrap(api.delete(`/clients/${id}`)),
};

// ---- Services & Categories ----
export const serviceApi = {
  list: (params) => unwrap(api.get('/services', { params })),
  create: (data) => unwrap(api.post('/services', data)),
  update: (id, data) => unwrap(api.put(`/services/${id}`, data)),
  remove: (id) => unwrap(api.delete(`/services/${id}`)),
  categories: () => unwrap(api.get('/services/categories')),
  createCategory: (data) => unwrap(api.post('/services/categories', data)),
  updateCategory: (id, data) => unwrap(api.put(`/services/categories/${id}`, data)),
  removeCategory: (id) => unwrap(api.delete(`/services/categories/${id}`)),
};

// ---- Barbers ----
export const barberApi = {
  list: (params) => unwrap(api.get('/barbers', { params })),
  get: (id) => unwrap(api.get(`/barbers/${id}`)),
  create: (data) => unwrap(api.post('/barbers', data)),
  update: (id, data) => unwrap(api.put(`/barbers/${id}`, data)),
  remove: (id) => unwrap(api.delete(`/barbers/${id}`)),
  setSchedule: (id, schedules) =>
    unwrap(api.put(`/barbers/${id}/schedule`, { schedules })),
};

// ---- Products / Inventario ----
export const productApi = {
  list: (params) => unwrap(api.get('/products', { params })),
  get: (id, branchId) => unwrap(api.get(`/products/${id}`, { params: { branchId } })),
  create: (data) => unwrap(api.post('/products', data)),
  update: (id, data) => unwrap(api.put(`/products/${id}`, data)),
  remove: (id) => unwrap(api.delete(`/products/${id}`)),
  moveStock: (id, data) => unwrap(api.post(`/products/${id}/stock`, data)),
  kardex: (id, branchId) =>
    unwrap(api.get(`/products/${id}/kardex`, { params: { branchId } })),
};

// ---- Caja ----
export const cashApi = {
  current: (branchId) => unwrap(api.get('/cash/current', { params: { branchId } })),
  list: (params) => unwrap(api.get('/cash', { params })),
  get: (id) => unwrap(api.get(`/cash/${id}`)),
  open: (data) => unwrap(api.post('/cash/open', data)),
  close: (id, closingAmount) => unwrap(api.post(`/cash/${id}/close`, { closingAmount })),
  addMovement: (id, data) => unwrap(api.post(`/cash/${id}/movements`, data)),
};

// ---- Ventas / POS ----
export const saleApi = {
  list: (params) => unwrap(api.get('/sales', { params })),
  get: (id) => unwrap(api.get(`/sales/${id}`)),
  create: (data) => unwrap(api.post('/sales', data)),
  cancel: (id) => unwrap(api.post(`/sales/${id}/cancel`)),
  ticketUrl: (id) => `/api/sales/${id}/ticket`,
};

// ---- Configuración del negocio ----
export const settingsApi = {
  get: () => unwrap(api.get('/settings')),
  update: (data) => unwrap(api.put('/settings', data)),
  uploadLogo: (file) => {
    const form = new FormData();
    form.append('logo', file);
    return unwrap(
      api.post('/settings/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  },
};

// ---- Reportes ----
export const reportApi = {
  data: (type, params) => unwrap(api.get(`/reports/${type}`, { params })),
  // Descarga el reporte en el formato indicado (respeta el token JWT vía axios).
  download: async (type, format, params) => {
    const res = await api.get(`/reports/${type}`, {
      params: { ...params, format },
      responseType: 'blob',
    });
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="(.+?)"/);
    const filename = match?.[1] || `${type}.${format}`;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// ---- Appointments ----
export const appointmentApi = {
  agenda: (params) => unwrap(api.get('/appointments', { params })),
  get: (id) => unwrap(api.get(`/appointments/${id}`)),
  create: (data) => unwrap(api.post('/appointments', data)),
  update: (id, data) => unwrap(api.put(`/appointments/${id}`, data)),
  changeStatus: (id, status) =>
    unwrap(api.patch(`/appointments/${id}/status`, { status })),
  remove: (id) => unwrap(api.delete(`/appointments/${id}`)),
};

// ---- Horarios y Bloqueos ----
export const scheduleApi = {
  getOverview: (params) => unwrap(api.get('/schedule/overview', { params })),
  getSettings: () => unwrap(api.get('/schedule/settings')),
  updateSettings: (data) => unwrap(api.put('/schedule/settings', data)),
  listBlocks: (params) => unwrap(api.get('/schedule/blocks', { params })),
  getBlock: (id) => unwrap(api.get(`/schedule/blocks/${id}`)),
  createBlock: (data) => unwrap(api.post('/schedule/blocks', data)),
  updateBlock: (id, data) => unwrap(api.put(`/schedule/blocks/${id}`, data)),
  deleteBlock: (id) => unwrap(api.delete(`/schedule/blocks/${id}`)),
};

// ---- Super Admin (Gestión SaaS Global) ----
export const superadminApi = {
  metrics: () => unwrap(api.get('/superadmin/metrics')),
  listTenants: (params) => unwrap(api.get('/superadmin/tenants', { params })),
  getTenant: (id) => unwrap(api.get(`/superadmin/tenants/${id}`)),
  createTenant: (data) => unwrap(api.post('/superadmin/tenants', data)),
  toggleStatus: (id, isActive) => unwrap(api.patch(`/superadmin/tenants/${id}/status`, { isActive })),
  impersonate: (id) => unwrap(api.post(`/superadmin/tenants/${id}/impersonate`)),
};


