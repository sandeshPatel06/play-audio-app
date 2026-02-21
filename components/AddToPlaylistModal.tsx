import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Playlist } from '../store/useAudioStore';

interface AddToPlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    playlists: Playlist[];
    onSelect: (playlistId: string) => void;
}

export default function AddToPlaylistModal({ visible, onClose, playlists, onSelect }: AddToPlaylistModalProps) {
    const { colors } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Add to Playlist</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {playlists.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={{ color: colors.textMuted }}>No playlists created yet</Text>
                            </View>
                        ) : (
                            playlists.map(playlist => (
                                <TouchableOpacity
                                    key={playlist.id}
                                    style={[styles.item, { borderBottomColor: 'rgba(255,255,255,0.05)' }]}
                                    onPress={() => onSelect(playlist.id)}
                                >
                                    <View style={[styles.icon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                        <Ionicons name="musical-notes" size={20} color={colors.accent} />
                                    </View>
                                    <View>
                                        <Text style={[styles.name, { color: colors.text }]}>{playlist.name}</Text>
                                        <Text style={[styles.meta, { color: colors.textMuted }]}>{playlist.assetIds.length} songs</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        width: '100%',
        height: '60%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    list: {
        flex: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    icon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
    },
    meta: {
        fontSize: 12,
        marginTop: 2,
    },
    empty: {
        alignItems: 'center',
        marginTop: 40,
    },
});
