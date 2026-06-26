import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import { ROLES, STAGES, LOOKING_FOR, TAGS, LANGUAGES } from '../utils/constants';
import { validateProfileForm } from '../utils/validation';
import { Camera, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import Spinner from '../components/ui/Spinner';

const STEPS = ['You', 'Project', 'Goals'];

export default function Onboarding() {
  const { user, fetchMe } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [photoPreview, setPhotoPreview] = useState(user?.photo || null);

  const [form, setForm] = useState({
    name: user?.name || '',
    country: user?.country || '',
    language: user?.language || 'en',
    title: user?.title || '',
    projectBio: user?.projectBio || '',
    role: user?.role || 'founder',
    stage: user?.stage || 'idea',
    tags: user?.tags || [],
    lookingFor: user?.lookingFor || [],
    linkedin: user?.linkedin || '',
    github: user?.github || '',
    twitter: user?.twitter || '',
    website: user?.website || '',
    photo: null,
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm((f) => ({ ...f, photo: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const toggleArray = (key, val, max) => {
    setForm((f) => {
      const has = f[key].includes(val);
      if (!has && max && f[key].length >= max) return f; // respect cap
      return { ...f, [key]: has ? f[key].filter((v) => v !== val) : [...f[key], val] };
    });
  };

  const handleSubmit = async () => {
    const validationErrors = validateProfileForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setStep(0); // jump back to surface the first error
      return;
    }

    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'tags' || k === 'lookingFor') v.forEach((item) => fd.append(k, item));
        else if (k === 'photo' && v) fd.append('photo', v);
        else if (v !== null && v !== '') fd.append(k, v);
      });
      await userApi.updateProfile(fd);
      await fetchMe();
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.fields) setErrors(err.response.data.fields);
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.name.trim().length >= 2 && form.country && form.language;
    if (step === 1) return form.projectBio.trim() && form.role && form.stage;
    return form.lookingFor.length > 0;
  };

  const next = () => (step < 2 ? setStep((s) => s + 1) : handleSubmit());
  const back = () => setStep((s) => s - 1);

  const Err = ({ name }) => errors[name]
    ? <p className="text-red-400 text-xs mt-1">{errors[name]}</p> : null;

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
              <span className={`text-sm font-medium ${i === step ? 'text-text-primary' : 'text-text-muted'}`}>{s}</span>
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
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Your profile</h2>
                  <p className="text-text-secondary text-sm mt-1">How other founders will know you.</p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-border
                               hover:border-blue-electric transition-all"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-bg-card flex items-center justify-center">
                        <Camera size={24} className="text-text-muted" />
                      </div>
                    )}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Full name *</label>
                  <input className="input-base" value={form.name} onChange={set('name')} placeholder="Alex Johnson" />
                  <Err name="name" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Title <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <input className="input-base" value={form.title} onChange={set('title')}
                    placeholder="Co-founder @ BuildFast" maxLength={80} />
                  <Err name="title" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Country *</label>
                    <input className="input-base" value={form.country} onChange={set('country')} placeholder="Spain" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Language *</label>
                    <select className="input-base" value={form.language} onChange={set('language')}>
                      {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Your project</h2>
                  <p className="text-text-secondary text-sm mt-1">What are you building?</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    One-liner * <span className="text-text-muted font-normal">{form.projectBio.length}/140</span>
                  </label>
                  <input className="input-base" value={form.projectBio} onChange={set('projectBio')}
                    maxLength={140} placeholder="AI-powered legal docs for SMBs" />
                  <Err name="projectBio" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Your role *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => (
                      <button key={r.value} onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                        className={`py-2 px-2 rounded-xl text-sm font-medium border transition-all
                                   ${form.role === r.value
                                     ? 'border-blue-electric bg-blue-electric/10 text-blue-electric'
                                     : 'border-border-subtle text-text-secondary hover:border-border'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Stage *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STAGES.map((s) => (
                      <button key={s.value} onClick={() => setForm((f) => ({ ...f, stage: s.value }))}
                        className={`py-2 px-2 rounded-xl text-sm font-medium border transition-all
                                   ${form.stage === s.value
                                     ? 'border-blue-electric bg-blue-electric/10 text-blue-electric'
                                     : 'border-border-subtle text-text-secondary hover:border-border'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Interests <span className="text-text-muted font-normal">({form.tags.length}/5)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TAGS.map((tag) => {
                      const selected = form.tags.includes(tag);
                      const disabled = !selected && form.tags.length >= 5;
                      return (
                        <button key={tag} onClick={() => toggleArray('tags', tag, 5)} disabled={disabled}
                          className={`px-3 py-1.5 rounded-lg text-sm font-mono border transition-all
                                     ${selected
                                       ? 'border-blue-electric bg-blue-electric/10 text-blue-electric'
                                       : disabled
                                       ? 'border-border-subtle text-text-muted opacity-40 cursor-not-allowed'
                                       : 'border-border-subtle text-text-secondary hover:border-border'}`}>
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                  <Err name="tags" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Goals & links</h2>
                  <p className="text-text-secondary text-sm mt-1">What are you looking for?</p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {LOOKING_FOR.map((lf) => {
                    const selected = form.lookingFor.includes(lf.value);
                    return (
                      <button key={lf.value} onClick={() => toggleArray('lookingFor', lf.value)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all
                                   ${selected
                                     ? 'border-blue-electric bg-blue-electric/10 text-text-primary'
                                     : 'border-border-subtle text-text-secondary hover:border-border'}`}>
                        <span className="font-medium">{lf.label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                                        ${selected ? 'border-blue-electric bg-blue-electric' : 'border-border'}`}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-text-secondary">Links <span className="text-text-muted font-normal">(optional)</span></p>
                  {[
                    ['linkedin', 'https://linkedin.com/in/…'],
                    ['github', 'https://github.com/…'],
                    ['twitter', 'https://x.com/…'],
                    ['website', 'https://…'],
                  ].map(([key, ph]) => (
                    <div key={key}>
                      <input className="input-base text-sm" value={form[key]} onChange={set(key)} placeholder={ph} />
                      <Err name={key} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 text-red-400 text-sm bg-red-disconnect/10 p-3 rounded-xl border border-red-disconnect/20">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between mt-8">
              <button onClick={back} disabled={step === 0}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors
                           disabled:opacity-0 disabled:pointer-events-none">
                <ChevronLeft size={18} /> Back
              </button>
              <button onClick={next} disabled={!canNext() || loading}
                className="btn-primary flex items-center gap-2 min-w-[120px] justify-center">
                {loading ? <Spinner size={20} /> : step === 2 ? 'Get Started' : <>Next <ChevronRight size={18} /></>}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
