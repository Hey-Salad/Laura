"use client";

import { createContext, useContext, useMemo, useState } from "react";

type ThemeContextValue = {
  isDark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggle: () => {}
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(true);

  const value = useMemo(
    () => ({
      isDark,
      toggle: () => {
        setIsDark((prev) => !prev);
        document.documentElement.classList.toggle("dark");
      }
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className="min-h-screen bg-slate-950 text-slate-100 transition-colors">
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
