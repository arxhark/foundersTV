import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Linkedin, Github, Twitter, Globe, BadgeCheck, UserPlus, Check, ArrowLeft, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userApi, connectionApi } from '../services/api';
import { STAGE_COLORS } from '../utils/constants';
import Spinner from '../components/ui/Spinner';

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectState, setConnectState] = useState('idle'); // idle | saving | saved | mutual

  useEffect(() => {
    setLoading(true);
    userApi.getPublicProfile(id)
      .then(({ data }) => setProfile(data))
      .catch(() => setError('Profile not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConnect = async () => {
    setConnectState('saving');
    try {
      const { data } = await connectionApi.save(id);
      setConnectState(data.mutual ? 'mutual' : 'saved');
    } catch {
      setConnectState('idle');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><Spinner size={28} /></div>;
  }
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-text-secondary">{error || 'Profile not found'}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary text-sm">Go back</button>
      </div>
    );
  }

  const isSelf = user?._id === profile._id;
  const stageColor = STAGE_COLORS[profile.stage] || '';
  const links = [
    { url: profile.linkedin, icon: Linkedin },
    { url: profile.github, icon: Github },
    { url: profile.twitter, icon: Twitter },
    { url: profile.website, icon: Globe },
  ].filter((l) => l.url);

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-12 px-4">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-8">
          <div className="flex items-start gap-5">
            {profile.photo ? (
              <img src={profile.photo} alt={profile.name} className="w-24 h-24 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-electric/15 border-2 border-border flex items-center justify-center">
                <User size={36} className="text-blue-electric" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold truncate">{profile.name}</h1>
                {profile.isVerified && <BadgeCheck size={20} className="text-blue-electric" />}
              </div>
              {profile.title && <p className="text-text-secondary mt-0.5">{profile.title}</p>}
              <div className="flex items-center gap-3 mt-2 text-text-muted text-sm">
                {profile.country && <span>{profile.country}</span>}
                <span className="flex items-center gap-1"><Zap size={13} className="text-blue-electric" />{profile.sessionsCount || 0} connections</span>
              </div>
            </div>
          </div>

          {profile.projectBio && (
            <p className="text-text-primary mt-5 leading-relaxed">{profile.projectBio}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {profile.stage && <span className={`badge border ${stageColor}`}>{profile.stage}</span>}
            {(profile.tags || []).map((tag) => (
              <span key={tag} className="badge bg-blue-electric/10 text-blue-electric border border-blue-electric/20 font-mono">#{tag}</span>
            ))}
          </div>

          {profile.lookingFor?.length > 0 && (
            <p className="text-text-muted text-sm mt-4">
              Looking for: <span className="text-green-connected">{profile.lookingFor.join(', ')}</span>
            </p>
          )}

          {links.length > 0 && (
            <div className="flex gap-3 mt-5">
              {links.map(({ url, icon: Icon }, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl border border-border-subtle flex items-center justify-center text-text-secondary hover:text-blue-electric hover:border-blue-electric/40 transition-all">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          )}

          {!isSelf && (
            <button onClick={handleConnect} disabled={connectState !== 'idle'}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
              {connectState === 'saving' && <Spinner size={18} />}
              {connectState === 'idle' && <><UserPlus size={18} /> Connect</>}
              {connectState === 'saved' && <><Check size={18} /> Request sent</>}
              {connectState === 'mutual' && <><Check size={18} /> Connected!</>}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
