import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import { STAGES, SECTORS, LOOKING_FOR, COUNTRIES } from '../utils/constants';
import { Camera, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import Spinner from '../components/ui/Spinner';

const STEPS = ['Profile', 'Startup', 'Goals'];

export default function Onboarding() {
  const { user, fetchMe } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
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

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm((f) => ({ ...f, photo: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const toggleLooking = (val) => {
    setForm((f) => ({
      ...f,
      looking_for: f.looking_for.includes(val)
        ? f.looking_for.filter((v) => v !== val)
        : [...f.looking_for, val],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'looking_for') {
          v.forEach((lf) => fd.append('looking_for', lf));
        } else if (k === 'photo' && v) {
          fd.append('photo', v);
        } else if (v) {
          fd.append(k, v);
        }
      });

      await userApi.updateProfile(fd);
      await fetchMe();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.name.trim() && form.country;
    if (step === 1) return form.startup.trim() && form.stage && form.sector;
    return form.looking_for.length > 0;
  };

  const next = () => step < 2 ? setStep(s => s + 1) : handleSubmit();
  const back = () => setStep(s => s - 1);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                              transition-all duration-300
                              ${i < step ? 'bg-green-connected text-white' :
                                i === step ? 'bg-blue-electric text-white' :
                                'bg-bg-secondary text-text-muted border border-border-subtle'}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-sm font-medium ${i === step ? 'text-text-primary' : 'text-text-muted'}`}>
                {s}
              </span>
              {i < 2 && <div className={`flex-1 h-px ${i < step ? 'bg-green-connected' : 'bg-border-subtle'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="card p-8"
          >
            {/* Step 0: Personal */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Your profile</h2>
                  <p className="text-text-secondary text-sm mt-1">How should other founders know you?</p>
                </div>

                {/* Photo */}
                <div className="flex justify-center">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-border
                               hover:border-blue-electric transition-all duration-200"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-bg-card flex items-center justify-center">
                        <Camera size={24} className="text-text-muted" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                                    transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Full name *</label>
                  <input className="input-base" value={form.name} onChange={set('name')} placeholder="Alex Johnson" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Country *</label>
                  <select className="input-base" value={form.country} onChange={set('country')}>
                    <option value="">Select your country</option>
                    {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">LinkedIn (optional)</label>
                  <input
                    className="input-base"
                    value={form.linkedin}
                    onChange={set('linkedin')}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
            )}

            {/* Step 1: Startup */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Your startup</h2>
                  <p className="text-text-secondary text-sm mt-1">Tell other founders what you're building.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Startup / idea *
                    <span className="text-text-muted ml-2 font-normal">{form.startup.length}/100</span>
                  </label>
                  <input
                    className="input-base"
                    value={form.startup}
                    onChange={set('startup')}
                    maxLength={100}
                    placeholder="AI-powered legal docs for SMBs"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Stage *</label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {STAGES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setForm(f => ({ ...f, stage: s.value }))}
                        className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all duration-150
                                   ${form.stage === s.value
                                     ? 'border-blue-electric bg-blue-electric/10 text-blue-electric'
                                     : 'border-border-subtle text-text-secondary hover:border-border'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Sector *</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SECTORS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setForm(f => ({ ...f, sector: s.value }))}
                        className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all duration-150
                                   ${form.sector === s.value
                                     ? 'border-blue-electric bg-blue-electric/10 text-blue-electric'
                                     : 'border-border-subtle text-text-secondary hover:border-border'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Goals */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">What are you looking for?</h2>
                  <p className="text-text-secondary text-sm mt-1">Select all that apply. You can change this later.</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {LOOKING_FOR.map(lf => {
                    const selected = form.looking_for.includes(lf.value);
                    return (
                      <button
                        key={lf.value}
                        onClick={() => toggleLooking(lf.value)}
                        className={`flex items-center justify-between p-4 rounded-xl border text-left
                                   transition-all duration-150
                                   ${selected
                                     ? 'border-blue-electric bg-blue-electric/10 text-text-primary'
                                     : 'border-border-subtle text-text-secondary hover:border-border hover:text-text-primary'}`}
                      >
                        <span className="font-medium">{lf.label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                        ${selected ? 'border-blue-electric bg-blue-electric' : 'border-border'}`}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 text-red-400 text-sm bg-red-disconnect/10 p-3 rounded-xl border border-red-disconnect/20">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between mt-8">
              <button
                onClick={back}
                disabled={step === 0}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary
                           transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronLeft size={18} /> Back
              </button>

              <button
                onClick={next}
                disabled={!canNext() || loading}
                className="btn-primary flex items-center gap-2 min-w-[120px] justify-center"
              >
                {loading ? <Spinner size={20} /> : step === 2 ? 'Get Started' : <>Next <ChevronRight size={18} /></>}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
