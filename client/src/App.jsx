import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Room from './pages/Room';
import Profile from './pages/Profile';
import Contacts from './pages/Contacts';
import Spinner from './components/ui/Spinner';

// Route guard: requires auth + completed onboarding
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

// Route guard: requires auth (onboarding can be incomplete)
function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

// Redirect logged-in users away from auth/landing
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (user) return <Navigate to={user.onboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  return children;
}

function FullscreenLoader() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="text-blue-electric text-4xl font-black">▶</span>
        <Spinner size={28} />
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  // Hide navbar inside the room
  const hideNavbar = location.pathname === '/room';

  return (
    <>
      {!hideNavbar && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />

          <Route path="/auth" element={
            <PublicRoute><Auth /></PublicRoute>
          } />

          <Route path="/onboarding" element={
            <AuthRoute><Onboarding /></AuthRoute>
          } />

          <Route path="/dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />

          <Route path="/room" element={
            <PrivateRoute><Room /></PrivateRoute>
          } />

          <Route path="/profile" element={
            <PrivateRoute><Profile /></PrivateRoute>
          } />

          <Route path="/contacts" element={
            <PrivateRoute><Contacts /></PrivateRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
