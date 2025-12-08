import { useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { FloatingChat } from './FloatingChat';
import { useAuth } from '../../context/AuthContext';

export function MainLayout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle shortcuts with Ctrl key
      if (!e.ctrlKey) return;

      const shortcuts: Record<string, string> = {
        '1': '/animals/giant-anteater/dashboard',
        '2': '/animals/giant-anteater/timeline',
        '3': '/animals/giant-anteater/reports',
      };

      const path = shortcuts[e.key];
      if (path && location.pathname !== path) {
        e.preventDefault();
        navigate(path);
      }
    },
    [navigate, location.pathname]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      {/* Floating AI Assistant */}
      <FloatingChat />
    </div>
  );
}
