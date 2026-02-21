export const COLORS = {
    // Common Colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',

    // Design System (Dark)
    dark: {
        background: '#08080A',
        surface: '#121217',
        subSurface: '#1A1A22',
        overlay: 'rgba(255,255,255,0.05)',
        text: '#F5F5F7',
        textMuted: '#A1A1AA',
        border: 'rgba(255,255,255,0.08)',
    },

    // Design System (Light)
    light: {
        background: '#F9F9FB',
        surface: '#FFFFFF',
        subSurface: '#F2F2F7',
        overlay: 'rgba(0,0,0,0.03)',
        text: '#000000',
        textMuted: '#636366',
        border: 'rgba(0,0,0,0.08)',
    },

    // Accent Options (Used by Theme Engine)
    accents: {
        spotify: '#1DB954',
        classic: '#007AFF',
        sunset: '#FF5E3A',
        teal: '#00FFCC',
        purple: '#AF52DE',
    },
};

export type ThemeColors = typeof COLORS.dark;
