import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { darkColors, lightColors } from "../components/colors";

export type ThemeMode = "light" | "dark";

export type ThemeColors = typeof lightColors;

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: React.Dispatch<React.SetStateAction<ThemeMode>>;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  const toggle = useCallback(() => {
    setMode((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const colors = mode === "light" ? lightColors : darkColors;

  const value = useMemo(
    () => ({ mode, colors, setMode, toggle }),
    [mode, colors, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
