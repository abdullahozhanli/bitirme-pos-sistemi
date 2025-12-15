// modern, yüksek kontrastlı tema

import { createTheme } from '@mui/material/styles';

const palette = {
  primary: { main: '#121212' },          // siyah (DÜZENLE, DETAY GÖR)
  secondary: { main: '#0E7C66' },        // opsiyonel vurgu
  error: { main: '#D32F2F' },            // kırmızı (SİL, İPTAL ET)
  warning: { main: '#F79009' },
  info: { main: '#2E90FA' },
  success: { main: '#1B873F' },          // yeşil (EKLE, HAZIR YAP, ÖDENDİ YAP)
  text: { primary: '#1A1A1A', secondary: '#5A5A5A' },
  background: { default: '#FFFFFF', paper: '#FFFFFF' } // beyaz
};

export const theme = createTheme({
  palette,
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial',
    h5: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.2 }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          paddingInline: 16,
          paddingBlock: 10,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        // DÜZENLE / DETAY GÖR (Siyah)
        containedPrimary: {
          backgroundColor: '#121212 !important',
          color: '#FFFFFF !important',
          '&:hover': { 
            backgroundColor: '#2A2A2A !important',
          },
        },
        // EKLE / HAZIR YAP / ÖDENDİ YAP (Yeşil)
        containedSuccess: {
          backgroundColor: '#1B873F',
          color: '#FFFFFF',
          '&:hover': { backgroundColor: '#157634' },
        },
        // SİL / İPTAL ET (Kırmızı)
        containedError: {
          backgroundColor: '#D32F2F',
          color: '#FFFFFF',
          '&:hover': { backgroundColor: '#B71C1C' },
        },
        // HAZIR YAP → beyaz zeminli yeşil çerçeve
        outlinedSuccess: {
          backgroundColor: '#FFFFFF',
          color: '#1B873F',
          border: '2px solid #1B873F',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: '#E6F4EA',
            borderColor: '#157634',
          },
          '&:active': {
            backgroundColor: '#DDEEDC',
            borderColor: '#0F5C2A',
          },
        },
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 9999, paddingInline: 4 }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: { background: 'transparent', color: palette.text.primary, boxShadow: 'none' }
      }
    },
    MuiDrawer: { styleOverrides: { paper: { borderRight: '0', paddingTop: 8 } } },
    MuiPaper: { styleOverrides: { root: { boxShadow: '0 4px 24px rgba(0,0,0,0.05)' } } },
  }
});


