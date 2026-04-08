import { withAlpha } from './colors';

export type SurfaceVariant =
    | 'glass'
    | 'glassStrong'
    | 'solidCard'
    | 'floating'
    | 'danger'
    | 'accentSurface';

export interface SurfaceTokens {
    glass: string;
    glassStrong: string;
    solidCard: string;
    floating: string;
    danger: string;
    accentSurface: string;
    border: string;
    strongBorder: string;
    accentBorder: string;
    dangerBorder: string;
    shadow: string;
}

export interface TypeScale {
    hero: number;
    title: number;
    sectionTitle: number;
    cardTitle: number;
    body: number;
    bodySmall: number;
    label: number;
    caption: number;
    eyebrow: number;
}

export interface MotionTokens {
    pressMs: number;
    feedbackMs: number;
    cardMs: number;
    screenMs: number;
    playerMs: number;
    pressScale: number;
}

export interface ArtworkPalette {
    accent: string;
    halo: string;
    glow: string;
    overlay: string;
}

export interface RadiusTokens {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
}

export interface SpacingTokens {
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    screen: number;
    card: number;
    section: number;
}

export const createSurfaceTokens = (accent: string, isDark: boolean, colors: Record<string, string>): SurfaceTokens => ({
    glass: isDark ? withAlpha('#FFFFFF', 0.07) : withAlpha('#FFFFFF', 0.84),
    glassStrong: isDark ? withAlpha('#FFFFFF', 0.11) : withAlpha('#FFFFFF', 0.92),
    solidCard: colors.cardBackground,
    floating: isDark ? withAlpha('#08101E', 0.90) : withAlpha('#FFFFFF', 0.94),
    danger: colors.dangerSurfaceStrong,
    accentSurface: colors.accentSurface,
    border: colors.cardBorder,
    strongBorder: isDark ? withAlpha('#FFFFFF', 0.22) : withAlpha('#0F172A', 0.12),
    accentBorder: withAlpha(accent, 0.45),
    dangerBorder: colors.dangerBorder,
    shadow: colors.floatingShadow,
});

export const createTypeScale = (compact: boolean, roomy: boolean): TypeScale => ({
    hero: compact ? 28 : roomy ? 38 : 34,
    title: compact ? 22 : roomy ? 32 : 28,
    sectionTitle: compact ? 16 : 18,
    cardTitle: compact ? 16 : 17,
    body: compact ? 14 : 15,
    bodySmall: compact ? 12 : 13,
    label: compact ? 13 : 14,
    caption: compact ? 11 : 12,
    eyebrow: compact ? 10 : 11,
});

export const createMotionTokens = (): MotionTokens => ({
    pressMs: 160,
    feedbackMs: 180,
    cardMs: 260,
    screenMs: 320,
    playerMs: 340,
    pressScale: 0.97,
});

export const createRadiusTokens = (compact: boolean): RadiusTokens => ({
    sm: compact ? 12 : 14,
    md: compact ? 16 : 18,
    lg: compact ? 20 : 22,
    xl: compact ? 24 : 28,
    pill: 999,
});

export const createSpacingTokens = (compact: boolean, roomy: boolean): SpacingTokens => ({
    xxs: 4,
    xs: 8,
    sm: compact ? 12 : 14,
    md: compact ? 16 : 18,
    lg: compact ? 20 : 22,
    xl: compact ? 24 : 28,
    xxl: roomy ? 40 : 32,
    screen: compact ? 16 : roomy ? 24 : 20,
    card: compact ? 16 : 18,
    section: compact ? 20 : 24,
});

export const createArtworkPalette = (accent: string, isDark: boolean): ArtworkPalette => ({
    accent,
    halo: withAlpha(accent, isDark ? 0.22 : 0.14),
    glow: withAlpha(accent, isDark ? 0.18 : 0.12),
    overlay: isDark ? withAlpha('#030712', 0.46) : withAlpha('#F8FAFC', 0.62),
});
