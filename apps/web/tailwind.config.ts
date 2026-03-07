import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#000000',
          900: '#0A0A0A',
          800: '#121212'
        },
        studio: {
          950: '#0B0C10',
          900: '#15171E',
          850: '#1F222C',
          800: '#1A1D27',
          700: '#2A2D3A',
          600: '#3A3F4F',
          cream: '#FFFFFF',
          gold: '#3B82F6'
        },
        brass: {
          300: '#e3cc9d',
          400: '#caa76a'
        }
      },
      boxShadow: {
        panel: '0 24px 48px -12px rgba(0, 0, 0, 1)',
        studio: '0 22px 50px -20px rgba(0, 0, 0, 0.92)',
        'studio-glow': '0 0 0 1px rgba(99, 102, 241, 0.22), 0 26px 64px -24px rgba(0, 0, 0, 0.9)'
      },
      fontFamily: {
        body: ['var(--font-body)', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif']
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        }
      },
      animation: {
        'scroll-fast': 'scroll 30s linear infinite',
        'scroll-slow': 'scroll 40s linear infinite'
      }
    }
  },
  plugins: []
};

export default config;
