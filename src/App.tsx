import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/molecules/Toast';
import { MainLayout } from './components/organisms/MainLayout';
import {
  LoginPage,
  RegisterPage,
  AnimalSelectionPage,
  DashboardPage,
  TimelinePage,
  ReportsPage,
} from './pages';
import { useAuth } from './context/AuthContext';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/register" replace />;
  }
  
  return <>{children}</>;
}

// Public Route wrapper (redirect to animals if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/animals" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public routes */}
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/animals"
          element={
            <ProtectedRoute>
              <AnimalSelectionPage />
            </ProtectedRoute>
          }
        />

        {/* Giant Anteater routes with MainLayout */}
        <Route
          path="/animals/giant-anteater"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        {/* Default redirect - go to register first */}
        <Route path="/" element={<Navigate to="/register" replace />} />
        
        {/* Catch all - redirect to register */}
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
