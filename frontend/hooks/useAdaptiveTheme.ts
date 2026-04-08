import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    createArtworkPalette,
    createMotionTokens,
    createRadiusTokens,
    createSpacingTokens,
    createSurfaceTokens,
    createTypeScale,
} from '../constants/design';
import { useTheme } from '../context/ThemeContext';

export function useAdaptiveTheme() {
    const { colors, resolvedTheme, accentColor } = useTheme();
    const { width } = useWindowDimensions();

    return useMemo(() => {
        const compact = width < 375;
        const roomy = width >= 430;
        const isDark = resolvedTheme === 'dark';
        const accent = colors.accent || accentColor;

        return {
            colors,
            resolvedTheme,
            accent,
            compact,
            roomy,
            isDark,
            blurIntensity: compact ? 72 : 84,
            spacing: createSpacingTokens(compact, roomy),
            radii: createRadiusTokens(compact),
            typeScale: createTypeScale(compact, roomy),
            motion: createMotionTokens(),
            surfaces: createSurfaceTokens(accent, isDark, colors),
            artworkPalette: createArtworkPalette(accent, isDark),
        };
    }, [accentColor, colors, resolvedTheme, width]);
}

export function usePageSpacing() {
    const insets = useSafeAreaInsets();
    const theme = useAdaptiveTheme();

    return useMemo(() => ({
        compact: theme.compact,
        horizontal: theme.spacing.screen,
        cardPadding: theme.spacing.card,
        sectionGap: theme.spacing.section,
        topInset: insets.top,
        bottomInset: insets.bottom,
        headerTop: insets.top + theme.spacing.sm,
        scrollBottom: insets.bottom + 148,
        floatingBottom: insets.bottom + theme.spacing.md,
    }), [insets.bottom, insets.top, theme.compact, theme.spacing.card, theme.spacing.md, theme.spacing.screen, theme.spacing.section, theme.spacing.sm]);
}
