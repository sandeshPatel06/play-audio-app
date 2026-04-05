import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function TabsLayout() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: Math.max(12, insets.bottom),
                    left: 16,
                    right: 16,
                    height: 68,
                    borderRadius: 20,
                    elevation: 15,
                    borderTopWidth: 0,
                    backgroundColor: colors.tabBarBackground,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 25,
                },
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarShowLabel: true,
                tabBarLabelPosition: 'below-icon',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: 'bold',
                    marginBottom:-2,
                },
                tabBarItemStyle: {
                    paddingTop:3,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Library',
                    tabBarIcon: ({ color, focused }) => (
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
                    tabBarIcon: ({ color, focused }) => (
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
                    tabBarIcon: ({ color, focused }) => (
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
