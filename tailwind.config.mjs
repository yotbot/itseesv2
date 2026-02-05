/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Near black foreground
        'itsees-dark': '#1a1a1a',
        // Beige white background (warm cream)
        'itsees-bg': '#f5efe5',
        // Dot colors - vibrant but still WCAG AA with dark text
        'itsees-green': '#5a9a3e',
        'itsees-orange': '#e08840',
        // Legacy blue (keeping for compatibility)
        'itsees-blue': '#3b82f6',
        'itsees-blue-light': '#60a5fa',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
