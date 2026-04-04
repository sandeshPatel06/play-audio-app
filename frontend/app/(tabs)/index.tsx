import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
    Dimensions,
    FlatList,
    Image,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToPlaylistModal from '../../components/AddToPlaylistModal';
import { ActionDialog, ConfirmDialog, NoticeDialog } from '../../components/AppDialogs';
import MiniPlayer from '../../components/MiniPlayer';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';
import { useSafeRouterPush } from '../../hooks/useSafeRouterPush';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 32 - 24) / 3; // 3 columns, 16px lateral padding, 4px margin around items

export default function LibraryScreen() {
    const insets = useSafeAreaInsets();
    const { colors, resolvedTheme } = useTheme();
    const safePush = useSafeRouterPush();
    const {
        permissionGranted,
        setPermissionGranted,
        library,
        currentSong,
        setCurrentIndex,
        startQueuePlayback,
        refreshLibrary,
        autoOpenPlayerOnPlay,
        showVideoBadges,
        deleteSong,
        deleteSongs,
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
    const [filterType, setFilterType] = useState<'all' | 'audio' | 'video'>('all');

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

    const [searchQuery, setSearchQuery] = useState('');
    const [isGrid, setIsGrid] = useState(false);
    const flatListRef = React.useRef<FlatList>(null);
    const scrubberContainerLayout = React.useRef({ y: 0, height: 100 });

    const sortedSongs = useMemo(() => {
        let filtered = library;
        if (filterType === 'audio') {
            filtered = library.filter(a => a.mediaType === 'audio');
        } else if (filterType === 'video') {
            filtered = library.filter(a => a.mediaType === 'video');
        }

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(a => a.filename.toLowerCase().includes(query));
        }

        const sorted = [...filtered];
        if (sortBy === 'name') {
            sorted.sort((a, b) => a.filename.localeCompare(b.filename));
        } else if (sortBy === 'date') {
            sorted.sort((a, b) => b.creationTime - a.creationTime);
        } else if (sortBy === 'duration') {
            sorted.sort((a, b) => b.duration - a.duration);
        }
        return sorted;
    }, [library, sortBy, filterType, searchQuery]);

    const sectionedData = useMemo(() => {
        const sorted = sortedSongs;
        const items: (MediaLibrary.Asset | { type: 'header'; title: string; id: string })[] = [];
        const indices: number[] = [];
        const alphabetMap: Record<string, number> = {};

        if (sortBy === 'name') {
            let lastLetter = '';
            sorted.forEach((asset, index) => {
                const letter = asset.filename[0].toUpperCase();
                if (letter !== lastLetter) {
                    if (!isGrid) {
                        indices.push(items.length);
                        items.push({ type: 'header', title: letter, id: `header-${letter}` });
                    }
                    alphabetMap[letter] = isGrid ? index : (items.length - 1);
                    lastLetter = letter;
                }
                if (!isGrid) items.push(asset);
            });
            if (isGrid) items.push(...sorted);
        } else {
            return { items: sorted, indices: [], alphabetMap: {} };
        }
        return { items, indices, alphabetMap };
    }, [sortedSongs, sortBy, isGrid]);

    const availableLetters = useMemo(() => Object.keys(sectionedData.alphabetMap), [sectionedData.alphabetMap]);

    const handleScrub = useCallback((pageY: number) => {
        if (availableLetters.length === 0) return;
        const { y, height } = scrubberContainerLayout.current;
        const relativeY = pageY - y;
        const ratio = Math.max(0, Math.min(1, relativeY / height));
        const letterIndex = Math.min(Math.floor(ratio * availableLetters.length), availableLetters.length - 1);
        const letter = availableLetters[letterIndex];
        const flatIndex = sectionedData.alphabetMap[letter];
        
        if (flatIndex !== undefined && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index: flatIndex, animated: false });
            Haptics.selectionAsync();
        }
    }, [availableLetters, sectionedData.alphabetMap]);

    const scrubberPanResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => handleScrub(evt.nativeEvent.pageY),
        onPanResponderMove: (evt) => handleScrub(evt.nativeEvent.pageY)
    }), [handleScrub]);

    const toggleSelection = useCallback((id: string) => {
        Haptics.selectionAsync();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const enterSelectionMode = useCallback((id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSelectionMode(true);
        setSelectedIds(new Set([id]));
    }, []);

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
        const result = await deleteSongs(assetsToDelete);
        if (result.deletedCount > 0) {
            exitSelectionMode();
        }
        if (!result.success) {
            setNoticeState({
                visible: true,
                title: result.deletedCount > 0 ? 'Partial Delete' : 'Error',
                message: result.deletedCount > 0
                    ? `${result.deletedCount} songs deleted, ${result.failedCount} failed.`
                    : 'Bulk delete failed',
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

    const onSongPress = useCallback(async (item: MediaLibrary.Asset) => {
        Haptics.selectionAsync();
        const actualIndex = sortedSongs.findIndex((song) => song.id === item.id);
        if (actualIndex >= 0) {
            await startQueuePlayback(sortedSongs, actualIndex);
            setCurrentIndex(actualIndex);
        }
        if (autoOpenPlayerOnPlay) {
            safePush('/player');
        }
    }, [autoOpenPlayerOnPlay, safePush, setCurrentIndex, sortedSongs, startQueuePlayback]);

    const onMenuPress = useCallback((item: MediaLibrary.Asset) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedAsset(item);
        setIsActionVisible(true);
    }, []);

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

        if (isGrid) {
            return (
                <GridItem
                    asset={item as MediaLibrary.Asset}
                    isActive={currentSong?.id === item.id}
                    isSelected={selectedIds.has(item.id)}
                    isSelectionMode={isSelectionMode}
                    onPress={() => {
                        if (isSelectionMode) toggleSelection(item.id);
                        else onSongPress(item);
                    }}
                    onLongPress={() => !isSelectionMode && enterSelectionMode(item.id)}
                    colors={colors}
                    styles={styles}
                />
            );
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
                colors={colors}
                styles={styles}
            />
        );
    }, [currentSong, selectedIds, isSelectionMode, isGrid, likedIds, colors, toggleSelection, onSongPress, enterSelectionMode, toggleLike, onMenuPress, showVideoBadges]);


    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{ color: colors.textMuted, marginTop: 20 }}>Loading your library...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
            <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />

            <View style={[styles.bgGlow, { backgroundColor: colors.accent }]} />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
                            <View style={{ flex: 1, marginRight: 16 }}>
                                <Text style={[styles.headerEyebrow, { color: colors.accent }]}>Your Media</Text>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>Library</Text>
                            </View>
                            <View style={[styles.countBadge, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                                <Text style={[styles.countBadgeText, { color: colors.accent }]}>{sortedSongs.length}</Text>
                            </View>
                            <ScalePressable
                                style={[styles.iconBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsGrid(!isGrid); }}
                            >
                                <Ionicons name={isGrid ? "list" : "grid"} size={20} color={colors.text} />
                            </ScalePressable>
                        </View>
                        <View style={[styles.searchBar, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                            <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
                            <TextInput 
                                style={[styles.searchInput, { color: colors.text }]} 
                                placeholder="Search your library..." 
                                placeholderTextColor={colors.textMuted} 
                                value={searchQuery} 
                                onChangeText={setSearchQuery} 
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortContainer}>
                            <ScalePressable
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortBy('name'); }}
                                style={[styles.sortBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, sortBy === 'name' && { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}
                            >
                                <Ionicons name="text-outline" size={14} color={sortBy === 'name' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: sortBy === 'name' ? colors.accent : colors.textMuted }]}>Name</Text>
                            </ScalePressable>
                            <ScalePressable
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortBy('date'); }}
                                style={[styles.sortBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, sortBy === 'date' && { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}
                            >
                                <Ionicons name="calendar-outline" size={14} color={sortBy === 'date' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: sortBy === 'date' ? colors.accent : colors.textMuted }]}>Recent</Text>
                            </ScalePressable>
                            <ScalePressable
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortBy('duration'); }}
                                style={[styles.sortBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, sortBy === 'duration' && { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}
                            >
                                <Ionicons name="time-outline" size={14} color={sortBy === 'duration' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: sortBy === 'duration' ? colors.accent : colors.textMuted }]}>Length</Text>
                            </ScalePressable>

                            <View style={{ width: 1, height: 20, backgroundColor: colors.textMuted, marginHorizontal: 4, alignSelf: 'center', opacity: 0.3 }} />

                            <ScalePressable
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterType('all'); }}
                                style={[styles.sortBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, filterType === 'all' && { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}
                            >
                                <Ionicons name="albums-outline" size={14} color={filterType === 'all' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: filterType === 'all' ? colors.accent : colors.textMuted }]}>All</Text>
                            </ScalePressable>
                            <ScalePressable
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterType('audio'); }}
                                style={[styles.sortBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, filterType === 'audio' && { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}
                            >
                                <Ionicons name="musical-notes-outline" size={14} color={filterType === 'audio' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: filterType === 'audio' ? colors.accent : colors.textMuted }]}>Audio</Text>
                            </ScalePressable>
                            <ScalePressable
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterType('video'); }}
                                style={[styles.sortBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }, filterType === 'video' && { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}
                            >
                                <Ionicons name="videocam-outline" size={14} color={filterType === 'video' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: filterType === 'video' ? colors.accent : colors.textMuted }]}>Video</Text>
                            </ScalePressable>
                        </ScrollView>
                    </>
                )}
            </View>

            <FlatList
                ref={flatListRef}
                key={isGrid ? 'grid' : 'list'}
                numColumns={isGrid ? 3 : 1}
                data={sectionedData.items as any}
                renderItem={renderItem}
                keyExtractor={(item: any) => item.id || item.filename}
                extraData={[currentSong?.id, selectedIds, isSelectionMode, likedIds, showVideoBadges, colors.text, isGrid]}
                stickyHeaderIndices={isGrid ? [] : sectionedData.indices}
                contentContainerStyle={[styles.listContent, { paddingBottom: 168 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={15}
                initialNumToRender={20}
                windowSize={10}
                updateCellsBatchingPeriod={50}
                getItemLayout={(_, index) => ({
                    length: isGrid ? GRID_ITEM_WIDTH + 16 : 64,
                    offset: (isGrid ? GRID_ITEM_WIDTH + 16 : 64) * index,
                    index,
                })}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name={permissionGranted ? "musical-notes" : "lock-closed"} size={80} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, marginTop: 20 }}>
                            {permissionGranted ? "No songs found on this device" : "Permission required to load songs"}
                        </Text>
                        {!permissionGranted && (
                            <TouchableOpacity onPress={checkPermissions} style={{ marginTop: 16 }}>
                                <Text style={{ color: colors.accent, fontWeight: '700' }}>Grant Permission</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            {!isGrid && sortBy === 'name' && availableLetters.length > 0 && (
                <View 
                    style={styles.scrubberContainer}
                    onLayout={(e) => { scrubberContainerLayout.current = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height }; }}
                    {...scrubberPanResponder.panHandlers}
                >
                    {availableLetters.map(letter => (
                        <Text key={letter} style={[styles.scrubberLetter, { color: colors.accent }]}>{letter}</Text>
                    ))}
                </View>
            )}

            {isSelectionMode && (
                <View style={[styles.selectionBar, { bottom: 100 + insets.bottom, backgroundColor: colors.surface }]}>
                    <ScalePressable
                        style={[styles.bulkActionBtn, { backgroundColor: colors.dangerSurface }]}
                        onPress={handleBulkDelete}
                        disabled={selectedIds.size === 0}
                    >
                        <Ionicons name="trash-outline" size={20} color={selectedIds.size > 0 ? colors.danger : colors.textMuted} />
                        <Text style={[styles.bulkActionText, { color: selectedIds.size > 0 ? colors.danger : colors.textMuted }]}>
                            Delete ({selectedIds.size})
                        </Text>
                    </ScalePressable>
                </View>
            )}

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
                            // Give Android time to fully dismiss the first modal before opening the next
                            setTimeout(() => setIsAddPlaylistVisible(true), 500);
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
        </View>
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
        paddingBottom: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    selectionHeader: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectionCount: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBtnText: {
        minHeight: 44,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
    },
    headerEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 1,
    },
    countBadge: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 8,
        justifyContent: 'center',
    },
    countBadgeText: {
        fontSize: 14,
        fontWeight: '800',
    },
    iconBtn: {
        width: 46,
        height: 46,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
    },
    songItem: {
        marginBottom: 8,
        borderRadius: 16,
        overflow: 'hidden',
    },
    songContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    thumbnailContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        marginRight: 10,
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
        padding: 10,
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
        padding: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 116,
        opacity: 0.5,
    },
    selectionBar: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 18,
        elevation: 10,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    bulkActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 22,
    },
    bulkActionText: {
        fontWeight: '700',
        marginLeft: 8,
    },
    headerSection: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 8,
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
        minHeight: 38,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        padding: 0,
        paddingVertical: 0, // Android fix
    },
    scrubberContainer: {
        position: 'absolute',
        right: 2,
        top: '25%', 
        bottom: '25%', 
        width: 28,
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 14,
    },
    scrubberLetter: {
        fontSize: 10,
        fontWeight: '800',
    },
    gridItem: {
        width: GRID_ITEM_WIDTH,
        marginHorizontal: 4,
        marginBottom: 16,
        borderRadius: 12,
        padding: 6,
        alignItems: 'flex-start'
    },
    gridThumbnailContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 10,
        marginBottom: 8,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    gridTitle: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
        paddingHorizontal: 2,
    },
    gridSubTitle: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
        paddingHorizontal: 2,
    },
    sortText: {
        fontSize: 12,
        fontWeight: '700',
    },
    videoBadge: {
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 4,
        marginLeft: 8,
    },

});

const SectionHeaderComponent = ({ title, colors, styles }: any) => (
    <View style={[styles.headerSection, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerSectionText, { color: colors.accent }]}>{title}</Text>
    </View>
);

const SectionHeader = memo(SectionHeaderComponent);
SectionHeader.displayName = 'SectionHeader';

const SongItemComponent = ({
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
    colors,
    styles
}: any) => (
    <View>
        <ScalePressable
            style={[
                styles.songItem,
                isActive && !isSelectionMode && { backgroundColor: colors.activeRowBackground },
                isSelected && { backgroundColor: colors.accentSurface, borderColor: colors.accent, borderWidth: 1 }
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
        >
            <View style={[styles.songContent, { backgroundColor: colors.screenSurface }]}>
                <View style={[styles.thumbnailContainer, { shadowColor: colors.accent }]}>
                    <Image
                        source={require('../../assets/images/placeholder.png')}
                        style={styles.thumbnail}
                    />
                    {isActive && !isSelectionMode && (
                        <View style={[styles.activeOverlay, { backgroundColor: colors.activeOverlay }]}>
                            <Ionicons name="stats-chart" size={20} color={colors.accent} />
                        </View>
                    )}
                    {isSelectionMode && (
                        <View style={[styles.selectionOverlay, { backgroundColor: isSelected ? colors.accent : colors.selectionOverlay }]}>
                            <Ionicons
                                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                size={24}
                                color={isSelected ? colors.onAccent : colors.text}
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
                        {showVideoBadges && /\.(mp4|m4v|mov|webm|m3u8)$/i.test(`${asset.filename} ${asset.uri}`) && (
                            <View style={[styles.videoBadge, { backgroundColor: colors.accentSurface }]}>
                                <Ionicons name="videocam" size={12} color={colors.accent} />
                            </View>
                        )}
                    </View>
                    <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                        {Math.floor(asset.duration / 60)}:{(asset.duration % 60).toFixed(0).padStart(2, '0')}
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
);

const SongItem = memo(SongItemComponent);
SongItem.displayName = 'SongItem';

const GridItemComponent = ({ asset, isActive, isSelected, isSelectionMode, onPress, onLongPress, colors, styles }: any) => {
    return (
        <ScalePressable
            style={[
                styles.gridItem,
                isActive && !isSelectionMode && { backgroundColor: colors.activeRowBackground },
                isSelected && { backgroundColor: colors.accentSurface, borderColor: colors.accent, borderWidth: 1 }
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
        >
            <View style={[styles.gridThumbnailContainer, isSelected && { borderWidth: 2, borderColor: colors.accent }]}>
                <Image source={require('../../assets/images/placeholder.png')} style={styles.thumbnail} />
                {isActive && !isSelectionMode && (
                    <View style={[styles.activeOverlay, { backgroundColor: colors.activeOverlay }]}>
                         <Ionicons name="stats-chart" size={24} color={colors.accent} />
                    </View>
                )}
                {isSelectionMode && (
                     <View style={[styles.selectionOverlay, { backgroundColor: isSelected ? colors.accent : colors.selectionOverlay }]}>
                         <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={22} color={isSelected ? colors.onAccent : colors.text} />
                     </View>
                )}
            </View>
            <View style={{ width: '100%' }}>
                <Text numberOfLines={1} style={[styles.gridTitle, { color: (isActive && !isSelectionMode) || isSelected ? colors.accent : colors.text }]}>
                    {asset.filename}
                </Text>
                <Text style={[styles.gridSubTitle, { color: colors.textMuted }]}>
                    {Math.floor(asset.duration / 60)}:{(asset.duration % 60).toFixed(0).padStart(2, '0')}
                </Text>
            </View>
        </ScalePressable>
    )
};
const GridItem = memo(GridItemComponent);
GridItem.displayName = 'GridItem';
