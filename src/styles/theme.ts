export enum Breakpoint { XS = 'xs', MD = 'md', XL = 'xl' }

const breakpoints = {
  [Breakpoint.XS]: '480px',
  [Breakpoint.MD]: '768px',
  [Breakpoint.XL]: '1200px',
};

interface ThemeColors {
  bg: string; surface: string; surfaceAlt: string; border: string;
  text: string; textMuted: string; textFaint: string;
  accent: string; accentSoft: string; accentText: string; positive: string; negative: string;
}

export interface AppTheme {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  breakpoints: typeof breakpoints;
}

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    bg: '#0a0b0d', surface: '#0f1115', surfaceAlt: '#15181d',
    border: 'rgba(255,255,255,0.07)',
    text: '#e6e8ea', textMuted: '#8b9096', textFaint: 'rgba(255,255,255,0.35)',
    accent: '#fbbf24', accentSoft: 'rgba(251,191,36,0.12)', accentText: '#0a0b0d',
    positive: '#34d399', negative: '#f87171',
  },
  breakpoints,
};

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    bg: '#f7f7f5', surface: '#ffffff', surfaceAlt: '#f0f0ee',
    border: 'rgba(0,0,0,0.08)',
    text: '#1a1c1e', textMuted: '#5b6066', textFaint: 'rgba(0,0,0,0.4)',
    accent: '#d97706', accentSoft: 'rgba(217,119,6,0.12)', accentText: '#1a1c1e',
    positive: '#15803d', negative: '#dc2626',
  },
  breakpoints,
};
