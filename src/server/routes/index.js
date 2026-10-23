import { Router } from 'express';
import authRoutes from './auth.routes.js';
import branchRoutes from './branch.routes.js';
import clientRoutes from './client.routes.js';
import serviceRoutes from './service.routes.js';
import barberRoutes from './barber.routes.js';
import appointmentRoutes from './appointment.routes.js';
import productRoutes from './product.routes.js';
import cashRoutes from './cash.routes.js';
import saleRoutes from './sale.routes.js';
import reportRoutes from './report.routes.js';
import publicRoutes from './public.routes.js';
import bookingRoutes from './booking.routes.js';
import settingsRoutes from './settings.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import scheduleRoutes from './schedule.routes.js';
import superadminRoutes from './superadmin.routes.js';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) =>
  res.json({
    name: 'BarberiaPro API',
    version: '1.2.0',
    modules: [
      'auth',
      'branches',
      'clients',
      'services',
      'barbers',
      'appointments',
      'products',
      'cash',
      'sales',
      'reports',
      'public',
      'booking',
      'settings',
      'dashboard',
      'schedule',
      'superadmin',
    ],
  })
);

apiRouter.use('/auth', authRoutes);
apiRouter.use('/branches', branchRoutes);
apiRouter.use('/clients', clientRoutes);
apiRouter.use('/services', serviceRoutes);
apiRouter.use('/barbers', barberRoutes);
apiRouter.use('/appointments', appointmentRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/cash', cashRoutes);
apiRouter.use('/sales', saleRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/public', publicRoutes);
apiRouter.use('/booking', bookingRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/schedule', scheduleRoutes);
apiRouter.use('/superadmin', superadminRoutes);


