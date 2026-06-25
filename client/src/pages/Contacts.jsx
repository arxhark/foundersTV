import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Trash2, Search, Linkedin, Calendar } from 'lucide-react';
import { userApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { STAGE_COLORS } from '../utils/constants';
import Spinner from '../components/ui/Spinner';

export default function Contacts() {
  const { updateUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    userApi.getContacts()
      .then(({ data }) => setContacts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (connectionId) => {
    setDeleting(connectionId);
    try {
      await userApi.deleteContact(connectionId);
      setContacts(prev => prev.filter(c => c._id !== connectionId));
      updateUser(u => ({ ...u, stats: { ...u.stats, savedContacts: Math.max(0, u.stats.savedContacts - 1) } }));
    } catch {
      // fail silently
    } finally {
      setDeleting(null);
    }
  };

  const filtered = contacts.filter(c => {
    const f = c.savedUserId;
    if (!f) return false;
    const q = search.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.startup?.toLowerCase().includes(q) ||
      f.sector?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Bookmark size={28} className="text-blue-electric" />
                My Contacts
              </h1>
              <p className="text-text-secondary mt-1">{contacts.length} founders saved</p>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                className="input-base pl-9 w-56 text-sm"
                placeholder="Search by name or sector..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size={32} /></div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <Bookmark size={40} className="text-text-muted mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                {search ? 'No results found' : 'No contacts yet'}
              </h3>
              <p className="text-text-secondary text-sm">
                {search ? 'Try a different search term.' : 'Save founders during video calls to build your network.'}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((c, i) => {
                const f = c.savedUserId;
                if (!f) return null;
                const stageColor = STAGE_COLORS[f.stage] || '';

                return (
                  <motion.div
                    key={c._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card p-5 hover:border-border transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {f.photo ? (
                        <img src={f.photo} alt={f.name}
                          className="w-12 h-12 rounded-full object-cover border border-border-subtle flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-electric/10 border border-border-subtle
                                        flex items-center justify-center flex-shrink-0 text-blue-electric font-bold">
                          {f.name?.[0]}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold truncate">{f.name}</h3>
                          <div className="flex items-center gap-1.5 ml-2">
                            {f.linkedin && (
                              <a href={f.linkedin} target="_blank" rel="noopener noreferrer"
                                className="text-text-muted hover:text-blue-electric transition-colors">
                                <Linkedin size={16} />
                              </a>
                            )}
                            <button
                              onClick={() => handleDelete(c._id)}
                              disabled={deleting === c._id}
                              className="text-text-muted hover:text-red-disconnect transition-colors p-1"
                            >
                              {deleting === c._id ? <Spinner size={14} /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>

                        {f.startup && (
                          <p className="text-text-secondary text-sm truncate mt-0.5">{f.startup}</p>
                        )}

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {f.stage && <span className={`badge border text-xs ${stageColor}`}>{f.stage}</span>}
                          {f.sector && <span className="badge-sector text-xs">{f.sector}</span>}
                        </div>

                        <div className="flex items-center gap-1 mt-3 text-text-muted text-xs">
                          <Calendar size={11} />
                          {new Date(c.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
