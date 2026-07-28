import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuth();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/entregador" replace />;
  }

  return <>{children}</>;
};

export const EntregadorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuth();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'courier') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
