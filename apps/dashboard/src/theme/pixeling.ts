import { createTheme, alpha } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: Palette['primary'];
  }
  interface PaletteOptions {
    neutral?: PaletteOptions['primary'];
  }
}

export const pixelingTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#8B5CF6',
      light: '#A78BFA',
      dark: '#7C3AED',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
    },
    neutral: {
      main: '#6B7280',
      light: '#9CA3AF',
      dark: '#4B5563',
    },
    background: {
      default: '#F8F9FC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
    },
    divider: '#E5E7EB',
  },
  typography: {
    fontFamily: "'Pretendard', 'Inter', system-ui, -apple-system, sans-serif",
    h1: { fontSize: '24px', fontWeight: 700 },
    h2: { fontSize: '20px', fontWeight: 700 },
    h3: { fontSize: '18px', fontWeight: 600 },
    h4: { fontSize: '16px', fontWeight: 600 },
    h5: { fontSize: '14px', fontWeight: 600 },
    h6: { fontSize: '13px', fontWeight: 600 },
    body1: { fontSize: '14px', fontWeight: 400 },
    body2: { fontSize: '13px', fontWeight: 400 },
    caption: { fontSize: '12px', fontWeight: 400 },
    button: { fontSize: '14px', fontWeight: 500, textTransform: 'none' },
  },
  shape: { borderRadius: 8 },
  spacing: 4,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F8F9FC', color: '#1F2937' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '8px 16px',
          fontWeight: 500,
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': { boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' },
        },
        containedPrimary: {
          backgroundColor: '#3B82F6',
          '&:hover': { backgroundColor: '#2563EB' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid #E5E7EB',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': { borderColor: '#E5E7EB' },
            '&:hover fieldset': { borderColor: '#3B82F6' },
            '&.Mui-focused fieldset': { borderColor: '#3B82F6', borderWidth: '2px' },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: '6px', fontWeight: 500, fontSize: '12px' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '14px',
          minWidth: 'auto',
          padding: '12px 16px',
          '&.Mui-selected': { color: '#3B82F6' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: '3px', borderRadius: '3px 3px 0 0', backgroundColor: '#3B82F6' },
      },
    },
  },
});