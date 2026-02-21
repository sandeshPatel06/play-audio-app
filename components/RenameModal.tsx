import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface RenameModalProps {
    visible: boolean;
    onClose: () => void;
    onRename: (newName: string) => void;
    currentName: string;
}

export default function RenameModal({ visible, onClose, onRename, currentName }: RenameModalProps) {
    const { colors } = useTheme();
    const [newName, setNewName] = useState(currentName);

    useEffect(() => {
        if (visible) {
            setNewName(currentName);
        }
    }, [visible, currentName]);

    const handlePress = () => {
        if (newName.trim()) {
            onRename(newName.trim());
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Rename Song</Text>
                    <TextInput
                        style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                        value={newName}
                        onChangeText={setNewName}
                        autoFocus
                        selectTextOnFocus
                    />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity onPress={onClose} style={styles.modalBtn}>
                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handlePress}
                            style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                        >
                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Rename</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        padding: 25,
        borderRadius: 24,
        elevation: 20,
        shadowColor: '#000',
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
