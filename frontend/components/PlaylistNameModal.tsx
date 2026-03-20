import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ScalePressable from './ScalePressable';

interface PlaylistNameModalProps {
    visible: boolean;
    title: string;
    confirmText: string;
    initialValue?: string;
    onClose: () => void;
    onConfirm: (name: string) => void;
}

export default function PlaylistNameModal({
    visible,
    title,
    confirmText,
    initialValue = '',
    onClose,
    onConfirm,
}: PlaylistNameModalProps) {
    const { colors } = useTheme();
    const [name, setName] = useState(initialValue);
    const normalizedName = name.trim();
    const canSubmit = normalizedName.length > 0;

    useEffect(() => {
        if (visible) {
            setName(initialValue);
        }
    }, [visible, initialValue]);

    const handleClose = () => {
        setName(initialValue);
        onClose();
    };

    const handleConfirm = () => {
        if (!normalizedName) return;
        onConfirm(normalizedName);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.modalBorder, shadowColor: colors.modalShadow }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                    <TextInput
                        style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackgroundSubtle }]}
                        placeholder="Playlist Name"
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleConfirm}
                    />
                    <View style={styles.modalButtons}>
                        <ScalePressable onPress={handleClose} style={[styles.modalBtn, { backgroundColor: colors.modalCancelBackground }]}>
                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </ScalePressable>
                        <ScalePressable
                            onPress={handleConfirm}
                            style={[styles.modalBtn, { backgroundColor: canSubmit ? colors.accent : colors.cardBackgroundStrong }]}
                            disabled={!canSubmit}
                        >
                            <Text style={{ color: canSubmit ? colors.onAccent : colors.textMuted, fontWeight: '700' }}>{confirmText}</Text>
                        </ScalePressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        padding: 22,
        borderRadius: 24,
        borderWidth: 1,
        elevation: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 18,
    },
    modalInput: {
        borderWidth: 1.5,
        borderRadius: 14,
        minHeight: 52,
        padding: 14,
        fontSize: 16,
        marginBottom: 22,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalBtn: {
        minWidth: 108,
        minHeight: 46,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
