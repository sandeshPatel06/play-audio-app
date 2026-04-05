import { Dimensions, Platform, useWindowDimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;
export const isTablet = SCREEN_WIDTH >= 768;
export const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export function useResponsive() {
    const { width, height } = useWindowDimensions();
    const isPortrait = height >= width;
    const isLandscapeOrientation = width > height;
    const isSmall = width < 375;
    const isMedium = width >= 375 && width < 414;
    const isLarge = width >= 414 && width < 768;
    const isWide = width >= 768;
    
    const scale = width / 375;
    const fontScale = Math.min(Math.max(width / 400, 0.85), 1.2);
    
    const spacing = {
        xs: 4 * scale,
        sm: 8 * scale,
        md: 12 * scale,
        lg: 16 * scale,
        xl: 20 * scale,
        xxl: 24 * scale,
    };
    
    const borderRadius = {
        sm: 8 * scale,
        md: 12 * scale,
        lg: 16 * scale,
        xl: 20 * scale,
        xxl: 24 * scale,
        full: 9999,
    };
    
    const iconSize = {
        sm: 16 * scale,
        md: 20 * scale,
        lg: 24 * scale,
        xl: 32 * scale,
        xxl: 44 * scale,
    };
    
    const hitSlop = {
        sm: 4 * scale,
        md: 8 * scale,
        lg: 12 * scale,
        xl: 16 * scale,
    };
    
    const itemSize = {
        thumbnail: Math.min(48 * scale, 56),
        artwork: Math.min(width - 72, 320),
        gridItem: (width - 32 - 24) / 3,
        listItem: 56 + (isSmall ? 8 : 0),
    };
    
    const listItemHeight = Math.max(56, Math.min(64, 56 * scale));
    const gridItemWidth = (width - 32 - 16) / (isSmall ? 2 : 3);
    const headerHeight = 120 + (isSmall ? -10 : 0);
    const miniPlayerHeight = 86 + (isSmall ? -6 : 0);
    const tabBarHeight = 96;
    
    return {
        width,
        height,
        isPortrait,
        isLandscapeOrientation,
        isSmall,
        isMedium,
        isLarge,
        isWide,
        scale,
        fontScale,
        spacing,
        borderRadius,
        iconSize,
        hitSlop,
        itemSize,
        listItemHeight,
        gridItemWidth,
        headerHeight,
        miniPlayerHeight,
        tabBarHeight,
        screenWidth: width,
        screenHeight: height,
    };
}

export const responsiveStyles = {
    container: (width: number) => ({
        minHeight: width < 375 ? '90%' : '100%',
    }),
    header: (width: number) => ({
        paddingHorizontal: width < 375 ? 12 : 16,
        paddingTop: width < 375 ? 12 : 16,
    }),
    title: (width: number) => ({
        fontSize: Math.max(20, Math.min(32, width * 0.08)),
        fontWeight: '800' as const,
    }),
    subtitle: (width: number) => ({
        fontSize: Math.max(10, Math.min(14, width * 0.035)),
    }),
    card: (width: number) => ({
        padding: Math.max(12, Math.min(18, width * 0.045)),
        borderRadius: Math.max(14, Math.min(22, width * 0.055)),
    }),
    button: (width: number) => ({
        paddingVertical: Math.max(8, Math.min(14, width * 0.035)),
        paddingHorizontal: Math.max(12, Math.min(20, width * 0.05)),
        borderRadius: Math.max(10, Math.min(16, width * 0.04)),
    }),
    input: (width: number) => ({
        height: Math.max(40, Math.min(52, width * 0.13)),
        borderRadius: Math.max(10, Math.min(16, width * 0.04)),
        fontSize: Math.max(14, Math.min(18, width * 0.045)),
    }),
    iconButton: (width: number) => ({
        width: Math.max(36, Math.min(48, width * 0.12)),
        height: Math.max(36, Math.min(48, width * 0.12)),
        borderRadius: Math.max(10, Math.min(16, width * 0.04)),
    }),
    artwork: (width: number) => ({
        size: Math.min(width - 72, Math.max(200, Math.min(320, width * 0.8))),
        borderRadius: Math.max(16, Math.min(40, width * 0.1)),
    }),
    control: (width: number) => ({
        playSize: Math.max(56, Math.min(80, width * 0.2)),
        mainSize: Math.max(40, Math.min(56, width * 0.14)),
        smallSize: Math.max(32, Math.min(44, width * 0.11)),
    }),
    gridColumns: (width: number) => (width < 375 ? 2 : 3),
    gridSpacing: (width: number) => (width < 375 ? 8 : 12),
    rowItem: (width: number) => ({
        minHeight: Math.max(48, Math.min(64, width * 0.16)),
        padding: Math.max(8, Math.min(12, width * 0.03)),
        borderRadius: Math.max(10, Math.min(18, width * 0.045)),
    }),
};