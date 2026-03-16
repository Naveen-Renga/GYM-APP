/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00F5A0',
        accent: '#7C3AED',
        dark: {
          900: '#070710',
          800: '#0D0D1A',
          700: '#12121F',
          600: '#1A1A2E',
          500: '#252540',
        },
        neon: {
          green: '#00F5A0',
          purple: '#7C3AED',
          blue: '#3B82F6',
          pink: '#EC4899',
          gold: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,245,160,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0,245,160,0.6)' },
        }
      },
      boxShadow: {
        'glow-green': '0 0 30px rgba(0, 245, 160, 0.3)',
        'glow-purple': '0 0 30px rgba(124, 58, 237, 0.3)',
        'glow-blue': '0 0 30px rgba(59, 130, 246, 0.3)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
