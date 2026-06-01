import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { normalizeUserRole } from '../utils/auth';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: ('ADMIN' | 'BCH' | 'STUDENT')[];
}

const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const role = normalizeUserRole(user?.role);

  if (user && !allowedRoles.includes(role as any)) {
    // If student tries to access admin page, redirect to home/dashboard
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default RoleRoute;
