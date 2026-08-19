/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        blueprint: "#EEF1F6",
        grid: "#DCE3ED",
        panel: "#FFFFFF",
        hairline: "#D7DEE8",
        ink: "#12203D",
        slate: "#5B6B85",
        indigo: {
          DEFAULT: "#3B4CCA",
          dark: "#2C3AA0",
          light: "#EEF0FD",
        },
        amber: {
          DEFAULT: "#D98C2B",
          light: "#FBF0DF",
        },
        teal: {
          DEFAULT: "#1F9E7A",
          light: "#E3F5EF",
        },
        signal: {
          DEFAULT: "#C4453B",
          light: "#FBEAE9",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        "blueprint-grid":
          "linear-gradient(to right, #DCE3ED 1px, transparent 1px), linear-gradient(to bottom, #DCE3ED 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
    },
  },
  plugins: [],
};
