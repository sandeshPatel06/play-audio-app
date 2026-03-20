import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ScalePressable from './ScalePressable';

interface LinkInputModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (link: string) => void;
}

export default function LinkInputModal({ visible, onClose, onSubmit }: LinkInputModalProps) {
    const { colors } = useTheme();
    const [value, setValue] = useState('');
    const trimmedValue = value.trim();
    const canSubmit = trimmedValue.length > 0;

    const handleClose = () => {
        setValue('');
        onClose();
    };

    const handleSubmit = () => {
        if (!trimmedValue) return;
        onSubmit(trimmedValue);
        setValue('');
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
                <View style={[styles.content, { backgroundColor: colors.surface, borderColor: colors.modalBorder, shadowColor: colors.modalShadow }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Play From Link</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>Paste a direct media URL (mp3/mp4/m3u8).</Text>

                    <TextInput
                        value={value}
                        onChangeText={setValue}
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackgroundSubtle }]}
                        placeholder="https://example.com/media.mp4"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                    />

                    <View style={styles.row}>
                        <ScalePressable style={[styles.btn, { backgroundColor: colors.modalCancelBackground }]} onPress={handleClose}>
                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </ScalePressable>
                        <ScalePressable
                            style={[
                                styles.btn,
                                { backgroundColor: canSubmit ? colors.accent : colors.cardBackgroundStrong },
                            ]}
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                        >
                            <Text style={{ color: canSubmit ? colors.onAccent : colors.textMuted, fontWeight: '700' }}>Play</Text>
                        </ScalePressable>
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
        borderRadius: 24,
        borderWidth: 1,
        elevation: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    subtitle: {
        marginTop: 10,
        fontSize: 14,
        lineHeight: 20,
    },
    input: {
        marginTop: 18,
        borderWidth: 1,
        borderRadius: 14,
        minHeight: 52,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    row: {
        marginTop: 22,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    btn: {
        minWidth: 108,
        minHeight: 46,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
