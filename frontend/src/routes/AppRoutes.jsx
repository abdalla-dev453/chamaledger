import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../components/layout/AppLayout";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import CycleDetailPage from "../pages/CycleDetailPage";
import MembersPage from "../pages/MembersPage";
import LoansPage from "../pages/LoansPage";
import ReconcilePage from "../pages/ReconcilePage";

export default function AppRoutes() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="cycles/:cycleId" element={<CycleDetailPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="loans/:loanId" element={<LoansPage />} />

          <Route element={<ProtectedRoute treasurerOnly />}>
            <Route path="reconcile" element={<ReconcilePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}