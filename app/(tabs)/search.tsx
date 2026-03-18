import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionDialog, ConfirmDialog, NoticeDialog } from '../../components/AppDialogs';
import MiniPlayer from '../../components/MiniPlayer';
import PaginationControls from '../../components/PaginationControls';
import PlaylistNameModal from '../../components/PlaylistNameModal';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';
import { useSafeRouterPush } from '../../hooks/useSafeRouterPush';
import { useAudioStore } from '../../store/useAudioStore';

const SONGS_PER_PAGE = 20;

export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();
    const isLight = theme === 'light';
    const gradientColors = isLight
        ? [colors.background, '#EAF1FF', '#F8FAFF']
        : [colors.background, '#0D1524', '#070B14'];
    const panelBg = isLight ? 'rgba(17,24,39,0.05)' : 'rgba(255,255,255,0.05)';
    const panelBgStrong = isLight ? 'rgba(17,24,39,0.07)' : 'rgba(255,255,255,0.10)';
    const panelBorder = isLight ? 'rgba(17,24,39,0.12)' : 'rgba(255,255,255,0.12)';
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
    } = useAudio();
    const safePush = useSafeRouterPush();
    const [query, setQuery] = useState('');
    const [isCreatePlaylistVisible, setIsCreatePlaylistVisible] = useState(false);
    const [isPlaylistActionVisible, setIsPlaylistActionVisible] = useState(false);
    const [isDeletePlaylistVisible, setDeletePlaylistVisible] = useState(false);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [noticeState, setNoticeState] = useState<{ visible: boolean; title: string; message: string }>({
        visible: false,
        title: '',
        message: '',
    });

    const selectedPlaylist = useMemo(
        () => playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null,
        [playlists, selectedPlaylistId]
    );

    const filteredItems = useMemo(
        () => library.filter(item => item.filename.toLowerCase().includes(query.toLowerCase())),
        [library, query]
    );

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / SONGS_PER_PAGE));

    const pagedFilteredItems = useMemo(() => {
        const start = (currentPage - 1) * SONGS_PER_PAGE;
        return filteredItems.slice(start, start + SONGS_PER_PAGE);
    }, [filteredItems, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [query]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const openPlayerSafely = () => {
        safePush('/player');
    };

    const onSongPress = async (item: MediaLibrary.Asset) => {
        Haptics.selectionAsync();
        const index = library.findIndex(s => s.id === item.id);
        if (index >= 0) {
            await startQueuePlayback(library, index);
            if (autoOpenPlayerOnPlay) {
                openPlayerSafely();
            }
        }
    };

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
            isLiked={likedIds.includes(item.id)}
            showVideoBadges={showVideoBadges}
            colors={colors}
            styles={styles}
        />
    ), [likedIds, colors, toggleLike, onSongPress, showVideoBadges]);

    const renderSections = () => (
        <View style={styles.sections}>
            <ScalePressable
                style={[styles.sectionCard, { backgroundColor: colors.accent + (isLight ? '16' : '20') }]}
                onPress={async () => {
                    const started = await playLikedSongs();
                    if (started) {
                        if (autoOpenPlayerOnPlay) {
                            openPlayerSafely();
                        }
                    } else {
                        showNotice('No Liked Songs', 'Like songs first, then play them from here.');
                    }
                }}
            >
                <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons name="heart" size={24} color="#FFF" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Liked Songs</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                    {likedIds.length} tracks
                </Text>
            </ScalePressable>

            <View style={styles.playlistHeader}>
                <Text style={[styles.playlistHeaderText, { color: colors.text }]}>Your Playlists</Text>
                <TouchableOpacity onPress={() => setIsCreatePlaylistVisible(true)}>
                    <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
                </TouchableOpacity>
            </View>

            {playlists.map(p => (
                <View
                    key={p.id}
                    style={[styles.playlistItem, { backgroundColor: panelBg, borderColor: panelBorder }]}
                >
                    <ScalePressable
                        style={styles.playlistMain}
                        onPress={() => safePush(`/playlist/${p.id}`)}
                    >
                        <View style={[styles.playlistIcon, { backgroundColor: panelBgStrong }]}>
                            <Ionicons name="musical-notes" size={20} color={colors.accent} />
                        </View>
                        <View style={styles.playlistInfo}>
                            <Text style={[styles.playlistName, { color: colors.text }]}>{p.name}</Text>
                            <Text style={[styles.playlistMeta, { color: colors.textMuted }]}>
                                {p.assetIds.length} songs
                            </Text>
                        </View>
                    </ScalePressable>

                    <TouchableOpacity
                        onPress={() => openPlaylistActions(p.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.playlistMenuBtn}
                    >
                        <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            ))}

            {playlists.length === 0 && (
                <View style={[styles.emptyPlaylist, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.textMuted }}>Create your first playlist to get started.</Text>
                </View>
            )}
        </View>
    );

    return (
        <LinearGradient
            colors={gradientColors}
            style={styles.container}
        >
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Discover</Text>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: panelBgStrong, borderColor: panelBorder }]}>
                <Ionicons name="search" size={20} color={colors.textMuted} />
                <TextInput
                    placeholder="Artists, Songs, or Albums"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInput, { color: colors.text }]}
                    selectionColor={colors.accent}
                    value={query}
                    onChangeText={setQuery}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            <FlashList
                data={query ? pagedFilteredItems : []}
                renderItem={renderSearchItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={!query ? renderSections : null}
                ListEmptyComponent={query ? (
                    <View style={styles.empty}>
                        <Ionicons name="search-outline" size={60} color={colors.textMuted} style={{ opacity: 0.5 }} />
                        <Text style={{ color: colors.textMuted, marginTop: 20, fontSize: 16 }}>
                            No matching songs found
                        </Text>
                    </View>
                ) : null}
                contentContainerStyle={{ paddingBottom: 160 + insets.bottom, paddingHorizontal: 16 }}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    query && filteredItems.length > 0 ? (
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
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '800',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        height: 52,
        paddingHorizontal: 15,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        height: '100%',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    thumbnail: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginRight: 15,
    },
    resultInfo: {
        flex: 1,
        marginRight: 10,
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    sections: {
        marginBottom: 22,
    },
    sectionCard: {
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 22,
    },
    sectionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
    },
    sectionSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.7,
    },
    playlistHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    playlistHeaderText: {
        fontSize: 17,
        fontWeight: '800',
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
    },
    playlistMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    playlistMenuBtn: {
        padding: 8,
    },
    playlistIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    playlistInfo: {
        flex: 1,
    },
    playlistName: {
        fontSize: 15,
        fontWeight: '700',
    },
    playlistMeta: {
        fontSize: 12,
        marginTop: 2,
    },
    emptyPlaylist: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    videoBadge: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    videoBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});

const SearchItem = memo(({ item, onPress, onLike, isLiked, showVideoBadges, colors, styles }: any) => (
    <View>
        <ScalePressable
            onPress={onPress}
            style={[styles.resultItem, { borderBottomColor: colors.border }]}
        >
            <Image
                source={require('../../assets/images/placeholder.png')}
                style={styles.thumbnail}
            />
            <View style={styles.resultInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                        {item.filename}
                    </Text>
                    {showVideoBadges && /\.(mp4|m4v|mov|webm|m3u8)$/i.test(item.filename || item.uri || '') && (
                        <View style={[styles.videoBadge, { backgroundColor: `${colors.accent}25`, borderColor: colors.accent }]}>
                            <Text style={[styles.videoBadgeText, { color: colors.accent }]}>VIDEO</Text>
                        </View>
                    )}
                </View>
                <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                    Sonic Flow • {Math.floor(item.duration / 60)}:{(item.duration % 60).toFixed(0).padStart(2, '0')}
                </Text>
            </View>
            <ScalePressable onPress={onLike} style={{ padding: 10 }}>
                <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isLiked ? colors.accent : colors.textMuted}
                />
            </ScalePressable>
        </ScalePressable>
    </View>
));
