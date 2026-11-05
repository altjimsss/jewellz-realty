import type { Config } from "tailwindcss";

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
  plugins: []
};

export default config;
