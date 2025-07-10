import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserRole } from '../context/UserRoleContext';
import { auth } from '../firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  if (loading) return null; // hoặc loading spinner
  if (!user) return <Navigate to="/login?session_expired=true" replace />;
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default ProtectedAdminRoute;
