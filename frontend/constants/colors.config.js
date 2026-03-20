const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex) => {
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

const withAlpha = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const CORE_COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  danger: '#FF3B30',
  warning: '#FF9F0A',
  warningText: '#FFB25C',
  dangerText: '#FF6B62',
  switchTrackOff: '#6B7280',
  switchThumb: '#F4F3F4',
};

const ACCENT_COLORS = {
  spotify: '#22C55E',
  classic: '#3B82F6',
  sunset: '#F97316',
  teal: '#14B8A6',
  purple: '#8B5CF6',
};

const BASE_THEMES = {
  dark: {
    background: '#070B14',
    surface: '#111827',
    subSurface: '#192234',
    overlay: withAlpha(CORE_COLORS.white, 0.06),
    text: '#EEF4FF',
    textMuted: '#9BA8C2',
    border: withAlpha(CORE_COLORS.white, 0.12),
  },
  light: {
    background: '#F4F7FC',
    surface: '#FFFFFF',
    subSurface: '#EAF0FB',
    overlay: withAlpha(CORE_COLORS.black, 0.03),
    text: '#111827',
    textMuted: '#6B7280',
    border: withAlpha('#111827', 0.10),
  },
};

const getThemeColors = (theme, accent) => {
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
    modalBorder: isDark ? withAlpha(CORE_COLORS.white, 0.12) : withAlpha('#111827', 0.14),
    modalCancelBackground: isDark ? withAlpha(CORE_COLORS.white, 0.06) : withAlpha('#111827', 0.06),
    modalShadow: isDark ? CORE_COLORS.black : '#1F2937',
    listRowBorder: isDark ? withAlpha(CORE_COLORS.white, 0.05) : withAlpha('#111827', 0.08),
    iconBackground: isDark ? withAlpha(CORE_COLORS.white, 0.08) : withAlpha('#111827', 0.07),
    iconButtonBackground: isDark ? withAlpha(CORE_COLORS.white, 0.04) : withAlpha('#111827', 0.04),
    iconButtonBorder: isDark ? withAlpha(CORE_COLORS.white, 0.14) : withAlpha('#111827', 0.14),
    artworkBackground: isDark ? withAlpha(CORE_COLORS.white, 0.03) : withAlpha('#111827', 0.03),
    likeButtonBackground: isDark ? withAlpha(CORE_COLORS.white, 0.04) : withAlpha('#111827', 0.05),
    mutedText: isDark ? withAlpha(CORE_COLORS.white, 0.62) : withAlpha('#111827', 0.62),
    mutedIcon: isDark ? withAlpha(CORE_COLORS.white, 0.55) : withAlpha('#111827', 0.60),
    sliderTrack: isDark ? withAlpha(CORE_COLORS.white, 0.20) : withAlpha('#111827', 0.20),
    mainControlBackground: isDark ? withAlpha(CORE_COLORS.white, 0.06) : withAlpha('#111827', 0.06),
    mainControlBorder: isDark ? withAlpha(CORE_COLORS.white, 0.14) : withAlpha('#111827', 0.16),
    queueCardBackground: isDark ? withAlpha(CORE_COLORS.white, 0.03) : withAlpha('#111827', 0.03),
    queueCardBorder: isDark ? withAlpha(CORE_COLORS.white, 0.14) : withAlpha('#111827', 0.14),
    accentSurface: withAlpha(accent, isDark ? 0.20 : 0.16),
    accentSurfaceStrong: withAlpha(accent, 0.20),
    accentBorder: withAlpha(accent, 0.50),
    activeRowBackground: isDark ? withAlpha(CORE_COLORS.white, 0.08) : withAlpha(accent, 0.12),
    activeOverlay: isDark ? withAlpha(CORE_COLORS.black, 0.30) : withAlpha(CORE_COLORS.white, 0.35),
    selectionOverlay: isDark ? withAlpha(CORE_COLORS.black, 0.40) : withAlpha('#111827', 0.18),
    floatingBackground: isDark ? base.surface : withAlpha(CORE_COLORS.white, 0.96),
    floatingBorder: isDark ? withAlpha(CORE_COLORS.white, 0.10) : withAlpha('#111827', 0.12),
    floatingShadow: isDark ? CORE_COLORS.black : '#1F2937',
    progressTrack: isDark ? withAlpha(CORE_COLORS.white, 0.10) : withAlpha('#111827', 0.12),
    tabBarBackground: base.surface,
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
    onAccent: isDark ? CORE_COLORS.white : '#111827',
    onDanger: CORE_COLORS.white,
    switchTrackOff: CORE_COLORS.switchTrackOff,
    switchThumb: CORE_COLORS.switchThumb,
  };
};

module.exports = {
  ACCENT_COLORS,
  getThemeColors,
};
