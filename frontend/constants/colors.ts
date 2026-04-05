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
    lightBG: '#F8FAFC',
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
    jasmin: '#EAB308',
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
        subSurface: '#F1F5F9',
        overlay: withAlpha(CORE_COLORS.black, 0.04),
        text: CORE_COLORS.lightText,
        textMuted: CORE_COLORS.lightTextMuted,
        border: withAlpha(CORE_COLORS.lightText, 0.12),
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
        cardBackground: isDark ? withAlpha(CORE_COLORS.white, 0.06) : '#FFFFFF',
        cardBackgroundStrong: isDark ? withAlpha(CORE_COLORS.white, 0.12) : withAlpha('#111827', 0.06),
        cardBackgroundSubtle: isDark ? withAlpha(CORE_COLORS.white, 0.04) : withAlpha('#111827', 0.04),
        cardBorder: isDark ? withAlpha(CORE_COLORS.white, 0.14) : withAlpha('#E2E8F0', 0.60),
        modalOverlay: isDark ? withAlpha('#020617', 0.70) : withAlpha('#0F172A', 0.40),
        modalBorder: isDark ? withAlpha(CORE_COLORS.white, 0.14) : withAlpha('#E2E8F0', 0.60),
        modalCancelBackground: isDark ? withAlpha(CORE_COLORS.white, 0.08) : withAlpha('#F1F5F9', 0.80),
        modalShadow: isDark ? '#000000' : 'rgba(0,0,0,0.08)',
        listRowBorder: isDark ? withAlpha(CORE_COLORS.white, 0.06) : withAlpha('#E2E8F0', 0.40),
        iconBackground: isDark ? withAlpha(CORE_COLORS.white, 0.10) : withAlpha('#111827', 0.06),
        iconButtonBackground: isDark ? withAlpha(CORE_COLORS.white, 0.06) : withAlpha('#F1F5F9', 0.60),
        iconButtonBorder: isDark ? withAlpha(CORE_COLORS.white, 0.16) : withAlpha('#E2E8F0', 0.40),
        artworkBackground: isDark ? withAlpha(CORE_COLORS.white, 0.04) : withAlpha('#F1F5F9', 0.60),
        likeButtonBackground: isDark ? withAlpha(CORE_COLORS.white, 0.06) : withAlpha('#FEE2E2', 0.60),
        mutedText: isDark ? withAlpha(CORE_COLORS.white, 0.65) : withAlpha('#111827', 0.60),
        mutedIcon: isDark ? withAlpha(CORE_COLORS.white, 0.55) : withAlpha('#111827', 0.50),
        sliderTrack: isDark ? withAlpha(CORE_COLORS.white, 0.20) : withAlpha('#CBD5E1', 0.80),
        mainControlBackground: isDark ? withAlpha(CORE_COLORS.white, 0.08) : withAlpha('#F1F5F9', 0.60),
        mainControlBorder: isDark ? withAlpha(CORE_COLORS.white, 0.16) : withAlpha('#E2E8F0', 0.60),
        queueCardBackground: isDark ? withAlpha(CORE_COLORS.white, 0.04) : '#FFFFFF',
        queueCardBorder: isDark ? withAlpha(CORE_COLORS.white, 0.14) : withAlpha('#E2E8F0', 0.60),
        accentSurface: withAlpha(accent, isDark ? 0.20 : 0.12),
        accentSurfaceStrong: withAlpha(accent, 0.22),
        accentBorder: withAlpha(accent, 0.45),
        activeRowBackground: isDark ? withAlpha(CORE_COLORS.white, 0.10) : withAlpha(accent, 0.10),
        activeOverlay: isDark ? withAlpha(CORE_COLORS.black, 0.35) : withAlpha(accent, 0.12),
        selectionOverlay: isDark ? withAlpha(CORE_COLORS.black, 0.45) : withAlpha(accent, 0.16),
        floatingBackground: isDark ? base.surface : '#FFFFFF',
        floatingBorder: isDark ? withAlpha(CORE_COLORS.white, 0.12) : withAlpha('#E2E8F0', 0.60),
        floatingShadow: isDark ? '#000000' : 'rgba(0,0,0,0.08)',
        progressTrack: isDark ? withAlpha(CORE_COLORS.white, 0.12) : withAlpha('#CBD5E1', 0.60),
        tabBarBackground: base.surface,
        tabBarShadow: CORE_COLORS.black,
        sectionGlow: withAlpha(accent, 0.12),
        danger: CORE_COLORS.danger,
        dangerSurface: withAlpha(CORE_COLORS.danger, isDark ? 0.15 : 0.10),
        dangerSurfaceStrong: withAlpha(CORE_COLORS.danger, isDark ? 0.25 : 0.08),
        dangerBorder: withAlpha(CORE_COLORS.danger, 0.40),
        dangerDivider: withAlpha(CORE_COLORS.danger, 0.20),
        warning: CORE_COLORS.warning,
        warningSurface: withAlpha(CORE_COLORS.warning, 0.18),
        warningText: CORE_COLORS.warningText,
        dangerText: CORE_COLORS.dangerText,
        onAccent: CORE_COLORS.white,
        onDanger: CORE_COLORS.white,
        switchTrackOff: CORE_COLORS.switchTrackOff,
        switchThumb: CORE_COLORS.switchThumb,
        // Specialized UI Colors
        settingsTeal: '#059669',
        settingsBlue: '#2563EB',
        settingsPurple: '#7C3AED',
        settingsRed: '#DC2626',
        pureBlack: '#000000',
        pureWhite: '#FFFFFF',
        // Preview colors for theme cards
        previewDarkBG: '#1E293B',
        previewLightBG: '#F8FAFC',
        previewDarkSub: '#334155',
        previewLightSub: '#E2E8F0',
        previewDarkText: '#F1F5F9',
        previewLightText: '#0F172A',
        // Accent hex values
        accents: ACCENT_COLORS,
    };
};

export const getThemeColors = (theme: ThemeName, accent: string) => createThemeTokens(theme, accent);

export type ThemeColors = ReturnType<typeof getThemeColors>;

// Default accent
export const DEFAULT_ACCENT = ACCENT_COLORS.teal;
