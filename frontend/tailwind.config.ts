import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ghost: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          300: "#91a7ff",
          400: "#748ffc",
          500: "#5c7cfa",
          600: "#4c6ef5",
          700: "#4263eb",
          800: "#3b5bdb",
          900: "#364fc7",
          950: "#1a1f3a",
        },
        surface: {
          50: "#f8f9fa",
          100: "#f1f3f5",
          200: "#e9ecef",
          300: "#dee2e6",
          400: "#ced4da",
          500: "#adb5bd",
          600: "#868e96",
          700: "#495057",
          800: "#343a40",
          900: "#212529",
          950: "#0d1117",
        },
        terminal: {
          bg: "#0a0e14",
          fg: "#b3b1ad",
          green: "#7ec699",
          red: "#cc6666",
          yellow: "#f0c674",
          blue: "#81a2be",
          cyan: "#8abeb7",
        },
        matrix: {
          bg: "#0b0f1a",
          card: "#111827",
          border: "#1e293b",
          accent: "#22d3ee",
          green: "#10b981",
          red: "#ef4444",
          yellow: "#f59e0b",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }],
        "xs": ["0.75rem", { lineHeight: "1rem" }],
        "sm": ["0.8125rem", { lineHeight: "1.125rem" }],
        "base": ["0.875rem", { lineHeight: "1.25rem" }],
      },
      spacing: {
        sidebar: "240px",
        "sidebar-collapsed": "56px",
        header: "56px",
        status: "28px",
      },
      gridTemplateColumns: {
        "12": "repeat(12, 1fr)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ticker": "ticker 30s linear infinite",
        "flow": "flow 2s ease-in-out infinite",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        flow: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
