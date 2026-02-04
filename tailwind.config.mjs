/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Near black foreground
        'itsees-dark': 'oklch(0.15 0 0)', // fallback: #1a1a1a
        // Beige white background
        'itsees-bg': 'oklch(0.95 0.04 85)', // fallback: #f5efe5 - warmer beige
        // Dot colors - vibrant but still WCAG AA with dark text
        'itsees-green': 'oklch(0.65 0.2 145)', // vivid army green, fallback: #5a9a3e
        'itsees-orange': 'oklch(0.72 0.18 55)', // vibrant orange, fallback: #e08840
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
