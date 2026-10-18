import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeName =
  | 'obsidian'
  | 'aurora'
  | 'solaris'
  | 'arctic'
  | 'emerald'
  | 'crimson'
  | 'nebula'
  | 'midnight'
  | 'monolith';

interface ThemeMeta {
  name: ThemeName;
  label: string;
  swatch: string[];
}

export const THEMES: ThemeMeta[] = [
  { name: 'obsidian', label: 'Obsidian', swatch: ['#1a1a1a', '#d4a44c', '#c87533'] },
  { name: 'aurora', label: 'Aurora', swatch: ['#0d1b14', '#3ee07f', '#1a8c5e'] },
  { name: 'solaris', label: 'Solaris', swatch: ['#1c1408', '#f5a623', '#e8741e'] },
  { name: 'arctic', label: 'Arctic', swatch: ['#0a1620', '#5bc0eb', '#2d8ab5'] },
  { name: 'emerald', label: 'Emerald', swatch: ['#0a1f15', '#10b981', '#059669'] },
  { name: 'crimson', label: 'Crimson', swatch: ['#1c0a0a', '#e74c3c', '#c0392b'] },
  { name: 'nebula', label: 'Nebula', swatch: ['#13091f', '#8b5cf6', '#6d28d9'] },
  { name: 'midnight', label: 'Midnight Ocean', swatch: ['#08101f', '#0ea5e9', '#0369a1'] },
  { name: 'monolith', label: 'Monolith', swatch: ['#111111', '#888888', '#555555'] },
];

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('RAW 2.0-theme') as ThemeName | null;
    return saved ?? 'obsidian';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('RAW 2.0-theme', theme);
  }, [theme]);

  function setTheme(t: ThemeName) {
    setThemeState(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
