// utils/Middleware/ProtectedRoute.js
import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";

// Untuk user login umum
export const ProtectedRoute = () => {
  const { state } = useContext(AuthContext);
  if (state.isLoading) return <div>Loading...</div>;

  return state.isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Untuk filtering role secara fleksibel
export const RoleRoute = ({ allowedRoles }) => {
  const { state } = useContext(AuthContext);
  if (state.isLoading) return <div>Loading...</div>;

  return allowedRoles.includes(state.role)
    ? <Outlet />
    : <Navigate to="/login" replace />;
};
