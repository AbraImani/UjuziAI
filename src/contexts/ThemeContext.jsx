import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ujuziai-theme') || 'dark';
    }
    return 'dark';
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', theme);
    localStorage.setItem('ujuziai-theme', theme);

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDark ? '#0e0e0e' : '#ffffff');
    }
  }, [theme, isDark]);

  function toggleTheme() {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function setTheme(newTheme) {
    setThemeState(newTheme);
  }

  const value = { theme, isDark, toggleTheme, setTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
