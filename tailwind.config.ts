// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  darkMode: "media",
  theme: {
    extend: {
      colors: {
        background: {},
        foreground: {},
        accent: {},
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        border: {},
        gray: {},
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { /* from: { opacity: '0' }, to: { opacity: '1' } */ },
        slideUp: { /* from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } */ },
        slideDown: { /* from: { transform: 'translateY(-100%)' }, to: { transform: 'translateY(0)' } */ },
      },
    },
  },
};

export default config;