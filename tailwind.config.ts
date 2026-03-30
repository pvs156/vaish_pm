import type { Config } from "tailwindcss";

// Brand colors are defined via @theme CSS variables in app/globals.css (Tailwind v4 approach).
// Do NOT add theme.extend.colors here — it would conflict with the v4 CSS variable approach.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
