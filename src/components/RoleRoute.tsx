import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: ('ADMIN' | 'BCH' | 'STUDENT')[];
}

const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const role = user?.role?.toUpperCase();

  if (user && !allowedRoles.includes(role as any)) {
    // If student tries to access admin page, redirect to home/dashboard
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default RoleRoute;
