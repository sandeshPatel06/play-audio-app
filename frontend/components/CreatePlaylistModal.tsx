import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ScalePressable from './ScalePressable';
import { GlassDialog } from './ui/primitives';

interface CreatePlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

export default function CreatePlaylistModal({ visible, onClose, onCreate }: CreatePlaylistModalProps) {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const normalizedName = name.trim();
    const canSubmit = normalizedName.length > 0;

    const handleCreate = () => {
        if (normalizedName) {
            onCreate(normalizedName);
            setName('');
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <GlassDialog style={styles.modalContent}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>New Playlist</Text>
                    <TextInput
                        style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackgroundSubtle }]}
                        placeholder="Playlist Name"
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoFocus
                    />
                    <View style={styles.modalButtons}>
                        <ScalePressable onPress={onClose} style={[styles.modalBtn, { backgroundColor: colors.modalCancelBackground }]}>
                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </ScalePressable>
                        <ScalePressable
                            onPress={handleCreate}
                            style={[styles.modalBtn, { backgroundColor: canSubmit ? colors.accent : colors.cardBackgroundStrong }]}
                            disabled={!canSubmit}
                        >
                            <Text style={{ color: canSubmit ? colors.onAccent : colors.textMuted, fontWeight: 'bold' }}>Create</Text>
                        </ScalePressable>
                    </View>
                </GlassDialog>
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
    modalContent: { width: '100%' },
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
