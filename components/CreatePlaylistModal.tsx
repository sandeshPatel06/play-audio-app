import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CreatePlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

export default function CreatePlaylistModal({ visible, onClose, onCreate }: CreatePlaylistModalProps) {
    const { colors, theme } = useTheme();
    const isLight = theme === 'light';
    const overlayColor = isLight ? 'rgba(15,23,42,0.28)' : 'rgba(2,6,23,0.62)';
    const cardBorder = isLight ? 'rgba(17,24,39,0.14)' : 'rgba(255,255,255,0.12)';
    const shadowColor = isLight ? '#1F2937' : '#000';
    const cancelBg = isLight ? 'rgba(17,24,39,0.06)' : 'rgba(255,255,255,0.06)';
    const [name, setName] = useState('');

    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name.trim());
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
            <View style={[styles.modalOverlay, { backgroundColor: overlayColor }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: cardBorder, shadowColor }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>New Playlist</Text>
                    <TextInput
                        style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                        placeholder="Playlist Name"
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoFocus
                    />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { backgroundColor: cancelBg }]}>
                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleCreate}
                            style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                        >
                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Create</Text>
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
        padding: 25,
        borderRadius: 24,
        borderWidth: 1,
        elevation: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 20,
    },
    modalInput: {
        borderWidth: 1.5,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 25,
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
