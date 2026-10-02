// Theme Management for God's Hand International Model School
// Supports Light & Dark modes with brand contrast consistency

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'ghs_portal_theme';

export const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    console.warn('Error reading theme from storage:', e);
  }
  return 'light';
};

export const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update mobile status bar theme-color meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f172a' : '#1e3a8a');
  }

  // Broadcast event for active listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ghs-theme-changed', { detail: { theme } }));
  }
};

export const setTheme = (theme: ThemeMode) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.warn('Error saving theme to storage:', e);
  }
  applyThemeToDocument(theme);
};

export const toggleTheme = (): ThemeMode => {
  const current = getInitialTheme();
  const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
};
