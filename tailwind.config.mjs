/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'itsees-dark': '#212121',
        'itsees-bg': 'var(--color-bg)',
        'itsees-bg-card': 'var(--color-bg-card)',
        'itsees-text': 'var(--color-text)',
        'itsees-blue': '#a862fe',
        'itsees-blue-light': '#c49afe',
        'itsees-orange': '#f86e2f',
        'itsees-green': '#a862fe',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
