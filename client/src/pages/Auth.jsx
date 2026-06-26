import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { Chrome, Apple, Mail, Zap, ArrowRight, Check } from 'lucide-react';
import Spinner from '../components/ui/Spinner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ERROR_MESSAGES = {
  oauth: 'Sign-in failed. Please try again.',
  server: 'Something went wrong on our side.',
  link: 'That sign-in link is invalid or expired.',
  google_disabled: 'Google sign-in is not configured yet.',
  apple_disabled: 'Apple sign-in is not available yet.',
};

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [providers, setProviders] = useState({ google: true, apple: false, email: true });
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      navigate(user.onboardingComplete ? '/dashboard' : '/onboarding');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    authApi.getProviders().then(({ data }) => setProviders(data)).catch(() => {});
  }, []);

  const error = params.get('error');

  const goOAuth = (provider) => {
    window.location.href = `${API_URL}/api/auth/${provider}`;
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setFormError('');
    setSending(true);
    try {
      const { data } = await authApi.requestMagicLink(email);
      setSent(true);
      if (data.devLink) setDevLink(data.devLink);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not send the link.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
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
              Meet your next co-founder. Right now.
            </p>
          </div>

          {(error && ERROR_MESSAGES[error]) && (
            <div className="bg-red-disconnect/10 border border-red-disconnect/20 text-red-400
                            rounded-xl p-3 text-sm mb-6 text-center">
              {ERROR_MESSAGES[error]}
            </div>
          )}

          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-full bg-green-connected/10 border border-green-connected/20
                              flex items-center justify-center mx-auto mb-4">
                <Check size={26} className="text-green-connected" />
              </div>
              <h2 className="font-semibold text-lg">Check your inbox</h2>
              <p className="text-text-secondary text-sm mt-1">
                We sent a sign-in link to <span className="text-text-primary">{email}</span>
              </p>
              {devLink && (
                <a
                  href={devLink}
                  className="block mt-4 text-blue-electric text-sm break-all underline"
                >
                  Dev link (no email provider configured) →
                </a>
              )}
              <button
                onClick={() => { setSent(false); setDevLink(''); }}
                className="text-text-muted hover:text-text-secondary text-xs mt-4 transition-colors"
              >
                Use a different method
              </button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {providers.google && (
                <button
                  onClick={() => goOAuth('google')}
                  className="w-full flex items-center justify-center gap-3 bg-white text-gray-900
                             font-semibold py-3.5 px-6 rounded-xl hover:bg-gray-100 transition-all
                             duration-200 active:scale-95"
                >
                  <Chrome size={20} /> Continue with Google
                </button>
              )}

              {providers.apple && (
                <button
                  onClick={() => goOAuth('apple')}
                  className="w-full flex items-center justify-center gap-3 bg-black text-white
                             font-semibold py-3.5 px-6 rounded-xl border border-border hover:bg-bg-card
                             transition-all duration-200 active:scale-95"
                >
                  <Apple size={20} /> Continue with Apple
                </button>
              )}

              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-text-muted text-xs">or</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@startup.com"
                    className="input-base pl-10"
                  />
                </div>
                {formError && <p className="text-red-400 text-xs">{formError}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {sending ? <Spinner size={18} /> : <>Email me a link <ArrowRight size={16} /></>}
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border-subtle">
            <div className="flex items-start gap-3">
              <Zap size={16} className="text-blue-electric flex-shrink-0 mt-0.5" />
              <p className="text-text-muted text-xs leading-relaxed">
                By signing in you agree to our Terms. We only use your profile info to
                build your founder card — no spam, ever.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
