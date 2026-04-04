import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MiniPlayer from '../../components/MiniPlayer';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';
import { useSafeRouterPush } from '../../hooks/useSafeRouterPush';

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
        shuffle,
        setShuffle,
    } = useAudio();

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

    const openPlayerSafely = () => safePush('/player');

    const playAtIndex = async (index: number) => {
        if (!playlist || playlistSongs.length === 0) return;
        Haptics.selectionAsync();
        await startQueuePlayback(playlistSongs, index, {
            type: 'playlist',
            title: playlist.name,
            playlistId: playlist.id,
        });
        if (autoOpenPlayerOnPlay) openPlayerSafely();
    };

    const totalDuration = useMemo(() => {
        const secs = playlistSongs.reduce((acc, s) => acc + s.duration, 0);
        const m = Math.floor(secs / 60);
        return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr ${m % 60} min`;
    }, [playlistSongs]);

    if (!playlist) {
        return (
            <View style={[styles.center, { backgroundColor: colors.screenBackground }]}>
                <Ionicons name="journal-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 14, fontWeight: '600' }}>Playlist not found.</Text>
                <ScalePressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.accentSurface }]}>
                    <Text style={{ color: colors.accent, fontWeight: '700' }}>Go Back</Text>
                </ScalePressable>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
            <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />

            {/* Ambient glow */}
            <View style={[styles.bgGlow, { backgroundColor: colors.accent }]} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <ScalePressable
                    style={[styles.headerBtn, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                </ScalePressable>

                <View style={styles.headerCenter}>
                    <Text style={[styles.headerEyebrow, { color: colors.accent }]}>Playlist</Text>
                    <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text }]}>{playlist.name}</Text>
                </View>

                <ScalePressable
                    style={[styles.headerBtn, { backgroundColor: colors.accentSurface, borderColor: 'transparent' }]}
                    onPress={() => playAtIndex(0)}
                    disabled={playlistSongs.length === 0}
                >
                    <Ionicons name="play" size={20} color={colors.accent} />
                </ScalePressable>
            </View>

            {/* Play All / Shuffle Banner */}
            <View style={[styles.banner, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                <View>
                    <Text style={[styles.bannerCount, { color: colors.text }]}>
                        {playlistSongs.length} songs
                    </Text>
                    <Text style={[styles.bannerDuration, { color: colors.textMuted }]}>{totalDuration}</Text>
                </View>
                <View style={styles.bannerActions}>
                    <ScalePressable
                        style={[styles.bannerBtn, { backgroundColor: colors.accentSurface }]}
                        onPress={() => { Haptics.selectionAsync(); setShuffle(!shuffle); }}
                    >
                        <Ionicons name="shuffle" size={18} color={shuffle ? colors.accent : colors.textMuted} />
                        <Text style={[styles.bannerBtnText, { color: shuffle ? colors.accent : colors.textMuted }]}>
                            Shuffle
                        </Text>
                    </ScalePressable>
                    <ScalePressable
                        style={[styles.bannerBtn, { backgroundColor: colors.accent }]}
                        onPress={() => playAtIndex(0)}
                        disabled={playlistSongs.length === 0}
                    >
                        <Ionicons name="play" size={18} color={colors.onAccent} />
                        <Text style={[styles.bannerBtnText, { color: colors.onAccent }]}>Play All</Text>
                    </ScalePressable>
                </View>
            </View>

            <FlatList
                data={playlistSongs}
                keyExtractor={(item) => item.id}
                extraData={[currentSong?.id, likedIds, showVideoBadges, colors.text]}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 168 + insets.bottom, paddingTop: 8 }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="musical-notes-outline" size={64} color={colors.textMuted} style={{ opacity: 0.4 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Songs Yet</Text>
                        <Text style={[styles.emptyHint, { color: colors.textMuted }]}>Add songs from your Library.</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const isActive = currentSong?.id === item.id;
                    const isLiked = likedIds.has(item.id);
                    const isVideo = /\.(mp4|m4v|mov|webm|m3u8)$/i.test(`${item.filename} ${item.uri}`);
                    const dur = `${Math.floor(item.duration / 60)}:${(item.duration % 60).toFixed(0).padStart(2, '0')}`;
                    return (
                        <ScalePressable
                            style={[
                                styles.row,
                                {
                                    borderColor: isActive ? colors.accent : colors.cardBorder,
                                    backgroundColor: isActive ? colors.accentSurface : colors.cardBackground,
                                },
                            ]}
                            onPress={() => playAtIndex(index)}
                        >
                            {/* Track number */}
                            <View style={styles.trackNum}>
                                {isActive
                                    ? <Ionicons name="musical-note" size={14} color={colors.accent} />
                                    : <Text style={[styles.trackNumText, { color: colors.textMuted }]}>{index + 1}</Text>
                                }
                            </View>

                            <Image source={require('../../assets/images/placeholder.png')} style={styles.thumb} />

                            <View style={styles.info}>
                                <View style={styles.nameRow}>
                                    <Text numberOfLines={1} style={[styles.name, { color: isActive ? colors.accent : colors.text }]}>
                                        {item.filename.replace(/\.[^.]+$/, '')}
                                    </Text>
                                    {showVideoBadges && isVideo && (
                                        <View style={[styles.badge, { backgroundColor: colors.accentSurface }]}>
                                            <Ionicons name="videocam" size={10} color={colors.accent} />
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.meta, { color: colors.textMuted }]}>{dur}</Text>
                            </View>

                            <ScalePressable onPress={() => { Haptics.selectionAsync(); toggleLike(item.id); }} style={styles.likeBtn}>
                                <Ionicons
                                    name={isLiked ? 'heart' : 'heart-outline'}
                                    size={20}
                                    color={isLiked ? colors.accent : colors.textMuted}
                                />
                            </ScalePressable>
                        </ScalePressable>
                    );
                }}
            />

            <MiniPlayer />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    bgGlow: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        opacity: 0.08,
    },
    backBtn: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 14,
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
    headerEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
    },
    bannerCount: {
        fontSize: 16,
        fontWeight: '800',
    },
    bannerDuration: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    bannerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    bannerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
    },
    bannerBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    empty: {
        alignItems: 'center',
        marginTop: 80,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    emptyHint: {
        fontSize: 14,
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    trackNum: {
        width: 28,
        alignItems: 'center',
        marginRight: 4,
    },
    trackNumText: {
        fontSize: 13,
        fontWeight: '600',
    },
    thumb: {
        width: 46,
        height: 46,
        borderRadius: 10,
        marginRight: 10,
    },
    info: { flex: 1 },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
    },
    meta: {
        fontSize: 12,
        marginTop: 3,
        fontWeight: '500',
    },
    likeBtn: {
        padding: 10,
        marginLeft: 4,
    },
    badge: {
        width: 22,
        height: 22,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
