import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAdaptiveTheme } from '../../hooks/useAdaptiveTheme';

// Extracted as a stable component so Tabs doesn't get a new function ref each render
function TabBarBackground() {
    const theme = useAdaptiveTheme();
    const { colors } = useTheme();
    return (
        <BlurView
            tint={theme.isDark ? 'dark' : 'light'}
            intensity={theme.isDark ? 80 : 95}
            blurMethod="none"

            style={{
                flex: 1,
                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
            }}
        />

    );
}

const tabBarBackgroundComponent = () => <TabBarBackground />;

export default function TabsLayout() {
    const { colors } = useTheme();
    const theme = useAdaptiveTheme();
    const insets = useSafeAreaInsets();

    const screenOptions = useMemo(() => ({
        headerShown: false,
        tabBarStyle: {
            position: 'absolute' as const,
            bottom: Math.max(16, insets.bottom + 4),
            left: 20,
            right: 20,
            height: 68,
            borderRadius: 24,
            elevation: 20,
            borderTopWidth: 0,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: colors.floatingBorder,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.3,
            shadowRadius: 24,
            overflow: 'hidden' as const,
            paddingBottom: 0, // Reset default padding
        },
        tabBarBackground: tabBarBackgroundComponent,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon' as const,
        tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '800' as const,
            marginBottom: 10,
            letterSpacing: 0.4,
        },
        tabBarItemStyle: {
            paddingTop: 10,
        },
        tabBarHideOnKeyboard: true,
    }), [colors.accent, colors.floatingBorder, colors.textMuted, insets.bottom, theme.radii.xl]);


    return (
        <Tabs screenOptions={screenOptions}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Library',
                    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                        <Ionicons
                            name={focused ? "library" : "library-outline"}
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                        <Ionicons
                            name={focused ? "search" : "search-outline"}
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                        <Ionicons
                            name={focused ? "settings" : "settings-outline"}
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
