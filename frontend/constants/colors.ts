export type ThemeName = 'light' | 'dark';

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map((char) => char + char).join('')
        : normalized;

    const numeric = parseInt(value, 16);

    return {
        r: clamp((numeric >> 16) & 255),
        g: clamp((numeric >> 8) & 255),
        b: clamp(numeric & 255),
    };
};

export const withAlpha = (hex: string, alpha: number) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const CORE_COLORS = {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    danger: '#FF3B30',
    warning: '#FF9F0A',
    warningText: '#FFB25C',
    dangerText: '#FF6B62',
    switchTrackOff: '#6B7280',
    switchThumb: '#F4F3F4',
    // Theme Bases
    darkBG: '#070B14',
    darkSurface: '#111827',
    darkSubSurface: '#192234',
    darkText: '#EEF4FF',
    darkTextMuted: '#9BA8C2',
    lightBG: '#F4F7FC',
    lightSurface: '#FFFFFF',
    lightText: '#111827',
    lightTextMuted: '#6B7280',
    tealAccent: '#14B8A6',
};

export const ACCENT_COLORS = {
    spotify: '#22C55E',
    classic: '#3B82F6',
    sunset: '#F97316',
    teal: '#14B8A6',
    purple: '#8B5CF6',
} as const;

const BASE_THEMES = {
    dark: {
        background: CORE_COLORS.darkBG,
        surface: CORE_COLORS.darkSurface,
        subSurface: CORE_COLORS.darkSubSurface,
        overlay: withAlpha(CORE_COLORS.white, 0.06),
        text: CORE_COLORS.darkText,
        textMuted: CORE_COLORS.darkTextMuted,
        border: withAlpha(CORE_COLORS.white, 0.12),
    },
    light: {
        background: CORE_COLORS.lightBG,
        surface: CORE_COLORS.lightSurface,
        subSurface: '#EAF0FB', // TODO: Move to CORE_COLORS if shared
        overlay: withAlpha(CORE_COLORS.black, 0.03),
        text: CORE_COLORS.lightText,
        textMuted: CORE_COLORS.lightTextMuted,
        border: withAlpha(CORE_COLORS.lightText, 0.10),
    },
} as const;

const createThemeTokens = (theme: ThemeName, accent: string) => {
    const base = BASE_THEMES[theme];
    const isDark = theme === 'dark';

    return {
        ...base,
        accent,
        transparent: CORE_COLORS.transparent,
        screenBackground: base.background,
        screenSurface: base.surface,
        screenMutedSurface: base.subSurface,
        cardBackground: isDark ? withAlpha(CORE_COLORS.white, 0.05) : withAlpha('#111827', 0.04),
        cardBackgroundStrong: isDark ? withAlpha(CORE_COLORS.white, 0.10) : withAlpha('#111827', 0.07),
        cardBackgroundSubtle: isDark ? withAlpha(CORE_COLORS.white, 0.03) : withAlpha('#111827', 0.03),
        cardBorder: isDark ? withAlpha(CORE_COLORS.white, 0.12) : withAlpha('#111827', 0.12),
        modalOverlay: isDark ? withAlpha('#020617', 0.62) : withAlpha('#0F172A', 0.28),
        modalBorder: isDark ? withAlpha(CORE_COLORS.white, 0.12) : withAlpha(CORE_COLORS.lightText, 0.14),
        modalCancelBackground: isDark ? withAlpha(CORE_COLORS.white, 0.06) : withAlpha(CORE_COLORS.lightText, 0.06),
        modalShadow: isDark ? CORE_COLORS.black : '#1F2937',
        listRowBorder: isDark ? withAlpha(CORE_COLORS.white, 0.05) : withAlpha(CORE_COLORS.lightText, 0.08),
        iconBackground: isDark ? withAlpha(CORE_COLORS.white, 0.08) : withAlpha(CORE_COLORS.lightText, 0.07),
        iconButtonBackground: isDark ? withAlpha(CORE_COLORS.white, 0.04) : withAlpha(CORE_COLORS.lightText, 0.04),
        iconButtonBorder: isDark ? withAlpha(CORE_COLORS.white, 0.14) : withAlpha(CORE_COLORS.lightText, 0.14),
        artworkBackground: isDark ? withAlpha(CORE_COLORS.white, 0.03) : withAlpha(CORE_COLORS.lightText, 0.03),
        likeButtonBackground: isDark ? withAlpha(CORE_COLORS.white, 0.04) : withAlpha(CORE_COLORS.lightText, 0.05),
        mutedText: isDark ? withAlpha(CORE_COLORS.white, 0.62) : withAlpha(CORE_COLORS.lightText, 0.62),
        mutedIcon: isDark ? withAlpha(CORE_COLORS.white, 0.55) : withAlpha(CORE_COLORS.lightText, 0.60),
        sliderTrack: isDark ? withAlpha(CORE_COLORS.white, 0.20) : withAlpha(CORE_COLORS.lightText, 0.20),
        mainControlBackground: isDark ? withAlpha(CORE_COLORS.white, 0.06) : withAlpha(CORE_COLORS.lightText, 0.06),
        mainControlBorder: isDark ? withAlpha(CORE_COLORS.white, 0.14) : withAlpha(CORE_COLORS.lightText, 0.16),
        queueCardBackground: isDark ? withAlpha(CORE_COLORS.white, 0.03) : withAlpha(CORE_COLORS.lightText, 0.03),
        queueCardBorder: isDark ? withAlpha(CORE_COLORS.white, 0.14) : withAlpha(CORE_COLORS.lightText, 0.14),
        accentSurface: withAlpha(accent, isDark ? 0.20 : 0.16),
        accentSurfaceStrong: withAlpha(accent, 0.20),
        accentBorder: withAlpha(accent, 0.50),
        activeRowBackground: isDark ? withAlpha(CORE_COLORS.white, 0.08) : withAlpha(accent, 0.12),
        activeOverlay: isDark ? withAlpha(CORE_COLORS.black, 0.30) : withAlpha(CORE_COLORS.white, 0.35),
        selectionOverlay: isDark ? withAlpha(CORE_COLORS.black, 0.40) : withAlpha(CORE_COLORS.lightText, 0.18),
        floatingBackground: isDark ? base.surface : withAlpha(CORE_COLORS.white, 0.96),
        floatingBorder: isDark ? withAlpha(CORE_COLORS.white, 0.10) : withAlpha(CORE_COLORS.lightText, 0.12),
        floatingShadow: isDark ? CORE_COLORS.black : '#1F2937',
        progressTrack: isDark ? withAlpha(CORE_COLORS.white, 0.10) : withAlpha(CORE_COLORS.lightText, 0.12),
        tabBarBackground: isDark ? base.surface : base.surface,
        tabBarShadow: CORE_COLORS.black,
        sectionGlow: withAlpha(accent, 0.11),
        danger: CORE_COLORS.danger,
        dangerSurface: withAlpha(CORE_COLORS.danger, 0.10),
        dangerSurfaceStrong: withAlpha(CORE_COLORS.danger, 0.07),
        dangerBorder: withAlpha(CORE_COLORS.danger, 0.35),
        dangerDivider: withAlpha(CORE_COLORS.danger, 0.25),
        warning: CORE_COLORS.warning,
        warningSurface: withAlpha(CORE_COLORS.warning, 0.18),
        warningText: CORE_COLORS.warningText,
        dangerText: CORE_COLORS.dangerText,
        onAccent: isDark ? CORE_COLORS.white : CORE_COLORS.lightText,
        onDanger: CORE_COLORS.white,
        switchTrackOff: CORE_COLORS.switchTrackOff,
        switchThumb: CORE_COLORS.switchThumb,
        // Specialized UI Colors - extracted from across the app
        settingsTeal: '#1a7f4b',
        settingsBlue: '#1a5fa8',
        settingsPurple: '#5a3da8',
        settingsRed: '#a83d3d',
        pureBlack: '#000000',
        pureWhite: '#FFFFFF',
        // Preview colors
        previewDarkBG: '#111827',
        previewLightBG: '#F4F7FC',
        previewDarkSub: '#192234',
        previewLightSub: '#e5e7eb',
        previewDarkText: '#EEF4FF',
        previewLightText: '#111827',
        // Accent hex values (for the grid)
        accents: ACCENT_COLORS,
    };
};

export const getThemeColors = (theme: ThemeName, accent: string) => createThemeTokens(theme, accent);

export type ThemeColors = ReturnType<typeof getThemeColors>;
