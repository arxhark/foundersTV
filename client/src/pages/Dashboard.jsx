import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Filter, User, Bookmark, Clock, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { connectionApi } from '../services/api';
import { ROLES, STAGES, LANGUAGES, TAGS, STAGE_COLORS } from '../utils/constants';
import FounderCard from '../components/ui/FounderCard';
import Spinner from '../components/ui/Spinner';

const EMPTY_FILTERS = { role: '', stage: '', language: '', tags: [] };

export default function Dashboard() {
  const { user } = useAuth();
  const { connected, onlineCount } = useSocket();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const toggleTag = (tag) => setFilters((f) => ({
    ...f,
    tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
  }));

  useEffect(() => {
    connectionApi.list()
      .then(({ data }) => setContacts(data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, []);

  const handleConnect = () => {
    if (!connected) return;
    navigate('/room', { state: { filters } });
  };

  const stageColor = STAGE_COLORS[user?.stage] || '';

  return (
    <div className="min-h-screen bg-bg-primary pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left sidebar — My profile */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="card p-6 sticky top-24">
              <div className="text-center">
                {user?.photo ? (
                  <img src={user.photo} alt={user.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border mx-auto" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-electric/10 border-2 border-border
                                  flex items-center justify-center mx-auto">
                    <User size={32} className="text-blue-electric" />
                  </div>
                )}
                <h3 className="font-bold mt-3">{user?.name}</h3>
                {user?.title && (
                  <p className="text-text-secondary text-sm mt-1 truncate">{user.title}</p>
                )}
                {user?.projectBio && (
                  <p className="text-text-muted text-xs mt-1 line-clamp-2">{user.projectBio}</p>
                )}
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {user?.stage && (
                    <span className={`badge border text-xs ${stageColor}`}>{user.stage}</span>
                  )}
                  {(user?.tags || []).slice(0, 2).map((tag) => (
                    <span key={tag} className="badge bg-blue-electric/10 text-blue-electric border border-blue-electric/20 font-mono text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border-subtle space-y-3">
                {[
                  { icon: <Globe size={14} />, label: 'Connections', val: user?.stats?.totalConnections || 0 },
                  { icon: <Bookmark size={14} />, label: 'Saved', val: user?.stats?.savedContacts || 0 },
                  { icon: <Clock size={14} />, label: 'Minutes', val: user?.stats?.totalMinutes || 0 },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-text-secondary">{s.icon}{s.label}</span>
                    <span className="font-semibold text-text-primary">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Center — Connect button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 flex flex-col items-center justify-start gap-6"
          >
            {/* Online count */}
            <div className="flex items-center gap-2 text-sm">
              <span className="status-dot-online" />
              <span className="text-text-secondary">
                <span className="font-semibold text-text-primary">{onlineCount}</span> founders online right now
              </span>
            </div>

            {/* Main CTA */}
            <motion.button
              onClick={handleConnect}
              disabled={!connected}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="relative w-64 h-64 rounded-full bg-blue-electric/10 border-2 border-blue-electric/30
                         hover:border-blue-electric hover:bg-blue-electric/20 hover:shadow-glow-blue
                         transition-all duration-300 flex flex-col items-center justify-center gap-3
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {/* Pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-electric/20"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Zap size={48} className="text-blue-electric" fill="currentColor" />
              <span className="text-xl font-bold text-text-primary">Connect</span>
              <span className="text-text-secondary text-sm">Meet a founder now</span>
            </motion.button>

            {!connected && (
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <Spinner size={16} />
                Connecting to server...
              </div>
            )}

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary
                         transition-colors text-sm font-medium"
            >
              <Filter size={16} />
              {showFilters ? 'Hide filters' : 'Add filters (optional)'}
            </button>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full card p-5 space-y-4"
              >
                <p className="text-text-muted text-xs">
                  Filters reduce the pool of potential matches. Leave empty for fastest pairing.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Role</label>
                    <select className="input-base text-sm" value={filters.role}
                      onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}>
                      <option value="">Any role</option>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Stage</label>
                    <select className="input-base text-sm" value={filters.stage}
                      onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))}>
                      <option value="">Any stage</option>
                      {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Language</label>
                  <select className="input-base text-sm" value={filters.language}
                    onChange={e => setFilters(f => ({ ...f, language: e.target.value }))}>
                    <option value="">Any language</option>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Interests</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TAGS.map((tag) => {
                      const selected = filters.tags.includes(tag);
                      return (
                        <button key={tag} onClick={() => toggleTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all
                                     ${selected ? 'border-blue-electric bg-blue-electric/10 text-blue-electric'
                                       : 'border-border-subtle text-text-secondary hover:border-border'}`}>
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-text-muted hover:text-text-secondary text-xs transition-colors">
                  Clear filters
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Right sidebar — Recent contacts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="card p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bookmark size={16} className="text-blue-electric" />
                  Recent contacts
                </h3>
              </div>

              {loadingContacts ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-text-muted text-sm">No saved contacts yet.</div>
                  <div className="text-text-muted text-xs mt-1">Save founders after calls.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map(c => (
                    <FounderCard key={c._id} founder={c.peer} compact />
                  ))}
                  <a href="/connections" className="block text-center text-blue-electric text-xs hover:underline mt-2">
                    View all →
                  </a>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
