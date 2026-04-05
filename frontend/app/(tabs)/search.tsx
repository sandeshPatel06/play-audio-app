import { Ionicons } from '@expo/vector-icons';

import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, useWindowDimensions } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionDialog, ConfirmDialog, NoticeDialog } from '../../components/AppDialogs';
import MiniPlayer from '../../components/MiniPlayer';
import PlaylistNameModal from '../../components/PlaylistNameModal';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';
import { useJioSaavnSearch, useJioSaavnPlayer } from '../../hooks/useJioSaavn';
import { useSafeRouterPush } from '../../hooks/useSafeRouterPush';
import { useAudioStore } from '../../store/useAudioStore';
import { JioSaavnSong } from '../../services/jiosaavn';



export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { colors, resolvedTheme } = useTheme();
    const isSmall = screenWidth < 375;
    const styles = useMemo(() => createStyles(colors, isSmall), [colors, isSmall]);
    const {
        library,
        startQueuePlayback,
        autoOpenPlayerOnPlay,
        showVideoBadges,
        likedIds,
        toggleLike,
        playLikedSongs,
        playlists,
        createPlaylist,
        deletePlaylist,
        currentSong,
        onlineSourceEnabled,
    } = useAudio();
    const safePush = useSafeRouterPush();
    const [query, setQuery] = useState('');
    const [isCreatePlaylistVisible, setIsCreatePlaylistVisible] = useState(false);
    const [isPlaylistActionVisible, setIsPlaylistActionVisible] = useState(false);
    const [isDeletePlaylistVisible, setDeletePlaylistVisible] = useState(false);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    const [noticeState, setNoticeState] = useState<{ visible: boolean; title: string; message: string }>({
        visible: false,
        title: '',
        message: '',
    });

    const { results: jioResults, loading: jioLoading, search: jioSearch } = useJioSaavnSearch();
    const { playAll: playAllJioSongs } = useJioSaavnPlayer();

    const selectedPlaylist = useMemo(
        () => playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null,
        [playlists, selectedPlaylistId]
    );

    const filteredItems = useMemo(
        () => {
            if (!query.trim()) return [];
            const q = query.toLowerCase().trim();
            return library.filter(item => item.filename.toLowerCase().includes(q));
        },
        [library, query]
    );

    const searchCacheRef = React.useRef<Map<string, JioSaavnSong[]>>(new Map());
    const abortControllerRef = React.useRef<AbortController | null>(null);
    
    useEffect(() => {
        if (!onlineSourceEnabled || query.trim().length < 2) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            return;
        }
        
        const cacheKey = query.trim().toLowerCase();
        if (searchCacheRef.current.has(cacheKey)) {
            return;
        }

        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        
        const timer = setTimeout(() => {
            jioSearch(query);
        }, 600);
        
        return () => {
            clearTimeout(timer);
            abortControllerRef.current?.abort();
        };
    }, [query, onlineSourceEnabled, jioSearch]);



    const openPlayerSafely = useCallback(() => {
        safePush('/player');
    }, [safePush]);

    const onSongPress = useCallback(async (item: MediaLibrary.Asset) => {
        Haptics.selectionAsync();
        const index = library.findIndex(s => s.id === item.id);
        if (index >= 0) {
            await startQueuePlayback(library, index);
            if (autoOpenPlayerOnPlay) {
                openPlayerSafely();
            }
        }
    }, [autoOpenPlayerOnPlay, library, openPlayerSafely, startQueuePlayback]);

    const onJioSaavnSongPress = useCallback(async (song: JioSaavnSong, index: number) => {
        Haptics.selectionAsync();
        await playAllJioSongs(jioResults, index);
        if (autoOpenPlayerOnPlay) {
            openPlayerSafely();
        }
    }, [autoOpenPlayerOnPlay, jioResults, openPlayerSafely, playAllJioSongs]);

    const openPlaylistActions = (playlistId: string) => {
        Haptics.selectionAsync();
        setSelectedPlaylistId(playlistId);
        setIsPlaylistActionVisible(true);
    };

    const showNotice = (title: string, message: string) => {
        setNoticeState({ visible: true, title, message });
    };


    const handleCreatePlaylist = (name: string) => {
        const beforeCount = playlists.length;
        createPlaylist(name);
        const afterCount = useAudioStore.getState().playlists.length;
        setIsCreatePlaylistVisible(false);

        if (afterCount === beforeCount) {
            showNotice('Playlist Exists', 'Choose a different playlist name.');
        }
    };

    const handleDeletePlaylist = () => {
        if (!selectedPlaylist) return;
        deletePlaylist(selectedPlaylist.id);
        setDeletePlaylistVisible(false);
        setSelectedPlaylistId(null);
    };

    const renderSearchItem = useCallback(({ item }: { item: MediaLibrary.Asset }) => (
        <SearchItem
            item={item}
            onPress={() => onSongPress(item)}
            onLike={() => toggleLike(item.id)}
            isLiked={likedIds.has(item.id)}
            showVideoBadges={showVideoBadges}
            colors={colors}
            styles={styles}
        />
    ), [likedIds, colors, toggleLike, onSongPress, showVideoBadges, styles]);

    const renderSections = () => (
        <View style={styles.sections}>
            <ScalePressable
                style={[styles.sectionCard, { backgroundColor: colors.accentSurface, borderColor: colors.accent + '33' }]}
                onPress={async () => {
                    const started = await playLikedSongs();
                    if (started) {
                        if (autoOpenPlayerOnPlay) openPlayerSafely();
                    } else {
                        showNotice('No Liked Songs', 'Like songs first, then play them from here.');
                    }
                }}
            >
                <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons name="heart" size={26} color={colors.onAccent} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Liked Songs</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                        {likedIds.size} tracks · Tap to play
                    </Text>
                </View>
                <View style={[styles.countPill, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.countPillText, { color: colors.onAccent }]}>{likedIds.size}</Text>
                </View>
            </ScalePressable>

            <View style={styles.playlistHeader}>
                <View>
                    <Text style={[styles.playlistHeaderText, { color: colors.text }]}>Your Playlists</Text>
                    <Text style={[styles.playlistCountText, { color: colors.textMuted }]}>{playlists.length} playlists</Text>
                </View>
                <ScalePressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsCreatePlaylistVisible(true); }}
                    style={[styles.addBtn, { backgroundColor: colors.accentSurface, borderColor: colors.accent + '44' }]}
                >
                    <Ionicons name="add" size={20} color={colors.accent} />
                    <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13, marginLeft: 4 }}>New</Text>
                </ScalePressable>
            </View>

            {playlists.map(p => (
                <ScalePressable
                    key={p.id}
                    style={[styles.playlistItem, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
                    onPress={() => safePush(`/playlist/${p.id}`)}
                >
                    <View style={[styles.playlistIcon, { backgroundColor: colors.cardBackgroundStrong }]}>
                        <Ionicons name="musical-notes" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.playlistInfo}>
                        <Text numberOfLines={1} style={[styles.playlistName, { color: colors.text }]}>{p.name}</Text>
                        <Text numberOfLines={1} style={[styles.playlistMeta, { color: colors.textMuted }]}>
                            {p.assetIds.length} songs
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <TouchableOpacity
                        onPress={() => openPlaylistActions(p.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.playlistMenuBtn}
                    >
                        <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                </ScalePressable>
            ))}

            {playlists.length === 0 && (
                <View style={[styles.emptyPlaylist, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
                    <Ionicons name="journal-outline" size={40} color={colors.textMuted} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>Create your first playlist to get started.</Text>
                </View>
            )}
        </View>
    );

    return (
        <View
            style={[styles.container, { backgroundColor: colors.screenBackground }]}
        >
            <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />

            <View style={[styles.bgGlow, { backgroundColor: colors.accent }]} />

            <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
                <Text style={[styles.headerEyebrow, { color: colors.accent }]}>Browse</Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Discover</Text>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                <Ionicons name="search" size={20} color={colors.textMuted} />
                <TextInput
                    placeholder="Search songs, artists..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInput, { color: colors.text }]}
                    selectionColor={colors.accent}
                    value={query}
                    onChangeText={setQuery}
                />
                {query.length > 0 && (
                    <ScalePressable onPress={() => setQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </ScalePressable>
                )}
            </View>

            <FlatList
                data={query ? filteredItems : []}
                renderItem={renderSearchItem}
                keyExtractor={(item: any) => item.id || item.filename}
                extraData={[currentSong?.id, likedIds, showVideoBadges, colors.text]}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                initialNumToRender={15}
                windowSize={5}
                updateCellsBatchingPeriod={50}
                getItemLayout={(_, index) => ({
                    length: 72,
                    offset: 72 * index,
                    index,
                })}
                ListHeaderComponent={!query ? renderSections : (onlineSourceEnabled && jioResults.length > 0) ? (
                    <View style={styles.jioSection}>
                        <View style={styles.jioHeader}>
                            <Ionicons name="cloud-outline" size={18} color={colors.accent} />
                            <Text style={[styles.jioHeaderText, { color: colors.text }]}>Online Results</Text>
                            <Text style={[styles.jioCount, { color: colors.textMuted }]}>({jioResults.length})</Text>
                        </View>
                        {jioResults.map((song, index) => (
                            <JioSaavnItem
                                key={song.id}
                                song={song}
                                onPress={() => onJioSaavnSongPress(song, index)}
                                colors={colors}
                                styles={styles}
                            />
                        ))}
                    </View>
                ) : null}
                ListEmptyComponent={query && !jioLoading ? (
                    <View style={styles.empty}>
                        <Ionicons name="search-outline" size={56} color={colors.textMuted} style={{ opacity: 0.4 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Results</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4 }}>Try a different search term</Text>
                    </View>
                ) : null}
                contentContainerStyle={{ paddingBottom: 160 + insets.bottom, paddingHorizontal: 16 }}
                showsVerticalScrollIndicator={false}
            />
            {jioLoading && (
                <View style={styles.jioLoading}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={[styles.jioLoadingText, { color: colors.textMuted }]}>Searching online...</Text>
                </View>
            )}

            <PlaylistNameModal
                visible={isCreatePlaylistVisible}
                title="New Playlist"
                confirmText="Create"
                onClose={() => setIsCreatePlaylistVisible(false)}
                onConfirm={handleCreatePlaylist}
            />

            <ActionDialog
                visible={isPlaylistActionVisible}
                title={selectedPlaylist?.name || 'Playlist'}
                message="Manage this playlist"
                onClose={() => setIsPlaylistActionVisible(false)}
                actions={[
                    {
                        key: 'delete',
                        label: 'Delete Playlist',
                        icon: 'trash-outline',
                        danger: true,
                        onPress: () => {
                            setIsPlaylistActionVisible(false);
                            setDeletePlaylistVisible(true);
                        },
                    },
                ]}
            />

            <ConfirmDialog
                visible={isDeletePlaylistVisible}
                title="Delete Playlist"
                message={`Delete "${selectedPlaylist?.name || 'this playlist'}" permanently?`}
                onClose={() => setDeletePlaylistVisible(false)}
                onConfirm={handleDeletePlaylist}
                confirmText="Delete"
                cancelText="Cancel"
                danger
            />

            <NoticeDialog
                visible={noticeState.visible}
                title={noticeState.title}
                message={noticeState.message}
                onClose={() => setNoticeState((prev) => ({ ...prev, visible: false }))}
            />

            <MiniPlayer />
        </View>
    );
}


function createStyles(colors: any, isSmall: boolean) {
    return StyleSheet.create({
        container: { flex: 1 },
        header: {
            paddingHorizontal: isSmall ? 12 : 16,
            marginBottom: 16,
        },
        bgGlow: {
            position: 'absolute',
            top: -140,
            right: -80,
            width: 360,
            height: 360,
            borderRadius: 180,
            opacity: 0.1,
        },
        headerEyebrow: {
            fontSize: isSmall ? 10 : 12,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: 2,
        },
        headerTitle: {
            fontSize: isSmall ? 24 : 28,
            fontWeight: '800',
        },
        countPill: {
            borderRadius: 12,
            paddingHorizontal: isSmall ? 8 : 10,
            paddingVertical: 4,
            justifyContent: 'center',
            alignItems: 'center',
        },
        countPillText: {
            fontSize: isSmall ? 12 : 14,
            fontWeight: '800',
        },
        playlistCountText: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 1,
        },
        emptyTitle: {
            fontSize: isSmall ? 16 : 18,
            fontWeight: '800',
            marginTop: 16,
        },
        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: isSmall ? 12 : 16,
            borderRadius: isSmall ? 12 : 14,
            borderWidth: 1,
            height: isSmall ? 42 : 46,
            paddingHorizontal: isSmall ? 12 : 14,
            marginBottom: 14,
        },
        searchInput: {
            flex: 1,
            marginLeft: 10,
            fontSize: isSmall ? 14 : 16,
            height: '100%',
        },
        resultItem: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            borderRadius: isSmall ? 14 : 16,
            marginBottom: 8,
        },
        thumbnail: {
            width: isSmall ? 42 : 48,
            height: isSmall ? 42 : 48,
            borderRadius: isSmall ? 10 : 12,
            marginRight: 12,
        },
        resultInfo: { flex: 1 },
        empty: {
            alignItems: 'center',
            marginTop: isSmall ? 56 : 72,
        },
        sections: { marginBottom: 16 },
        sectionCard: {
            padding: isSmall ? 14 : 16,
            borderRadius: isSmall ? 18 : 20,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
            elevation: 2,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
        },
        sectionIcon: {
            width: isSmall ? 42 : 48,
            height: isSmall ? 42 : 48,
            borderRadius: isSmall ? 21 : 24,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 14,
        },
        sectionTitle: {
            fontSize: isSmall ? 15 : 17,
            fontWeight: '700',
        },
        sectionSubtitle: {
            fontSize: isSmall ? 12 : 13,
            fontWeight: '600',
            opacity: 0.7,
            marginTop: 2,
        },
        playlistHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
        },
        playlistHeaderText: {
            fontSize: isSmall ? 14 : 16,
            fontWeight: '800',
        },
        playlistItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: isSmall ? 12 : 14,
            borderWidth: 1,
            marginBottom: 8,
        },
        playlistMain: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        playlistMenuBtn: { padding: 10 },
        playlistIcon: {
            width: isSmall ? 38 : 42,
            height: isSmall ? 38 : 42,
            borderRadius: isSmall ? 10 : 12,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        playlistInfo: { flex: 1 },
        playlistName: {
            fontSize: isSmall ? 14 : 15,
            fontWeight: '700',
        },
        playlistMeta: {
            fontSize: isSmall ? 11 : 12,
            fontWeight: '500',
            marginTop: 2,
        },
        addBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: isSmall ? 10 : 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
        },
        emptyPlaylist: {
            borderWidth: 1,
            borderRadius: isSmall ? 18 : 20,
            padding: isSmall ? 20 : 24,
            alignItems: 'center',
            marginTop: 10,
        },
        videoBadge: {
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 4,
        },
        jioSection: { marginBottom: 16 },
        jioHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            gap: 8,
        },
        jioHeaderText: {
            fontSize: isSmall ? 14 : 15,
            fontWeight: '700',
        },
        jioCount: {
            fontSize: isSmall ? 12 : 13,
            fontWeight: '500',
        },
        jioItem: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            borderRadius: isSmall ? 14 : 16,
            marginBottom: 8,
        },
        jioThumbnail: {
            width: isSmall ? 42 : 48,
            height: isSmall ? 42 : 48,
            borderRadius: isSmall ? 10 : 12,
            marginRight: 12,
        },
        jioInfo: { flex: 1 },
        jioTitle: {
            fontSize: isSmall ? 14 : 15,
            fontWeight: '700',
        },
        jioArtist: {
            fontSize: isSmall ? 12 : 13,
            fontWeight: '500',
            marginTop: 2,
        },
        jioDuration: {
            fontSize: isSmall ? 11 : 12,
            fontWeight: '600',
        },
        jioLoading: {
            position: 'absolute',
            bottom: 100,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 8,
        },
        jioLoadingText: {
            fontSize: isSmall ? 12 : 13,
            fontWeight: '500',
        },
    });
}

const SearchItemComponent = ({ item, onPress, onLike, isLiked, showVideoBadges, colors, styles }: any) => (
    <View>
        <ScalePressable
            onPress={onPress}
            style={[styles.resultItem, { backgroundColor: colors.screenSurface }]}
        >
            <Image
                source={require('../../assets/images/placeholder.png')}
                style={styles.thumbnail}
            />
            <View style={styles.resultInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 }}>
                        {item.filename}
                    </Text>
                    {showVideoBadges && /\.(mp4|m4v|mov|webm|m3u8)$/i.test(`${item.filename} ${item.uri}`) && (
                        <View style={[styles.videoBadge, { backgroundColor: colors.accentSurface }]}>
                            <Ionicons name="videocam" size={12} color={colors.accent} />
                        </View>
                    )}
                </View>
                <Text style={[styles.itemSub, { color: colors.textMuted, fontSize: 13, fontWeight: '500', marginTop: 2 }]}>
                    {Math.floor(item.duration / 60)}:{(item.duration % 60).toFixed(0).padStart(2, '0')}
                </Text>
            </View>
            <ScalePressable onPress={onLike} style={{ padding: 12, marginLeft: 4 }}>
                <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isLiked ? colors.accent : colors.textMuted}
                />
            </ScalePressable>
        </ScalePressable>
    </View>
);

const SearchItem = memo(SearchItemComponent);
SearchItem.displayName = 'SearchItem';

const JioSaavnItemComponent = ({ song, onPress, colors, styles }: { song: JioSaavnSong; onPress: () => void; colors: any; styles: any }) => (
    <View>
        <ScalePressable
            onPress={onPress}
            style={[styles.jioItem, { backgroundColor: colors.screenSurface }]}
        >
            {song.imageUrl ? (
                <Image
                    source={{ uri: song.imageUrl }}
                    style={styles.jioThumbnail}
                />
            ) : (
                <View style={[styles.jioThumbnail, { backgroundColor: colors.cardBackground }]}>
                    <Ionicons name="musical-note" size={20} color={colors.textMuted} />
                </View>
            )}
            <View style={styles.jioInfo}>
                <Text numberOfLines={1} style={[styles.jioTitle, { color: colors.text }]}>
                    {song.title}
                </Text>
                <Text numberOfLines={1} style={[styles.jioArtist, { color: colors.textMuted }]}>
                    {song.artists}
                </Text>
            </View>
            <Text style={[styles.jioDuration, { color: colors.textMuted }]}>
                {Math.floor(song.duration / 60)}:{(song.duration % 60).toFixed(0).padStart(2, '0')}
            </Text>
            <ScalePressable onPress={onPress} style={{ padding: 8 }}>
                <Ionicons name="play-circle" size={28} color={colors.accent} />
            </ScalePressable>
        </ScalePressable>
    </View>
);

const JioSaavnItem = memo(JioSaavnItemComponent);
JioSaavnItem.displayName = 'JioSaavnItem';
