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

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemTheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>(defaultTheme);
    const [accentColor, setAccentColorState] = useState<string>(defaultAccent);
    const [isReady, setIsReady] = useState(false);

    // Resolve theme synchronously - always default to dark if systemTheme is null
    const resolvedTheme: ThemeName = (theme === 'system' ? (systemTheme || defaultResolvedTheme) : theme) as ThemeName;

    // Always compute colors - available immediately
    const colors = getThemeColors(resolvedTheme, accentColor);

    useEffect(() => {
        let mounted = true;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const loadPreferences = async () => {
            try {
                // Set a timeout for AsyncStorage - if it takes too long, use defaults
                const timeoutPromise = new Promise<'timeout'>((resolve) => {
                    timeoutId = setTimeout(() => resolve('timeout'), 2000);
                });

                const storagePromise = Promise.all([
                    AsyncStorage.getItem(THEME_STORAGE_KEY),
                    AsyncStorage.getItem(ACCENT_STORAGE_KEY),
                ]);

                const result = await Promise.race([storagePromise, timeoutPromise]);

                if (!mounted) return;

                // If timeout, use defaults
                if (result === 'timeout') {
                    console.log('[ThemeContext] Storage timeout, using defaults');
                    setIsReady(true);
                    return;
                }

                const [savedTheme, savedAccent] = result as [string | null, string | null];

                if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
                    setThemeState(savedTheme);
                }

                if (savedAccent) {
                    const validAccent = Object.values(ACCENT_COLORS).find(c => c === savedAccent);
                    if (validAccent) {
                        setAccentColorState(validAccent);
                    }
                }
            } catch (error) {
                console.log('[ThemeContext] Load error, using defaults');
            } finally {
                if (mounted) {
                    setIsReady(true);
                }
            }
        };

        loadPreferences();

        return () => {
            mounted = false;
            if (timeoutId) clearTimeout(timeoutId);
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
