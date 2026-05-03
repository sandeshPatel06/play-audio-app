import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

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
    const { colors, resolvedTheme, accentColor } = useTheme() as any;
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

