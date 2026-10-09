import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClaimsList from './pages/ClaimsList';
import ClaimSubmit from './pages/ClaimSubmit';
import ClaimDetails from './pages/ClaimDetails';
import ReviewQueue from './pages/ReviewQueue';
import InvestigationsList from './pages/InvestigationsList';
import InvestigationDetails from './pages/InvestigationDetails';
import ProvidersList from './pages/ProvidersList';
import ProviderDetails from './pages/ProviderDetails';
import PatientsList from './pages/PatientsList';
import PatientDetails from './pages/PatientDetails';
import Reports from './pages/Reports';
import Assistant from './pages/Assistant';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import DemoData from './pages/DemoData';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RoleRoute = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  const userRole = user?.role?.toUpperCase().replace(/\s+/g, '_');
  const isAllowed = allowedRoles.some(
    (r) => r.toUpperCase().replace(/\s+/g, '_') === userRole
  );
  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />

            {/* Fraud Analyst Only Routes */}
            <Route
              path="claims"
              element={
                <RoleRoute allowedRoles={['FRAUD_ANALYST']}>
                  <ClaimsList />
                </RoleRoute>
              }
            />
            <Route
              path="claims/new"
              element={
                <RoleRoute allowedRoles={['FRAUD_ANALYST']}>
                  <ClaimSubmit />
                </RoleRoute>
              }
            />
            <Route
              path="review-queue"
              element={
                <RoleRoute allowedRoles={['FRAUD_ANALYST']}>
                  <ReviewQueue />
                </RoleRoute>
              }
            />

            {/* Claim details (Analyst review or Investigator inspection) */}
            <Route path="claims/:id" element={<ClaimDetails />} />

            {/* Investigator Only Routes */}
            <Route
              path="investigations"
              element={
                <RoleRoute allowedRoles={['INVESTIGATOR']}>
                  <InvestigationsList />
                </RoleRoute>
              }
            />
            <Route
              path="investigations/:id"
              element={
                <RoleRoute allowedRoles={['INVESTIGATOR']}>
                  <InvestigationDetails />
                </RoleRoute>
              }
            />

            {/* Shared Entities & Insights */}
            <Route path="providers" element={<ProvidersList />} />
            <Route path="providers/:id" element={<ProviderDetails />} />
            <Route path="patients" element={<PatientsList />} />
            <Route path="patients/:id" element={<PatientDetails />} />
            <Route path="reports" element={<Reports />} />
            <Route path="assistant" element={<Assistant />} />

            {/* Shared System & Audit */}
            <Route path="notifications" element={<Notifications />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="demo" element={<DemoData />} />
            <Route path="demo-data" element={<DemoData />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
