import { Routes, Route } from 'react-router-dom';
import { useAuthInit } from '@/hooks/useAuthInit';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import Services from '@/pages/Services';
import Barbers from '@/pages/Barbers';
import Agenda from '@/pages/Agenda';
import POS from '@/pages/POS';
import Cash from '@/pages/Cash';
import Products from '@/pages/Products';
import Reports from '@/pages/Reports';
import Branches from '@/pages/Branches';
import Settings from '@/pages/Settings';
import ShareBooking from '@/pages/ShareBooking';
import ScheduleManagement from '@/pages/ScheduleManagement';
import SuperAdmin from '@/pages/SuperAdmin';
import BookingPortal from '@/pages/booking/BookingPortal';
import NotFound from '@/pages/NotFound';

export default function App() {
  useAuthInit();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/registro"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />

      {/* Portal público de reserva online (clientes) */}
      <Route path="/reservar/:slug" element={<BookingPortal />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Panel SaaS Master (Supervisión global de barberías) */}
          <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
            <Route path="/superadmin" element={<SuperAdmin />} />
          </Route>

          <Route path="/" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/caja" element={<Cash />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:id" element={<ClientDetail />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/barberos" element={<Barbers />} />
          <Route element={<ProtectedRoute roles={['ADMIN', 'RECEPTIONIST']} />}>
            <Route path="/horarios" element={<ScheduleManagement />} />
            <Route path="/reportes" element={<Reports />} />
            <Route path="/reservas-online" element={<ShareBooking />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/sucursales" element={<Branches />} />
            <Route path="/configuracion" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

