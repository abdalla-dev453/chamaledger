import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

/**
 * Gates a route subtree behind authentication, and optionally a role.
 * Unauthenticated visitors are bounced to /login and returned here after signing in.
 */
export default function ProtectedRoute({ treasurerOnly = false }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const isTreasurer = useAuthStore((s) => s.isTreasurer());
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (treasurerOnly && !isTreasurer) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}