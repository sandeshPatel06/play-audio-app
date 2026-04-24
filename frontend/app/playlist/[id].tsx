import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { FlatList, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';
import { useSafeRouterBack } from '../../hooks/useSafeRouterBack';
import { useSafeRouterPush } from '../../hooks/useSafeRouterPush';
import { CORE_COLORS } from '../../constants/colors';

export default function PlaylistDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const safePush = useSafeRouterPush();
    const safeBack = useSafeRouterBack();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { colors, resolvedTheme } = useTheme();
    const isSmall = screenWidth < 375;
    const styles = useMemo(() => createStyles(colors, isSmall, screenWidth), [colors, isSmall, screenWidth]);
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
                <ScalePressable onPress={() => safeBack()} style={[styles.backBtn, { backgroundColor: colors.accentSurface }]}>
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
                    onPress={() => safeBack()}
                >
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                </ScalePressable>

                <View style={styles.headerCenter}>
                    <Text style={[styles.headerEyebrow, { color: colors.accent }]}>Playlist Collection</Text>
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
        </View>
    );
}



function createStyles(colors: any, isSmall: boolean, screenWidth: number) {
    return StyleSheet.create({
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
            paddingHorizontal: isSmall ? 16 : 20,
            paddingVertical: 10,
            borderRadius: isSmall ? 10 : 12,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: isSmall ? 12 : 16,
            marginBottom: 14,
        },
        headerBtn: {
            width: isSmall ? 40 : 44,
            height: isSmall ? 40 : 44,
            borderRadius: isSmall ? 12 : 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
        },
        headerCenter: {
            flex: 1,
            marginHorizontal: 12,
        },
        headerEyebrow: {
            fontSize: isSmall ? 11 : 12,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: 2,
            opacity: 0.8,
        },
        headerTitle: {
            fontSize: isSmall ? 28 : 32,
            fontWeight: '900',
            letterSpacing: -1,
        },
        banner: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginHorizontal: isSmall ? 12 : 16,
            marginBottom: 16,
            padding: isSmall ? 16 : 20,
            borderRadius: isSmall ? 18 : 22,
            borderWidth: 1,
            shadowColor: CORE_COLORS.black,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 15,
            elevation: 4,
        },
        bannerCount: {
            fontSize: isSmall ? 14 : 16,
            fontWeight: '800',
        },
        bannerDuration: {
            fontSize: isSmall ? 11 : 12,
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
            paddingHorizontal: isSmall ? 12 : 14,
            paddingVertical: isSmall ? 7 : 9,
            borderRadius: isSmall ? 10 : 12,
        },
        bannerBtnText: {
            fontSize: isSmall ? 12 : 13,
            fontWeight: '700',
        },
        empty: {
            alignItems: 'center',
            marginTop: isSmall ? 60 : 80,
            gap: 8,
        },
        emptyTitle: {
            fontSize: isSmall ? 16 : 18,
            fontWeight: '800',
        },
        emptyHint: {
            fontSize: isSmall ? 13 : 14,
            fontWeight: '500',
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: isSmall ? 14 : 16,
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
            fontSize: isSmall ? 12 : 13,
            fontWeight: '600',
        },
        thumb: {
            width: isSmall ? 40 : 46,
            height: isSmall ? 40 : 46,
            borderRadius: isSmall ? 8 : 10,
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
            fontSize: isSmall ? 14 : 15,
            fontWeight: '700',
        },
        meta: {
            fontSize: isSmall ? 11 : 12,
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
}
