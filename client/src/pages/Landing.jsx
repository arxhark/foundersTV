import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Zap, Globe, Shield, ArrowRight, Users, Video, Bookmark } from 'lucide-react';
import { userApi } from '../services/api';
import { useSocket } from '../context/SocketContext';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } }),
};

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Founder @ NexaHealth',
    photo: 'https://i.pravatar.cc/80?img=47',
    text: 'Met my technical co-founder on FoundersTV in my first session. We closed our pre-seed 3 months later.',
  },
  {
    name: 'Marcus Silva',
    role: 'CEO @ Fintract',
    photo: 'https://i.pravatar.cc/80?img=11',
    text: 'Way better than conferences. Real conversations with real builders. Absolutely no fluff.',
  },
  {
    name: 'Amina Osei',
    role: 'Founder @ EduLoop',
    photo: 'https://i.pravatar.cc/80?img=29',
    text: 'Found two amazing angel investors in my first week. This platform just works.',
  },
];

const STEPS = [
  {
    icon: <Video size={24} className="text-blue-electric" />,
    title: 'Enter',
    desc: 'Log in with Google in one click. No forms, no friction.',
  },
  {
    icon: <Zap size={24} className="text-blue-electric" />,
    title: 'Connect',
    desc: 'Hit the button. In seconds you\'re live with another founder.',
  },
  {
    icon: <Users size={24} className="text-blue-electric" />,
    title: 'Grow',
    desc: 'Save contacts, exchange ideas, find your next opportunity.',
  },
];

export default function Landing() {
  const { onlineCount } = useSocket();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (onlineCount > 0) {
      setCount(onlineCount);
      return;
    }
    userApi.getOnlineCount().then(({ data }) => setCount(data.count)).catch(() => {});
  }, [onlineCount]);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center overflow-hidden pt-16">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
                          bg-blue-electric/5 rounded-full blur-3xl" />
        </div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <div className="inline-flex items-center gap-2 bg-blue-electric/10 border border-blue-electric/20
                          rounded-full px-4 py-1.5 text-sm font-medium text-blue-electric mb-8">
            <span className="status-dot-online" />
            {count > 0 ? `${count} founders online now` : 'Join thousands of founders'}
          </div>
        </motion.div>

        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="text-5xl md:text-7xl font-extrabold leading-tight max-w-4xl"
        >
          Meet your next{' '}
          <span className="text-blue-electric">co-founder.</span>
          <br />Right now.
        </motion.h1>

        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={2}
          className="mt-6 text-xl text-text-secondary max-w-2xl"
        >
          Random video calls exclusively for entrepreneurs. No algorithms, no feeds,
          no noise. Just real conversations between people building something.
        </motion.p>

        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={3}
          className="mt-10 flex flex-col sm:flex-row gap-4 items-center"
        >
          <Link to="/auth" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
            Start Connecting <ArrowRight size={20} />
          </Link>
          <a href="#how" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">
            See how it works →
          </a>
        </motion.div>

        {/* Social proof numbers */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={4}
          className="mt-16 grid grid-cols-3 gap-8 text-center"
        >
          {[['10K+', 'Founders'], ['50K+', 'Connections'], ['120+', 'Countries']].map(([num, label]) => (
            <div key={label}>
              <div className="text-3xl font-bold text-white">{num}</div>
              <div className="text-text-muted text-sm mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold">How it works</h2>
            <p className="text-text-secondary mt-4 text-lg">Three steps, zero friction.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="card p-8 text-center hover:border-blue-electric/30 transition-colors duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-electric/10 flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <div className="text-4xl font-black text-blue-electric/20 mb-3">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="font-semibold text-xl mb-2">{step.title}</h3>
                <p className="text-text-secondary text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-t border-border-subtle">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Globe size={20} />, title: 'Global Reach', desc: 'Connect with founders from 120+ countries in seconds.' },
              { icon: <Shield size={20} />, title: 'Founders Only', desc: 'Every user has an active startup or idea. No spectators.' },
              { icon: <Bookmark size={20} />, title: 'Save Contacts', desc: 'Keep the connections that matter. Build your network.' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="flex gap-4 p-6 card hover:border-border transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-electric/10 flex items-center justify-center flex-shrink-0 text-blue-electric">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-text-secondary text-sm">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-16"
          >
            What founders say
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="card p-6"
              >
                <p className="text-text-secondary text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-text-muted text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 border-t border-border-subtle">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-5xl font-extrabold mb-6">Your next opportunity<br />is one click away.</h2>
          <Link to="/auth" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
            Start for free <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-blue-electric">▶</span>
            <span className="font-bold">FoundersTV</span>
          </div>
          <div className="text-text-muted text-sm">© 2025 FoundersTV. Built for builders.</div>
          <div className="flex gap-6 text-text-muted text-sm">
            <a href="#" className="hover:text-text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-text-primary transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
