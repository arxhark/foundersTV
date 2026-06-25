import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LogOut, User, Bookmark, Zap } from 'lucide-react';

const Logo = () => (
  <Link to="/" className="flex items-center gap-2">
    <div className="flex items-center gap-1">
      <span className="text-blue-electric text-xl">▶</span>
      <span className="font-extrabold text-xl tracking-tight">
        <span className="text-white">Founders</span>
        <span className="text-blue-electric">TV</span>
      </span>
    </div>
  </Link>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const { onlineCount, connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-bg-primary/80 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />

        <div className="flex items-center gap-6">
          {/* Online count */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary">
            <span className={`status-dot ${connected ? 'status-dot-online' : 'status-dot-offline'}`} />
            <span className="font-medium text-text-primary">{onlineCount}</span>
            <span>founders online</span>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                           text-text-secondary hover:text-text-primary hover:bg-bg-secondary
                           transition-all duration-200"
              >
                <Zap size={16} className="text-blue-electric" />
                <span className="hidden sm:inline">Connect</span>
              </Link>

              <Link
                to="/contacts"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                           text-text-secondary hover:text-text-primary hover:bg-bg-secondary
                           transition-all duration-200"
              >
                <Bookmark size={16} />
                <span className="hidden sm:inline">Contacts</span>
              </Link>

              <Link to="/profile" className="flex items-center gap-1.5 group">
                {user.photo ? (
                  <img
                    src={user.photo}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-border-subtle
                               group-hover:border-blue-electric transition-all duration-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-electric/20 border-2 border-border-subtle
                                  group-hover:border-blue-electric flex items-center justify-center
                                  transition-all duration-200">
                    <User size={18} className="text-blue-electric" />
                  </div>
                )}
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-text-muted hover:text-red-disconnect
                           hover:bg-red-disconnect/10 transition-all duration-200"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="btn-primary text-sm py-2 px-5"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
