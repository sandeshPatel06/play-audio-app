import React, { createContext, ReactNode, useContext, useState } from 'react';
import { COLORS } from '../constants/colors';

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeType;
    accentColor: string;
    setTheme: (theme: ThemeType) => void;
    setAccentColor: (color: string) => void;
    colors: {
        background: string;
        surface: string;
        subSurface: string;
        overlay: string;
        text: string;
        textMuted: string;
        border: string;
        accent: string;
    };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ACCENT_COLORS = COLORS.accents;

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState<ThemeType>('dark');
    const [accentColor, setAccentColor] = useState(COLORS.accents.teal);

    const themeBase = theme === 'dark' ? COLORS.dark : COLORS.light;

    const colors = {
        ...themeBase,
        accent: accentColor,
    };

    return (
        <ThemeContext.Provider value={{ theme, accentColor, setTheme, setAccentColor, colors }}>
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
