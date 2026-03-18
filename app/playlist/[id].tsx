import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MiniPlayer from '../../components/MiniPlayer';
import PaginationControls from '../../components/PaginationControls';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';
import { useSafeRouterPush } from '../../hooks/useSafeRouterPush';

const SONGS_PER_PAGE = 20;

export default function PlaylistDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const safePush = useSafeRouterPush();
    const insets = useSafeAreaInsets();
    const { colors, resolvedTheme } = useTheme();
    const {
        playlists,
        library,
        currentSong,
        autoOpenPlayerOnPlay,
        showVideoBadges,
        likedIds,
        toggleLike,
        startQueuePlayback,
    } = useAudio();
    const [currentPage, setCurrentPage] = useState(1);

    const playlist = useMemo(
        () => playlists.find((p) => p.id === id) ?? null,
        [playlists, id]
    );

    const playlistSongs = useMemo(() => {
        if (!playlist) return [];
        return playlist.assetIds
            .map((assetId) => library.find((song) => song.id === assetId))
            .filter(Boolean) as MediaLibrary.Asset[];
    }, [playlist, library]);

    const totalPages = Math.max(1, Math.ceil(playlistSongs.length / SONGS_PER_PAGE));

    const pagedPlaylistSongs = useMemo(() => {
        const start = (currentPage - 1) * SONGS_PER_PAGE;
        return playlistSongs.slice(start, start + SONGS_PER_PAGE);
    }, [playlistSongs, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [id]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const openPlayerSafely = () => {
        safePush('/player');
    };

    const playAtIndex = async (index: number) => {
        if (!playlist || playlistSongs.length === 0) return;
        Haptics.selectionAsync();
        await startQueuePlayback(playlistSongs, index, {
            type: 'playlist',
            title: playlist.name,
            playlistId: playlist.id,
        });
        if (autoOpenPlayerOnPlay) {
            openPlayerSafely();
        }
    };

    if (!playlist) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.text }}>Playlist not found.</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
                    <Text style={{ color: colors.accent, fontWeight: '700' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
            <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <ScalePressable style={[styles.headerBtn, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </ScalePressable>
                <View style={styles.headerCenter}>
                    <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{playlist.name}</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>{playlistSongs.length} songs</Text>
                </View>
                <ScalePressable
                    style={[styles.headerBtn, { backgroundColor: colors.accentSurface }]}
                    onPress={() => playAtIndex(0)}
                    disabled={playlistSongs.length === 0}
                >
                    <Ionicons name="play" size={20} color={colors.accent} />
                </ScalePressable>
            </View>

            <FlashList
                data={pagedPlaylistSongs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 168 + insets.bottom }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="musical-notes-outline" size={64} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, marginTop: 14 }}>This playlist has no songs yet.</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const isActive = currentSong?.id === item.id;
                    const isLiked = likedIds.includes(item.id);
                    const actualIndex = (currentPage - 1) * SONGS_PER_PAGE + index;
                    return (
                        <ScalePressable
                            style={[styles.row, { borderColor: isActive ? colors.accent : colors.cardBorder, backgroundColor: colors.cardBackground }]}
                            onPress={() => playAtIndex(actualIndex)}
                        >
                            <Image source={require('../../assets/images/placeholder.png')} style={styles.thumb} />
                            <View style={styles.info}>
                                <View style={styles.nameRow}>
                                    <Text numberOfLines={1} style={[styles.name, { color: isActive ? colors.accent : colors.text }]}>
                                        {item.filename}
                                    </Text>
                                    {showVideoBadges && /\.(mp4|m4v|mov|webm|m3u8)$/i.test(`${item.filename} ${item.uri}`) ? (
                                        <View style={[styles.badge, { borderColor: colors.accent, backgroundColor: colors.accentSurface }]}>
                                            <Text style={[styles.badgeText, { color: colors.accent }]}>VIDEO</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={[styles.meta, { color: colors.textMuted }]}>
                                    {Math.floor(item.duration / 60)}:{(item.duration % 60).toFixed(0).padStart(2, '0')}
                                </Text>
                            </View>
                            <ScalePressable onPress={() => toggleLike(item.id)} style={styles.likeBtn}>
                                <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? colors.accent : colors.textMuted} />
                            </ScalePressable>
                        </ScalePressable>
                    );
                }}
                ListFooterComponent={
                    playlistSongs.length > 0 ? (
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPrev={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            onNext={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            colors={colors}
                        />
                    ) : null
                }
            />

            <MiniPlayer />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerCenter: {
        flex: 1,
        marginHorizontal: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '600',
    },
    empty: {
        alignItems: 'center',
        marginTop: 88,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 10,
        padding: 12,
    },
    thumb: {
        width: 52,
        height: 52,
        borderRadius: 12,
        marginRight: 14,
    },
    info: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
    },
    meta: {
        fontSize: 12,
        marginTop: 3,
    },
    likeBtn: {
        padding: 10,
        marginLeft: 8,
    },
    badge: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
});
