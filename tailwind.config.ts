import type { Config } from "tailwindcss";
import daisyui from "daisyui";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        jewellz: {
          primary: "#0E4B74",
          accent: "#F4B400",
          neutral: "#F5F8FA",
          dark: "#1A1A1A"
        }
      }
    }
  },
  plugins: [daisyui],
  daisyui: {
    themes: [{
      jewellz: {
        primary: "#DE141C", "primary-content": "#FFFFFF",
        secondary: "#334155", "secondary-content": "#FFFFFF",
        accent: "#DE141C", "accent-content": "#FFFFFF",
        neutral: "#1F2937", "neutral-content": "#FFFFFF",
        "base-100": "#FFFFFF", "base-200": "#F5F6F7", "base-300": "#E5E7EB", "base-content": "#111827",
        info: "#2563EB", "info-content": "#FFFFFF",
        success: "#15803D", "success-content": "#FFFFFF",
        warning: "#B45309", "warning-content": "#FFFFFF",
        error: "#B91C1C", "error-content": "#FFFFFF",
        "--rounded-box": "0.75rem", "--rounded-btn": "0.5rem", "--rounded-badge": "1rem",
        "--animation-btn": "0"
      }
    }],
    logs: false
  },
};

export default config;
