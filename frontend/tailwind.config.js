/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme palette
        bg: {
          base:    '#0a0a0f',
          subtle:  '#111118',
          muted:   '#16161f',
          overlay: '#1c1c27',
        },
        border: {
          DEFAULT: '#252535',
          muted:   '#1e1e2e',
          accent:  '#3d3d5c',
        },
        text: {
          primary:   '#e8e8f0',
          secondary: '#9898b8',
          muted:     '#5a5a7a',
        },
        brand: {
          DEFAULT: '#7c6af7',
          light:   '#9d8fff',
          dark:    '#5b4dd9',
          glow:    'rgba(124, 106, 247, 0.3)',
        },
        success: '#22d3a5',
        warning: '#f59e0b',
        danger:  '#f04f5e',
        info:    '#38bdf8',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        modal: '0 25px 50px rgba(0,0,0,0.7)',
        glow:  '0 0 20px rgba(124, 106, 247, 0.25)',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        shimmer:       'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:    { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        slideRight: { '0%': { transform: 'translateX(-8px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
        shimmer:    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
