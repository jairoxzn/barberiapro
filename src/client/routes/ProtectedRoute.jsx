import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { PageLoader } from '@/components/ui/Misc';

export function ProtectedRoute({ roles }) {
  const { status, user } = useAuthStore();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (status !== 'authenticated') return <Navigate to="/login" replace />;

  // Las cuentas de cliente no acceden al panel: van a su portal de reserva.
  if (user?.role === 'CLIENT') {
    const slug = user?.tenant?.slug;
    return <Navigate to={slug ? `/reservar/${slug}` : '/login'} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // El SUPER_ADMIN tiene acceso global a todas las rutas
    if (user.role === 'SUPER_ADMIN') return <Outlet />;
    return <Navigate to="/" replace />;
  }


  return <Outlet />;
}

export function PublicOnlyRoute({ children }) {
  const { status, user } = useAuthStore();
  if (status === 'authenticated') {
    if (user?.role === 'CLIENT' && user?.tenant?.slug) {
      return <Navigate to={`/reservar/${user.tenant.slug}`} replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}
