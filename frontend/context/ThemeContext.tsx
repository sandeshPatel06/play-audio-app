import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ACCENT_COLORS, getThemeColors, ThemeColors, ThemeName } from '../constants/colors';

export type ThemeType = ThemeName | 'system';

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

export { ACCENT_COLORS };

const defaultTheme: ThemeType = 'system';
const defaultAccent = ACCENT_COLORS.teal;
const defaultResolvedTheme: ThemeName = 'dark';

// Default fallback colors - guaranteed to work
const fallbackColors: ThemeColors = {
  background: '#070B14',
  surface: '#111827',
  subSurface: '#192234',
  overlay: 'rgba(255,255,255,0.06)',
  text: '#EEF4FF',
  textMuted: '#9BA8C2',
  border: 'rgba(255,255,255,0.12)',
  accent: '#14B8A6',
  transparent: 'transparent',
  screenBackground: '#070B14',
  screenSurface: '#111827',
  screenMutedSurface: '#192234',
  cardBackground: 'rgba(255,255,255,0.05)',
  cardBackgroundStrong: 'rgba(255,255,255,0.10)',
  cardBackgroundSubtle: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.12)',
  modalOverlay: 'rgba(2,6,23,0.62)',
  modalBorder: 'rgba(255,255,255,0.12)',
  modalCancelBackground: 'rgba(255,255,255,0.06)',
  modalShadow: '#000000',
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
  floatingBackground: '#111827',
  floatingBorder: 'rgba(255,255,255,0.10)',
  floatingShadow: '#000000',
  progressTrack: 'rgba(255,255,255,0.10)',
  tabBarBackground: '#111827',
  tabBarShadow: '#000000',
  sectionGlow: 'rgba(20,184,166,0.11)',
  danger: '#FF3B30',
  dangerSurface: 'rgba(255,59,48,0.10)',
  dangerSurfaceStrong: 'rgba(255,59,48,0.07)',
  dangerBorder: 'rgba(255,59,48,0.35)',
  dangerDivider: 'rgba(255,59,48,0.25)',
  warning: '#FF9F0A',
  warningSurface: 'rgba(255,159,10,0.18)',
  warningText: '#FFB25C',
  dangerText: '#FF6B62',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  switchTrackOff: '#6B7280',
  switchThumb: '#F4F3F4',
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemTheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>(defaultTheme);
    const [accentColor, setAccentColorState] = useState<string>(defaultAccent);
    const [isReady, setIsReady] = useState(false);

    // Resolve theme synchronously - always default to dark if systemTheme is null
    const resolvedTheme: ThemeName = (theme === 'system' ? (systemTheme || defaultResolvedTheme) : theme) as ThemeName;

    // Compute colors - with fallback to prevent any undefined
    let colors: ThemeColors;
    try {
        colors = getThemeColors(resolvedTheme, accentColor);
    } catch {
        colors = fallbackColors;
    }

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
                // Use defaults on error
            } finally {
                if (mounted) {
                    setIsReady(true);
                }
            }
        };

        // Small delay then load
        const timer = setTimeout(loadPreferences, 50);

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, []);

    const setTheme = (nextTheme: ThemeType) => {
        setThemeState(nextTheme);
        AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme).catch(() => {});
    };

    const setAccentColor = (color: string) => {
        setAccentColorState(color);
        AsyncStorage.setItem(ACCENT_STORAGE_KEY, color).catch(() => {});
    };

    const value: ThemeContextType = {
        theme,
        resolvedTheme,
        accentColor,
        isReady,
        setTheme,
        setAccentColor,
        colors,
    };

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
