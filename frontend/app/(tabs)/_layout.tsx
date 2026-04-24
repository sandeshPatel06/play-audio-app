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
    return (
        <BlurView
            tint={theme.isDark ? 'dark' : 'light'}
            intensity={theme.blurIntensity}
            style={{
                flex: 1,
                borderRadius: theme.radii.xl,
                backgroundColor: theme.surfaces.floating,
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
            bottom: Math.max(12, insets.bottom),
            left: 16,
            right: 16,
            height: 72,
            borderRadius: theme.radii.xl,
            elevation: 15,
            borderTopWidth: 0,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.floatingBorder,
            shadowColor: colors.tabBarShadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.22,
            shadowRadius: 22,
            overflow: 'hidden' as const,
        },
        tabBarBackground: tabBarBackgroundComponent,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon' as const,
        tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '800' as const,
            marginBottom: -1,
        },
        tabBarItemStyle: {
            paddingTop: 4,
            marginBottom: -10,
        },
    }), [colors.accent, colors.floatingBorder, colors.tabBarShadow, colors.textMuted, insets.bottom, theme.radii.xl]);

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
