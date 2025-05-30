// components/ProtectedRoute.js
import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../Context/AuthContext';

// Component to protect routes that require authentication
export const ProtectedRoute = () => {
  const { state } = useContext(AuthContext);
  
  if (state.isLoading) {
    // Show loading indicator while checking authentication
    return <div>Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Render child routes
  return <Outlet />;
};

export const AdminRoute = () => {
  const { state } = useContext(AuthContext);
  
  if (state.isLoading) {
    return <div>Loading...</div>;
  }
  
  // If not authenticated or not admin, redirect
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (state.role !== 'Admin') {
    return <Navigate to="/home" replace />;
  }
  
  // Render child routes for admin
  return <Outlet />;
};

export const GuruRoute = () => {
  const { state } = useContext(AuthContext);
  
  if (state.isLoading) {
    return <div>Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Allow both admin and guru roles to access
  if (state.role !== 'Guru' && state.role !== 'Admin') {
    return <Navigate to="/home" replace />;
  }
  
  // Render child routes for registrator
  return <Outlet />;
}

export const TeknisiRoute = () => {
  const { state } = useContext(AuthContext);
  
  if (state.isLoading) {
    return <div>Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Allow both admin and teknisi roles to access
  if (state.role !== 'Teknisi' && state.role !== 'Admin') {
    return <Navigate to="/home" replace />;
  }
  
  // Render child routes for registrator
  return <Outlet />;
}

export const KepalaLabRoute = () => {
  const { state } = useContext(AuthContext);
  
  if (state.isLoading) {
    return <div>Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  

  
  // Render child routes for registrator
  return <Outlet />;
}
