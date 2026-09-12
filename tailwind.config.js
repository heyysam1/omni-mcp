/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        obsidian: "#07080B",
        graphite: "#101217",
        surfaceElevated: "#14171E",
        surfaceModal: "#0E1017",
        borderStroke: "#1E222D",
        borderActive: "#2B3140",
        textMuted: "#8A90A2",
        textDim: "#525866",
        emeraldSoft: "#10B981",
        cyanSoft: "#06B6D4",
      },
    },
  },
  plugins: [],
};
