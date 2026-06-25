/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0a',
          secondary: '#111111',
          card: '#141414',
        },
        border: {
          subtle: '#1f1f1f',
          DEFAULT: '#2a2a2a',
        },
        blue: {
          electric: '#3b82f6',
          hover: '#2563eb',
        },
        green: {
          connected: '#22c55e',
        },
        red: {
          disconnect: '#ef4444',
        },
        text: {
          primary: '#f9fafb',
          secondary: '#6b7280',
          muted: '#4b5563',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 10px #3b82f640' },
          to: { boxShadow: '0 0 25px #3b82f680, 0 0 50px #3b82f630' },
        },
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)',
      },
    },
  },
  plugins: [],
};
