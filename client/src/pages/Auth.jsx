import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Chrome, Zap } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      navigate(user.onboardingComplete ? '/dashboard' : '/onboarding');
    }
  }, [user, loading, navigate]);

  const error = params.get('error');

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[500px] h-[400px] bg-blue-electric/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <div className="card p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                            bg-blue-electric/10 border border-blue-electric/20 mb-4">
              <span className="text-blue-electric text-3xl">▶</span>
            </div>
            <h1 className="text-3xl font-extrabold">
              <span className="text-white">Founders</span>
              <span className="text-blue-electric">TV</span>
            </h1>
            <p className="text-text-secondary mt-2 text-sm">
              Join thousands of founders building the future
            </p>
          </div>

          {error && (
            <div className="bg-red-disconnect/10 border border-red-disconnect/20 text-red-400
                            rounded-xl p-3 text-sm mb-6 text-center">
              Something went wrong. Please try again.
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900
                       font-semibold py-3.5 px-6 rounded-xl hover:bg-gray-100 transition-all
                       duration-200 active:scale-95"
          >
            <Chrome size={20} />
            Continue with Google
          </button>

          <div className="mt-6 pt-6 border-t border-border-subtle">
            <div className="flex items-start gap-3">
              <Zap size={16} className="text-blue-electric flex-shrink-0 mt-0.5" />
              <p className="text-text-muted text-xs leading-relaxed">
                By signing in, you agree to our Terms of Service. We only use your Google profile
                info (name, email, photo) to create your founder profile.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
