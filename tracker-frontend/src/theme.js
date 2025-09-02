import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#00bcd4',
            contrastText: '#ffffff',
        },
        secondary: {
            main: 'rgba(81, 255, 0, 0.6)',
            contrastText: '#ffffff',
        },
        background: {
            default: '#1e1e1e', // 页面背景
            paper: '#222222',   // 卡片背景
        },
        text: {
            primary: '#ffffff',
            secondary: 'rgba(255,255,255,0.7)',
        },
        error: {
            main: '#ef5350',
        },
        warning: {
            main: '#ff9800',
        },
        info: {
            main: '#29b6f6',
        },
        success: {
            main: '#4caf50',
        },
    },
    shape: {
        borderRadius: 12,
    },
    typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
        fontFamily: '"Orbitron", "Inter", sans-serif',
        fontWeight: 700,
        letterSpacing: '1px',
    },
    h2: {
        fontFamily: '"Orbitron", "Inter", sans-serif',
        fontWeight: 700,
    },
    h3: {
        fontFamily: '"Orbitron", "Inter", sans-serif',
        fontWeight: 600,
    },
    h4: {
        fontWeight: 600,
    },
    h5: {
        fontWeight: 500,
    },
    h6: {
        fontWeight: 500,
    },
    body1: {
        fontFamily: '"Inter", "Roboto", sans-serif',
    },
    body2: {
        fontFamily: '"Inter", "Roboto", sans-serif',
    },
    button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.5px',
    },
    },
    components: {
        MuiAppBar: {
        styleOverrides: {
            root: {
            backgroundColor: '#1e1e1e',
            },
        },
        },
        MuiCard: {
        styleOverrides: {
            root: {
            backgroundColor: '#1e1e1e',
            border: '1px solid rgba(255,255,255,0.1)',
            },
        },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                borderRadius: 12,
                },
            },
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                backgroundColor: '#00bcd4',
                color: '#fff'
                }
            }
        }
    },
});

export default theme;
