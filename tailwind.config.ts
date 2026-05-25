import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#A855F7',
          dark: '#7C3AED',
          light: '#C084FC',
        },
        accent: '#D946EF',
      },
    },
  },
  plugins: [],
} satisfies Config;