import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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
    const { colors, theme } = useTheme();
    const isLight = theme === 'light';
    const overlayColor = isLight ? 'rgba(15,23,42,0.28)' : 'rgba(2,6,23,0.62)';
    const cardBorder = isLight ? 'rgba(17,24,39,0.14)' : 'rgba(255,255,255,0.12)';
    const shadowColor = isLight ? '#1F2937' : '#000';
    const cancelBg = isLight ? 'rgba(17,24,39,0.06)' : 'rgba(255,255,255,0.06)';
    const [name, setName] = useState(initialValue);

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
        const normalized = name.trim();
        if (!normalized) return;
        onConfirm(normalized);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: overlayColor }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: cardBorder, shadowColor }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                    <TextInput
                        style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                        placeholder="Playlist Name"
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleConfirm}
                    />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity onPress={handleClose} style={[styles.modalBtn, { backgroundColor: cancelBg }]}>
                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                        >
                            <Text style={{ color: '#FFF', fontWeight: '700' }}>{confirmText}</Text>
                        </TouchableOpacity>
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
        borderRadius: 22,
        borderWidth: 1,
        elevation: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
    },
    modalInput: {
        borderWidth: 1.5,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
});
