export const COLORS = {
    // Common Colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',

    // Design System (Dark)
    dark: {
        background: '#070B14',
        surface: '#111827',
        subSurface: '#192234',
        overlay: 'rgba(255,255,255,0.06)',
        text: '#EEF4FF',
        textMuted: '#9BA8C2',
        border: 'rgba(255,255,255,0.12)',
    },

    // Design System (Light)
    light: {
        background: '#F4F7FC',
        surface: '#FFFFFF',
        subSurface: '#EAF0FB',
        overlay: 'rgba(0,0,0,0.03)',
        text: '#111827',
        textMuted: '#6B7280',
        border: 'rgba(17,24,39,0.10)',
    },

    // Accent Options (Used by Theme Engine)
    accents: {
        spotify: '#22C55E',
        classic: '#3B82F6',
        sunset: '#F97316',
        teal: '#14B8A6',
        purple: '#8B5CF6',
    },
};

export type ThemeColors = typeof COLORS.dark;
