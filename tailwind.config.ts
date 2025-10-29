import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          cherry: "#ed4c4c",
          peach: "#faa09a",
          lightPeach: "#ffd0cd",
          white: "#ffffff"
        }
      },
      fontFamily: {
        sans: ["Figtree", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
