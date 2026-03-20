import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
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

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemTheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>('system');
    const [accentColor, setAccentColorState] = useState<string>(ACCENT_COLORS.teal);
    const [isReady, setIsReady] = useState(false);

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

                if (savedAccent && Object.values(ACCENT_COLORS).includes(savedAccent as (typeof ACCENT_COLORS)[keyof typeof ACCENT_COLORS])) {
                    setAccentColorState(savedAccent);
                }
            } catch {
                // Ignore persistence failures and fall back to defaults.
            } finally {
                if (mounted) {
                    setIsReady(true);
                }
            }
        };

        loadPreferences().catch(() => {
            // Ignore persistence failures and fall back to defaults.
        });

        return () => {
            mounted = false;
        };
    }, []);

    const resolvedTheme: ThemeName = theme === 'system'
        ? systemTheme === 'light'
            ? 'light'
            : 'dark'
        : theme;

    const colors = useMemo(
        () => getThemeColors(resolvedTheme, accentColor),
        [resolvedTheme, accentColor]
    );

    const setTheme = (nextTheme: ThemeType) => {
        setThemeState(nextTheme);
        AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme).catch(() => {
            // Ignore persistence failures and keep the in-memory value.
        });
    };

    const setAccentColor = (color: string) => {
        setAccentColorState(color);
        AsyncStorage.setItem(ACCENT_STORAGE_KEY, color).catch(() => {
            // Ignore persistence failures and keep the in-memory value.
        });
    };

    if (!isReady) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, accentColor, isReady, setTheme, setAccentColor, colors }}>
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
