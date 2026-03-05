import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LinkInputModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (link: string) => void;
}

export default function LinkInputModal({ visible, onClose, onSubmit }: LinkInputModalProps) {
    const { colors, theme } = useTheme();
    const isLight = theme === 'light';
    const overlayColor = isLight ? 'rgba(15,23,42,0.28)' : 'rgba(2,6,23,0.62)';
    const borderColor = isLight ? 'rgba(17,24,39,0.14)' : 'rgba(255,255,255,0.12)';
    const shadowColor = isLight ? '#1F2937' : '#000';
    const cancelBg = isLight ? 'rgba(17,24,39,0.06)' : 'rgba(255,255,255,0.06)';
    const [value, setValue] = useState('');

    const handleClose = () => {
        setValue('');
        onClose();
    };

    const handleSubmit = () => {
        if (!value.trim()) return;
        onSubmit(value.trim());
        setValue('');
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
                <View style={[styles.content, { backgroundColor: colors.surface, borderColor, shadowColor }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Play From Link</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>Paste a direct media URL (mp3/mp4/m3u8).</Text>

                    <TextInput
                        value={value}
                        onChangeText={setValue}
                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        placeholder="https://example.com/media.mp4"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                    />

                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: cancelBg }]} onPress={handleClose}>
                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleSubmit}>
                            <Text style={{ color: '#FFF', fontWeight: '700' }}>Play</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        padding: 24,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    subtitle: {
        marginTop: 8,
        fontSize: 13,
    },
    input: {
        marginTop: 16,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    row: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    btn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
});
