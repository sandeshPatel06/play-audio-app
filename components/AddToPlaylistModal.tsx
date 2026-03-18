import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Playlist } from '../store/useAudioStore';
import ScalePressable from './ScalePressable';

interface AddToPlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    playlists: Playlist[];
    onSelect: (playlistId: string) => void;
}

export default function AddToPlaylistModal({ visible, onClose, playlists, onSelect }: AddToPlaylistModalProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.modalBorder, paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Add to Playlist</Text>
                        <ScalePressable style={[styles.closeButton, { backgroundColor: colors.modalCancelBackground }]} onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </ScalePressable>
                    </View>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {playlists.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={{ color: colors.textMuted }}>No playlists created yet</Text>
                            </View>
                        ) : (
                            playlists.map(playlist => (
                                <ScalePressable
                                    key={playlist.id}
                                    style={[styles.item, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
                                    onPress={() => onSelect(playlist.id)}
                                >
                                    <View style={[styles.icon, { backgroundColor: colors.cardBackgroundStrong }]}>
                                        <Ionicons name="musical-notes" size={20} color={colors.accent} />
                                    </View>
                                    <View>
                                        <Text style={[styles.name, { color: colors.text }]}>{playlist.name}</Text>
                                        <Text style={[styles.meta, { color: colors.textMuted }]}>{playlist.assetIds.length} songs</Text>
                                    </View>
                                </ScalePressable>
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
        justifyContent: 'flex-end',
    },
    modalContent: {
        width: '100%',
        maxHeight: '72%',
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        borderWidth: 1,
        padding: 22,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 19,
        fontWeight: '800',
    },
    list: {
        flex: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 68,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 16,
        marginBottom: 10,
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
        marginTop: 48,
    },
});
