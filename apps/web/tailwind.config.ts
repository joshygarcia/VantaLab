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
        brass: {
          300: '#e3cc9d',
          400: '#caa76a'
        }
      },
      boxShadow: {
        panel: '0 24px 48px -12px rgba(0, 0, 0, 1)'
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
