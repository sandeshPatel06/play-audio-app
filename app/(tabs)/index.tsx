import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToPlaylistModal from '../../components/AddToPlaylistModal';
import { ActionDialog, ConfirmDialog, NoticeDialog } from '../../components/AppDialogs';
import MiniPlayer from '../../components/MiniPlayer';
import PaginationControls from '../../components/PaginationControls';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';
import { useSafeRouterPush } from '../../hooks/useSafeRouterPush';

const SONGS_PER_PAGE = 20;

export default function LibraryScreen() {
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();
    const isLight = theme === 'light';
    const gradientColors = isLight
        ? [colors.background, '#EAF1FF', '#F8FAFF']
        : [colors.background, '#0D1524', '#070B14'];
    const panelBg = isLight ? 'rgba(17,24,39,0.05)' : 'rgba(255,255,255,0.08)';
    const panelBorder = isLight ? 'rgba(17,24,39,0.12)' : 'rgba(255,255,255,0.12)';
    const songCardBg = isLight ? colors.surface : '#111827';
    const safePush = useSafeRouterPush();
    const {
        setPermissionGranted,
        library,
        currentSong,
        setCurrentIndex,
        startQueuePlayback,
        refreshLibrary,
        autoOpenPlayerOnPlay,
        showVideoBadges,
        deleteSong,
        likedIds,
        toggleLike,
        playlists,
        addToPlaylist
    } = useAudio();

    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<MediaLibrary.Asset | null>(null);
    const [isAddPlaylistVisible, setIsAddPlaylistVisible] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'duration'>('name');
    const [currentPage, setCurrentPage] = useState(1);
    const [isActionVisible, setIsActionVisible] = useState(false);
    const [confirmState, setConfirmState] = useState<{ visible: boolean; title: string; message: string; onConfirm: () => void }>({
        visible: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });
    const [noticeState, setNoticeState] = useState<{ visible: boolean; title: string; message: string }>({
        visible: false,
        title: '',
        message: '',
    });

    const sortedSongs = useMemo(() => {
        const sorted = [...library];
        if (sortBy === 'name') {
            sorted.sort((a, b) => a.filename.localeCompare(b.filename));
        } else if (sortBy === 'date') {
            sorted.sort((a, b) => b.creationTime - a.creationTime);
        } else if (sortBy === 'duration') {
            sorted.sort((a, b) => b.duration - a.duration);
        }
        return sorted;
    }, [library, sortBy]);

    const totalPages = Math.max(1, Math.ceil(sortedSongs.length / SONGS_PER_PAGE));

    const pagedSongs = useMemo(() => {
        const start = (currentPage - 1) * SONGS_PER_PAGE;
        return sortedSongs.slice(start, start + SONGS_PER_PAGE);
    }, [sortedSongs, currentPage]);

    const sectionedData = useMemo(() => {
        const sorted = pagedSongs;

        const items: (MediaLibrary.Asset | { type: 'header'; title: string; id: string })[] = [];
        const indices: number[] = [];

        if (sortBy === 'name') {
            let lastLetter = '';
            sorted.forEach((asset) => {
                const letter = asset.filename[0].toUpperCase();
                if (letter !== lastLetter) {
                    indices.push(items.length);
                    items.push({ type: 'header', title: letter, id: `header-${letter}` });
                    lastLetter = letter;
                }
                items.push(asset);
            });
        } else {
            // For Date or Duration, just flat but we could add a "All Songs" header
            return { items: sorted, indices: [] };
        }
        return { items, indices };
    }, [pagedSongs, sortBy]);

    useEffect(() => {
        setCurrentPage(1);
    }, [sortBy, library.length]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const toggleSelection = (id: string) => {
        Haptics.selectionAsync();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const enterSelectionMode = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSelectionMode(true);
        setSelectedIds(new Set([id]));
    };

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleBulkDelete = () => {
        setConfirmState({
            visible: true,
            title: 'Bulk Delete',
            message: `Are you sure you want to delete ${selectedIds.size} songs?`,
            onConfirm: performBulkDelete,
        });
    };

    const performBulkDelete = async () => {
        setConfirmState((prev) => ({ ...prev, visible: false }));
        setLoading(true);
        const assetsToDelete = library.filter(item => selectedIds.has(item.id));
        const success = await MediaLibrary.deleteAssetsAsync(assetsToDelete);
        if (success) {
            await refreshLibrary();
            exitSelectionMode();
        } else {
            setNoticeState({
                visible: true,
                title: 'Error',
                message: 'Bulk delete failed',
            });
        }
        setLoading(false);
    };

    const selectAll = () => {
        if (selectedIds.size === library.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(library.map(s => s.id)));
        }
    };

    const checkPermissions = useCallback(async () => {
        if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
            setPermissionGranted(false);
            setNoticeState({
                visible: true,
                title: 'Expo Go Limitation',
                message: 'Audio media permission is not available in Expo Go. Install a development build to scan songs.',
            });
            setLoading(false);
            return;
        }

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
                setPermissionGranted(true);
                await refreshLibrary();
            } else {
                setPermissionGranted(false);
            }
        } catch (error) {
            console.error('Permission request failed:', error);
            setPermissionGranted(false);
            setNoticeState({
                visible: true,
                title: 'Permission Error',
                message: 'Media permission is unavailable in this runtime. Use a development build instead of Expo Go.',
            });
        }
        setLoading(false);
    }, [refreshLibrary, setPermissionGranted]);

    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);

    const onSongPress = async (item: MediaLibrary.Asset) => {
        Haptics.selectionAsync();
        const actualIndex = sortedSongs.findIndex((song) => song.id === item.id);
        if (actualIndex >= 0) {
            await startQueuePlayback(sortedSongs, actualIndex);
            setCurrentIndex(actualIndex);
        }
        if (autoOpenPlayerOnPlay) {
            safePush('/player');
        }
    };

    const onMenuPress = (item: MediaLibrary.Asset) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedAsset(item);
        setIsActionVisible(true);
    };

    const confirmDelete = (item: MediaLibrary.Asset) => {
        setConfirmState({
            visible: true,
            title: 'Delete Song',
            message: `Are you sure you want to permanently delete "${item.filename}"?`,
            onConfirm: () => handleDelete(item),
        });
    };

    const handleDelete = async (item: MediaLibrary.Asset) => {
        setConfirmState((prev) => ({ ...prev, visible: false }));
        const success = await deleteSong(item);
        if (!success) {
            setNoticeState({
                visible: true,
                title: 'Error',
                message: 'Could not delete the file.',
            });
        }
    };

    const renderItem = useCallback(({ item }: { item: any }) => {
        if (item.type === 'header') {
            return <SectionHeader title={item.title} colors={colors} styles={styles} />;
        }

        return (
            <SongItem
                asset={item as MediaLibrary.Asset}
                isActive={currentSong?.id === item.id}
                isSelected={selectedIds.has(item.id)}
                isSelectionMode={isSelectionMode}
                onPress={() => {
                    if (isSelectionMode) toggleSelection(item.id);
                    else onSongPress(item);
                }}
                onLongPress={() => !isSelectionMode && enterSelectionMode(item.id)}
                onLike={() => toggleLike(item.id)}
                onMenu={() => onMenuPress(item)}
                isLiked={likedIds.includes(item.id)}
                showVideoBadges={showVideoBadges}
                isLight={isLight}
                songCardBg={songCardBg}
                colors={colors}
                styles={styles}
            />
        );
    }, [currentSong, selectedIds, isSelectionMode, likedIds, colors, toggleSelection, onSongPress, enterSelectionMode, toggleLike, onMenuPress, showVideoBadges, isLight, songCardBg]);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{ color: colors.textMuted, marginTop: 20 }}>Loading your library...</Text>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={gradientColors}
            style={styles.container}
        >
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

            <View style={[styles.bgGlow, { backgroundColor: colors.accent }]} />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                {isSelectionMode ? (
                    <View style={styles.selectionHeader}>
                        <TouchableOpacity onPress={exitSelectionMode} style={styles.headerBtn}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.selectionCount, { color: colors.text }]}>
                            {selectedIds.size} Selected
                        </Text>
                        <TouchableOpacity onPress={selectAll} style={styles.headerBtnText}>
                            <Text style={{ color: colors.accent, fontWeight: '700' }}>
                                {selectedIds.size === library.length ? 'None' : 'All'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.headerTop}>
                            <View>
                                <Text style={[styles.headerSubtitle, { color: colors.accent }]}>Library</Text>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>Your Library</Text>
                            </View>
                            <ScalePressable
                                style={[styles.iconBtn, { backgroundColor: panelBg, borderColor: panelBorder }]}
                                onPress={() => safePush('/search')}
                            >
                                <Ionicons name="search" size={24} color={colors.text} />
                            </ScalePressable>
                        </View>
                        <View style={styles.sortContainer}>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSortBy('name');
                                }}
                                style={[styles.sortBtn, { backgroundColor: panelBg, borderColor: panelBorder }, sortBy === 'name' && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}
                            >
                                <Ionicons name="text-outline" size={14} color={sortBy === 'name' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: sortBy === 'name' ? colors.accent : colors.textMuted }]}>Name</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSortBy('date');
                                }}
                                style={[styles.sortBtn, { backgroundColor: panelBg, borderColor: panelBorder }, sortBy === 'date' && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}
                            >
                                <Ionicons name="calendar-outline" size={14} color={sortBy === 'date' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: sortBy === 'date' ? colors.accent : colors.textMuted }]}>Recent</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSortBy('duration');
                                }}
                                style={[styles.sortBtn, { backgroundColor: panelBg, borderColor: panelBorder }, sortBy === 'duration' && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}
                            >
                                <Ionicons name="time-outline" size={14} color={sortBy === 'duration' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: sortBy === 'duration' ? colors.accent : colors.textMuted }]}>Length</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>

            <FlashList
                data={sectionedData.items as any}
                renderItem={renderItem}
                keyExtractor={(item: any) => item.id || item.filename}
                getItemType={(item: any) => (item.type === 'header' ? 'header' : 'row')}
                stickyHeaderIndices={sectionedData.indices}
                contentContainerStyle={[styles.listContent, { paddingBottom: 160 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="musical-notes" size={80} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, marginTop: 20 }}>No songs found on this device</Text>
                    </View>
                }
                ListFooterComponent={
                    sectionedData.items.length > 0 ? (
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

            {isSelectionMode && (
                <View style={[styles.selectionBar, { bottom: 100 + insets.bottom, backgroundColor: colors.surface }]}>
                    <ScalePressable
                        style={[styles.bulkActionBtn, { backgroundColor: 'rgba(255,59,48,0.1)' }]}
                        onPress={handleBulkDelete}
                        disabled={selectedIds.size === 0}
                    >
                        <Ionicons name="trash-outline" size={20} color={selectedIds.size > 0 ? "#FF3B30" : colors.textMuted} />
                        <Text style={[styles.bulkActionText, { color: selectedIds.size > 0 ? "#FF3B30" : colors.textMuted }]}>
                            Delete ({selectedIds.size})
                        </Text>
                    </ScalePressable>
                </View>
            )}

            <AddToPlaylistModal
                visible={isAddPlaylistVisible}
                onClose={() => setIsAddPlaylistVisible(false)}
                playlists={playlists}
                onSelect={(playlistId: string) => {
                    if (selectedAsset) {
                        addToPlaylist(playlistId, selectedAsset.id);
                        setIsAddPlaylistVisible(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                }}
            />

            <ActionDialog
                visible={isActionVisible}
                title={selectedAsset?.filename || 'Song'}
                message="Manage this song"
                onClose={() => setIsActionVisible(false)}
                actions={[
                    {
                        key: 'playlist',
                        label: 'Add to Playlist',
                        icon: 'add-circle-outline',
                        onPress: () => {
                            setIsActionVisible(false);
                            setIsAddPlaylistVisible(true);
                        },
                    },
                    {
                        key: 'delete',
                        label: 'Delete',
                        icon: 'trash-outline',
                        danger: true,
                        onPress: () => {
                            setIsActionVisible(false);
                            if (selectedAsset) {
                                confirmDelete(selectedAsset);
                            }
                        },
                    },
                ]}
            />

            <ConfirmDialog
                visible={confirmState.visible}
                title={confirmState.title}
                message={confirmState.message}
                onClose={() => setConfirmState((prev) => ({ ...prev, visible: false }))}
                onConfirm={confirmState.onConfirm}
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
    bgGlow: {
        position: 'absolute',
        top: -140,
        left: -80,
        width: 360,
        height: 360,
        borderRadius: 180,
        opacity: 0.11,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    selectionHeader: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectionCount: {
        fontSize: 17,
        fontWeight: '700',
    },
    headerBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBtnText: {
        paddingHorizontal: 10,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '800',
    },
    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
    },
    songItem: {
        marginBottom: 10,
        borderRadius: 14,
        overflow: 'hidden',
    },
    songContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 11,
    },
    thumbnailContainer: {
        width: 54,
        height: 54,
        borderRadius: 12,
        marginRight: 14,
        overflow: 'hidden',
        elevation: 5,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    activeOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    songInfo: {
        flex: 1,
    },
    likeBtn: {
        padding: 8,
        marginLeft: 8,
    },
    songTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    songSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    menuBtn: {
        padding: 10,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 100,
        opacity: 0.5,
    },
    selectionBar: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 16,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    bulkActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    bulkActionText: {
        fontWeight: '700',
        marginLeft: 8,
    },
    headerSection: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginTop: 6,
    },
    headerSectionText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.8,
        opacity: 0.9,
    },
    sortContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        gap: 6,
    },
    sortText: {
        fontSize: 12,
        fontWeight: '700',
    },
    videoBadge: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
    },
    videoBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});

const SectionHeader = memo(({ title, colors, styles }: any) => (
    <View style={[styles.headerSection, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerSectionText, { color: colors.accent }]}>{title}</Text>
    </View>
));

const SongItem = memo(({
    asset,
    isActive,
    isSelected,
    isSelectionMode,
    onPress,
    onLongPress,
    onLike,
    onMenu,
    isLiked,
    showVideoBadges,
    isLight,
    songCardBg,
    colors,
    styles
}: any) => (
    <View>
        <ScalePressable
            style={[
                styles.songItem,
                isActive && !isSelectionMode && { backgroundColor: isLight ? `${colors.accent}12` : 'rgba(255,255,255,0.08)', borderColor: colors.accent, borderWidth: 1 },
                isSelected && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent, borderWidth: 1 }
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
        >
            <View style={[styles.songContent, { backgroundColor: songCardBg }]}>
                <View style={[styles.thumbnailContainer, { shadowColor: colors.accent }]}>
                    <Image
                        source={require('../../assets/images/placeholder.png')}
                        style={styles.thumbnail}
                    />
                    {isActive && !isSelectionMode && (
                        <View style={[styles.activeOverlay, { backgroundColor: isLight ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }]}>
                            <Ionicons name="stats-chart" size={20} color={colors.accent} />
                        </View>
                    )}
                    {isSelectionMode && (
                        <View style={[styles.selectionOverlay, { backgroundColor: isSelected ? colors.accent : (isLight ? 'rgba(17,24,39,0.18)' : 'rgba(0,0,0,0.4)') }]}>
                            <Ionicons
                                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                size={24}
                                color={isSelected ? '#FFF' : (isLight ? '#111827' : '#FFF')}
                            />
                        </View>
                    )}
                </View>

                <View style={styles.songInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text
                            numberOfLines={1}
                            style={[styles.songTitle, { color: (isActive && !isSelectionMode) || isSelected ? colors.accent : colors.text, flex: 1 }]}
                        >
                            {asset.filename}
                        </Text>
                        {showVideoBadges && /\.(mp4|m4v|mov|webm|m3u8)$/i.test(asset.filename || asset.uri || '') && (
                            <View style={[styles.videoBadge, { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}>
                                <Text style={[styles.videoBadgeText, { color: colors.accent }]}>VIDEO</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.songSubtitle, { color: colors.textMuted }]}>
                        Sonic Flow • {Math.floor(asset.duration / 60)}:{(asset.duration % 60).toFixed(0).padStart(2, '0')}
                    </Text>
                </View>

                {!isSelectionMode && (
                    <ScalePressable
                        onPress={onLike}
                        style={styles.likeBtn}
                    >
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={22}
                            color={isLiked ? colors.accent : colors.textMuted}
                        />
                    </ScalePressable>
                )}

                {!isSelectionMode && (
                    <TouchableOpacity
                        onPress={onMenu}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.menuBtn}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>
        </ScalePressable>
    </View>
));
