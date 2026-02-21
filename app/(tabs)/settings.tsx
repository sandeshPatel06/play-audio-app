import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MiniPlayer from '../../components/MiniPlayer';
import { ACCENT_COLORS, useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { theme, setTheme, accentColor, setAccentColor, colors } = useTheme();
    const { queue } = useAudio();

    const handleAccentChange = (color: string) => {
        Haptics.selectionAsync();
        setAccentColor(color);
    };

    const handleThemeChange = (val: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTheme(val ? 'dark' : 'light');
    };

    const renderColorOption = (color: string, name: string) => (
        <TouchableOpacity
            key={name}
            activeOpacity={0.8}
            style={[
                styles.colorOption,
                { backgroundColor: color },
                accentColor === color && { borderColor: '#FFF', borderWidth: 3 }
            ]}
            onPress={() => handleAccentChange(color)}
        >
            {accentColor === color && (
                <Ionicons name="checkmark" size={20} color="#FFF" />
            )}
        </TouchableOpacity>
    );

    return (
        <LinearGradient
            colors={[colors.background, '#121212', '#000000']}
            style={styles.container}
        >
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
                    <View style={[styles.settingCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingLabel}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                    <Ionicons name="moon" size={20} color={colors.text} />
                                </View>
                                <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
                            </View>
                            <Switch
                                value={theme === 'dark'}
                                onValueChange={handleThemeChange}
                                trackColor={{ false: '#767577', true: colors.accent }}
                                thumbColor="#f4f3f4"
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Accent Color</Text>
                    <View style={[styles.settingCard, { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 20 }]}>
                        <View style={styles.colorGrid}>
                            {Object.entries(ACCENT_COLORS).map(([name, color]) => renderColorOption(color, name))}
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Library Info</Text>
                    <View style={[styles.settingCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                        <View style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
                            <View style={styles.settingLabel}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                    <Ionicons name="musical-notes" size={20} color={colors.text} />
                                </View>
                                <Text style={[styles.settingText, { color: colors.text }]}>Total Songs</Text>
                            </View>
                            <Text style={[styles.valueText, { color: colors.accent }]}>{queue.length}</Text>
                        </View>
                        <View style={[styles.settingItem, { paddingTop: 15 }]}>
                            <View style={styles.settingLabel}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                    <Ionicons name="folder" size={20} color={colors.text} />
                                </View>
                                <Text style={[styles.settingText, { color: colors.text }]}>Storage Path</Text>
                            </View>
                            <Text style={[styles.valueText, { color: colors.textMuted }]}>External</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
                    <View style={[styles.settingCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingLabel}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                    <Ionicons name="information-circle" size={20} color={colors.text} />
                                </View>
                                <Text style={[styles.settingText, { color: colors.text }]}>Version</Text>
                            </View>
                            <Text style={[styles.valueText, { color: colors.textMuted }]}>1.0.0</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
            <MiniPlayer />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '800',
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.7,
    },
    settingCard: {
        borderRadius: 20,
        padding: 15,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    settingLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    settingText: {
        fontSize: 16,
        fontWeight: '600',
    },
    valueText: {
        fontSize: 16,
        fontWeight: '700',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        gap: 10,
    },
    colorOption: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
});
