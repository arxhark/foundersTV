import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, PauseCircle, PlayCircle, Globe, Bookmark, Clock, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import { STAGES, SECTORS, LOOKING_FOR, COUNTRIES, STAGE_COLORS } from '../utils/constants';
import Spinner from '../components/ui/Spinner';

export default function Profile() {
  const { user, fetchMe } = useAuth();
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(user?.photo || null);

  const [form, setForm] = useState({
    name: user?.name || '',
    country: user?.country || '',
    startup: user?.startup || '',
    stage: user?.stage || 'idea',
    sector: user?.sector || 'tech',
    looking_for: user?.looking_for || [],
    linkedin: user?.linkedin || '',
    photo: null,
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const toggleLooking = (val) => {
    setForm(f => ({
      ...f,
      looking_for: f.looking_for.includes(val) ? f.looking_for.filter(v => v !== val) : [...f.looking_for, val],
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, photo: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'looking_for') v.forEach(lf => fd.append('looking_for', lf));
        else if (k === 'photo' && v) fd.append('photo', v);
        else if (v) fd.append(k, v);
      });
      await userApi.updateProfile(fd);
      await fetchMe();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseToggle = async () => {
    setPauseLoading(true);
    try {
      await userApi.togglePause();
      await fetchMe();
    } finally {
      setPauseLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">My Profile</h1>

            <button
              onClick={handlePauseToggle}
              disabled={pauseLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium
                          transition-all duration-200
                          ${user?.isPaused
                            ? 'border-green-connected/30 bg-green-connected/10 text-green-connected hover:bg-green-connected/20'
                            : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'}`}
            >
              {pauseLoading ? <Spinner size={16} /> :
                user?.isPaused
                  ? <><PlayCircle size={16} /> Resume matching</>
                  : <><PauseCircle size={16} /> Pause matching</>}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats sidebar */}
            <div className="card p-6 lg:col-span-1 h-fit">
              <h3 className="font-semibold mb-5 text-text-secondary text-sm uppercase tracking-wider">Stats</h3>
              <div className="space-y-5">
                {[
                  { icon: <Zap size={18} className="text-blue-electric" />, label: 'Total connections', val: user?.stats?.totalConnections || 0 },
                  { icon: <Clock size={18} className="text-purple-400" />, label: 'Minutes on calls', val: user?.stats?.totalMinutes || 0 },
                  { icon: <Bookmark size={18} className="text-green-connected" />, label: 'Saved contacts', val: user?.stats?.savedContacts || 0 },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-bg-card border border-border-subtle flex items-center justify-center">
                      {s.icon}
                    </div>
                    <div>
                      <div className="text-xl font-bold">{s.val}</div>
                      <div className="text-text-muted text-xs">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit form */}
            <div className="card p-6 lg:col-span-2 space-y-6">
              {/* Photo */}
              <div className="flex items-center gap-5">
                <button onClick={() => fileRef.current?.click()}
                  className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-border
                             hover:border-blue-electric transition-all">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-bg-card flex items-center justify-center">
                      <Camera size={20} className="text-text-muted" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                                  flex items-center justify-center">
                    <Camera size={18} className="text-white" />
                  </div>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <div>
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-text-secondary text-sm">{user?.email}</p>
                  {user?.stage && (
                    <span className={`badge border text-xs mt-1.5 ${STAGE_COLORS[user.stage]}`}>{user.stage}</span>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Full name</label>
                  <input className="input-base" value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Country</label>
                  <select className="input-base" value={form.country} onChange={set('country')}>
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Startup / idea
                  <span className="text-text-muted ml-2 font-normal">{form.startup.length}/100</span>
                </label>
                <input className="input-base" value={form.startup} onChange={set('startup')} maxLength={100} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Stage</label>
                  <select className="input-base" value={form.stage} onChange={set('stage')}>
                    {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Sector</label>
                  <select className="input-base" value={form.sector} onChange={set('sector')}>
                    {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Looking for</label>
                <div className="flex flex-wrap gap-2">
                  {LOOKING_FOR.map(lf => {
                    const selected = form.looking_for.includes(lf.value);
                    return (
                      <button key={lf.value} onClick={() => toggleLooking(lf.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                                   ${selected
                                     ? 'border-blue-electric bg-blue-electric/10 text-blue-electric'
                                     : 'border-border-subtle text-text-secondary hover:border-border'}`}>
                        {lf.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">LinkedIn URL</label>
                <input className="input-base" value={form.linkedin} onChange={set('linkedin')}
                  placeholder="https://linkedin.com/in/..." />
              </div>

              {error && (
                <div className="bg-red-disconnect/10 border border-red-disconnect/20 text-red-400 p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-connected/10 border border-green-connected/20 text-green-connected p-3 rounded-xl text-sm">
                  Profile updated successfully!
                </div>
              )}

              <button onClick={handleSave} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Spinner size={18} /> : <><Save size={18} /> Save changes</>}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
