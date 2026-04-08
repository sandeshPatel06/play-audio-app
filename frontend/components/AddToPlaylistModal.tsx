import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Playlist } from '../store/useAudioStore';
import ScalePressable from './ScalePressable';
import { BottomSheetScaffold } from './ui/primitives';

type PlaylistOption = Playlist & {
    assetIds?: string[];
};

interface AddToPlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    playlists: PlaylistOption[];
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
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <BottomSheetScaffold
                    title="Add to Playlist"
                    subtitle={`${playlists.length} playlists`}
                    style={{ paddingBottom: insets.bottom + 20 }}
                    trailing={
                        <ScalePressable style={[styles.closeButton, { backgroundColor: colors.cardBackground }]} onPress={onClose}>
                            <Ionicons name="close" size={20} color={colors.textMuted} />
                        </ScalePressable>
                    }
                >
                    <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                        {playlists.length === 0 ? (
                            <View style={styles.empty}>
                                <View style={[styles.emptyIconWrap, { backgroundColor: colors.cardBackground }]}>
                                    <Ionicons name="journal-outline" size={36} color={colors.textMuted} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Playlists Yet</Text>
                                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                                    Go to Discover to create your first playlist.
                                </Text>
                            </View>
                        ) : (
                            playlists.map(playlist => (
                                <ScalePressable
                                    key={playlist.id}
                                    style={[styles.item, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
                                    onPress={() => onSelect(playlist.id)}
                                >
                                    <View style={[styles.icon, { backgroundColor: colors.accentSurface }]}>
                                        <Ionicons name="musical-notes" size={22} color={colors.accent} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.name, { color: colors.text }]}>{playlist.name}</Text>
                                        <Text style={[styles.meta, { color: colors.textMuted }]}>
                                            {(playlist.assetIds || playlist.trackIds).length} songs
                                        </Text>
                                    </View>
                                    <View style={[styles.addChip, { backgroundColor: colors.accentSurface }]}>
                                        <Ionicons name="add" size={18} color={colors.accent} />
                                    </View>
                                </ScalePressable>
                            ))
                        )}
                    </ScrollView>
                </BottomSheetScaffold>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        flexGrow: 1,
    },
    listContent: {
        paddingBottom: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 72,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 18,
        marginBottom: 10,
        gap: 14,
    },
    icon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addChip: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
    },
    meta: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    empty: {
        alignItems: 'center',
        marginTop: 36,
        marginBottom: 24,
        gap: 12,
    },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '800',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
