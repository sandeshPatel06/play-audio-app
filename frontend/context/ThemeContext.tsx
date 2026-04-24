import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ACCENT_COLORS, CORE_COLORS, getThemeColors, ThemeColors, ThemeName } from '../constants/colors';
import { useAudioStore } from '../store/useAudioStore';

type ThemeType = ThemeName | 'system';

interface ThemeContextType {
    theme: ThemeType;
    resolvedTheme: ThemeName;
    accentColor: string;
    isReady: boolean;
    setTheme: (theme: ThemeType) => void;
    setAccentColor: (color: string) => void;
    colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'play.theme';
const ACCENT_STORAGE_KEY = 'play.accent';



const defaultTheme: ThemeType = 'system';
const defaultAccent = ACCENT_COLORS.teal;
const defaultResolvedTheme: ThemeName = 'dark';

// Default fallback colors - guaranteed to work
const fallbackColors: ThemeColors = {
  background: CORE_COLORS.darkBG,
  surface: CORE_COLORS.darkSurface,
  subSurface: CORE_COLORS.darkSubSurface,
  overlay: 'rgba(255,255,255,0.06)',
  text: CORE_COLORS.darkText,
  textMuted: CORE_COLORS.darkTextMuted,
  border: 'rgba(255,255,255,0.12)',
  accent: CORE_COLORS.tealAccent,
  transparent: CORE_COLORS.transparent,
  screenBackground: CORE_COLORS.darkBG,
  screenSurface: CORE_COLORS.darkSurface,
  screenMutedSurface: CORE_COLORS.darkSubSurface,
  cardBackground: 'rgba(255,255,255,0.05)',
  cardBackgroundStrong: 'rgba(255,255,255,0.10)',
  cardBackgroundSubtle: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.12)',
  modalOverlay: 'rgba(2,6,23,0.62)',
  modalBorder: 'rgba(255,255,255,0.12)',
  modalCancelBackground: 'rgba(255,255,255,0.06)',
  modalShadow: CORE_COLORS.black,
  listRowBorder: 'rgba(255,255,255,0.05)',
  iconBackground: 'rgba(255,255,255,0.08)',
  iconButtonBackground: 'rgba(255,255,255,0.04)',
  iconButtonBorder: 'rgba(255,255,255,0.14)',
  artworkBackground: 'rgba(255,255,255,0.03)',
  likeButtonBackground: 'rgba(255,255,255,0.04)',
  mutedText: 'rgba(255,255,255,0.62)',
  mutedIcon: 'rgba(255,255,255,0.55)',
  sliderTrack: 'rgba(255,255,255,0.20)',
  mainControlBackground: 'rgba(255,255,255,0.06)',
  mainControlBorder: 'rgba(255,255,255,0.14)',
  queueCardBackground: 'rgba(255,255,255,0.03)',
  queueCardBorder: 'rgba(255,255,255,0.14)',
  accentSurface: 'rgba(20,184,166,0.20)',
  accentSurfaceStrong: 'rgba(20,184,166,0.20)',
  accentBorder: 'rgba(20,184,166,0.50)',
  activeRowBackground: 'rgba(255,255,255,0.08)',
  activeOverlay: 'rgba(0,0,0,0.30)',
  selectionOverlay: 'rgba(0,0,0,0.40)',
  floatingBackground: CORE_COLORS.darkSurface,
  floatingBorder: 'rgba(255,255,255,0.10)',
  floatingShadow: CORE_COLORS.black,
  progressTrack: 'rgba(255,255,255,0.10)',
  tabBarBackground: CORE_COLORS.darkSurface,
  tabBarShadow: CORE_COLORS.black,
  sectionGlow: 'rgba(20,184,166,0.11)',
  danger: CORE_COLORS.danger,
  dangerSurface: 'rgba(255,59,48,0.10)',
  dangerSurfaceStrong: 'rgba(255,59,48,0.07)',
  dangerBorder: 'rgba(255,59,48,0.35)',
  dangerDivider: 'rgba(255,59,48,0.25)',
  warning: CORE_COLORS.warning,
  warningSurface: 'rgba(255,159,10,0.18)',
  warningText: CORE_COLORS.warningText,
  dangerText: CORE_COLORS.dangerText,
  onAccent: CORE_COLORS.white,
  onDanger: CORE_COLORS.white,
  switchTrackOff: CORE_COLORS.switchTrackOff,
  switchThumb: CORE_COLORS.switchThumb,
  // Specialized UI Colors
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
  // Accent hex values
  accents: ACCENT_COLORS,
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemTheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>(defaultTheme);
    const [accentColor, setAccentColorState] = useState<string>(defaultAccent);
    const [isReady, setIsReady] = useState(false);
    const adaptiveAccent = useAudioStore((state) => state.adaptiveAccent);

    // Resolve theme synchronously - always default to dark if systemTheme is null
    const resolvedTheme: ThemeName = (theme === 'system' ? (systemTheme || defaultResolvedTheme) : theme) as ThemeName;
    const activeAccent = adaptiveAccent || accentColor;

    // Compute colors - memoized so consumers only re-render when theme/accent actually changes
    const colors = useMemo<ThemeColors>(() => {
        try {
            return getThemeColors(resolvedTheme, activeAccent);
        } catch {
            return fallbackColors;
        }
    }, [resolvedTheme, activeAccent]);

    useEffect(() => {
        let mounted = true;

        const loadPreferences = async () => {
            try {
                const [savedTheme, savedAccent] = await Promise.all([
                    AsyncStorage.getItem(THEME_STORAGE_KEY),
                    AsyncStorage.getItem(ACCENT_STORAGE_KEY),
                ]);

                if (!mounted) return;

                if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
                    setThemeState(savedTheme);
                }

                if (savedAccent) {
                    const validAccent = Object.values(ACCENT_COLORS).find(c => c === savedAccent);
                    if (validAccent) {
                        setAccentColorState(validAccent);
                    }
                }
            } catch {
                // Fall back to defaults if persisted theme data is unavailable.
            } finally {
                if (mounted) {
                    setIsReady(true);
                }
            }
        };

        loadPreferences();

        return () => {
            mounted = false;
        };
    }, []);

    const setTheme = useCallback((nextTheme: ThemeType) => {
        setThemeState(nextTheme);
        AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme).catch(() => {});
    }, []);

    const setAccentColor = useCallback((color: string) => {
        setAccentColorState(color);
        AsyncStorage.setItem(ACCENT_STORAGE_KEY, color).catch(() => {});
    }, []);

    const value = useMemo<ThemeContextType>(() => ({
        theme,
        resolvedTheme,
        accentColor,
        isReady,
        setTheme,
        setAccentColor,
        colors,
    }), [theme, resolvedTheme, accentColor, isReady, setTheme, setAccentColor, colors]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
