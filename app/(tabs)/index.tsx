import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';
import {
    ActivityIndicator,
    FlatList,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToPlaylistModal from '../../components/AddToPlaylistModal';
import { ActionDialog, ConfirmDialog, NoticeDialog } from '../../components/AppDialogs';
import ScalePressable from '../../components/ScalePressable';
import { SongItem, GridItem, SectionHeader } from '../../components/SongListItems';
import { CORE_COLORS, withAlpha } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';
import { useSafeRouterPush } from '../../hooks/useSafeRouterPush';



export default function LibraryScreen() {
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { colors, resolvedTheme } = useTheme();
    const safePush = useSafeRouterPush();
    
    const isSmall = screenWidth < 375;
    const scale = screenWidth / 375;
    const gridItemWidth = (screenWidth - 32 - (isSmall ? 12 : 16)) / (isSmall ? 2 : 3);
    const listItemHeight = Math.max(56, Math.min(64, 56 * scale));
    const styles = useMemo(() => createStyles(colors, isSmall, gridItemWidth), [colors, isSmall, gridItemWidth]);

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
        } catch {
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
                isLiked={likedIds.has(item.id)}
                showVideoBadges={showVideoBadges}
                colors={colors}
                styles={styles}
            />
        );
    }, [currentSong, selectedIds, isSelectionMode, isGrid, likedIds, colors, toggleSelection, onSongPress, enterSelectionMode, toggleLike, onMenuPress, showVideoBadges, styles]);


    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.screenBackground, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons 
                    name="musical-notes" 
                    size={isSmall ? 80 : 100} 
                    color={colors.accent} 
                    style={{ marginBottom: 20 }} 
                />
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={{ color: colors.textMuted, marginTop: 20, fontWeight: '600', fontSize: isSmall ? 14 : 16 }}>Scan in progress...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
            <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />

            <View style={[styles.bgGlow, { backgroundColor: colors.accent }]} />

            <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
                {isSelectionMode ? (
                    <View style={styles.selectionHeader}>
                        <TouchableOpacity onPress={exitSelectionMode} style={styles.headerBtn}>
                            <Ionicons name="close" size={isSmall ? 24 : 28} color={colors.text} />
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
                numColumns={isGrid ? (isSmall ? 2 : 3) : 1}
                data={sectionedData.items as any}
                renderItem={renderItem}
                keyExtractor={(item: any) => item.id || item.filename}
                extraData={[currentSong?.id, selectedIds, isSelectionMode, likedIds, showVideoBadges, colors.text, isGrid]}
                stickyHeaderIndices={isGrid ? [] : sectionedData.indices}
                contentContainerStyle={[styles.listContent, { paddingBottom: 160 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={15}
                initialNumToRender={20}
                windowSize={10}
                updateCellsBatchingPeriod={50}
                getItemLayout={(_, index) => ({
                    length: isGrid ? gridItemWidth + 16 : listItemHeight,
                    offset: (isGrid ? gridItemWidth + 16 : listItemHeight) * index,
                    index,
                })}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name={permissionGranted ? "musical-notes" : "lock-closed"} size={isSmall ? 60 : 80} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, marginTop: 20, fontSize: isSmall ? 14 : 16 }}>
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
        </View>
    );
}

function createStyles(colors: any, isSmall: boolean, gridItemWidth: number) {
    return StyleSheet.create({
        container: { flex: 1 },
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
            paddingHorizontal: isSmall ? 12 : 16,
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
            fontSize: isSmall ? 16 : 18,
            fontWeight: '700',
        },
        headerBtn: {
            width: isSmall ? 40 : 44,
            height: isSmall ? 40 : 44,
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerBtnText: {
            minHeight: 44,
            paddingHorizontal: 12,
            justifyContent: 'center',
        },
        headerSubtitle: {
            fontSize: isSmall ? 11 : 12,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: 2,
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
            fontSize: isSmall ? 32 : 36,
            fontWeight: '900',
            letterSpacing: -1,
        },
        countBadge: {
            borderRadius: 14,
            borderWidth: 1.5,
            paddingHorizontal: isSmall ? 10 : 12,
            paddingVertical: isSmall ? 5 : 6,
            marginRight: 10,
            justifyContent: 'center',
        },
        countBadgeText: {
            fontSize: isSmall ? 12 : 14,
            fontWeight: '800',
        },
        iconBtn: {
            width: isSmall ? 42 : 46,
            height: isSmall ? 42 : 46,
            borderRadius: isSmall ? 14 : 16,
            borderWidth: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        listContent: {
            paddingHorizontal: isSmall ? 12 : 16,
        },
        songItem: {
            marginBottom: 8,
            borderRadius: isSmall ? 14 : 16,
            overflow: 'hidden',
        },
        songContent: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
        },
        thumbnailContainer: {
            width: isSmall ? 42 : 48,
            height: isSmall ? 42 : 48,
            borderRadius: isSmall ? 10 : 12,
            marginRight: 10,
            overflow: 'hidden',
            elevation: 5,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
        },
        thumbnail: { width: '100%', height: '100%' },
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
        songInfo: { flex: 1 },
        likeBtn: { padding: 10, marginLeft: 8 },
        songTitle: {
            fontSize: isSmall ? 14 : 15,
            fontWeight: '700',
            marginBottom: 4,
        },
        songSubtitle: {
            fontSize: isSmall ? 12 : 13,
            fontWeight: '500',
        },
        menuBtn: { padding: 12 },
        emptyContainer: {
            alignItems: 'center',
            paddingTop: isSmall ? 80 : 116,
            opacity: 0.5,
        },
        selectionBar: {
            position: 'absolute',
            alignSelf: 'center',
            flexDirection: 'row',
            paddingHorizontal: isSmall ? 16 : 20,
            paddingVertical: isSmall ? 10 : 12,
            borderRadius: isSmall ? 16 : 18,
            elevation: 10,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
        },
        bulkActionBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: isSmall ? 16 : 20,
            paddingVertical: isSmall ? 8 : 10,
            borderRadius: isSmall ? 20 : 22,
        },
        bulkActionText: {
            fontWeight: '700',
            marginLeft: 8,
        },
        headerSection: {
            paddingVertical: 8,
            paddingHorizontal: isSmall ? 8 : 12,
            marginTop: 8,
        },
        headerSectionText: {
            fontSize: isSmall ? 12 : 13,
            fontWeight: '800',
            letterSpacing: 0.8,
            opacity: 0.9,
        },
        sortContainer: {
            flexDirection: 'row',
            gap: isSmall ? 6 : 8,
        },
        sortBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: isSmall ? 34 : 38,
            paddingHorizontal: isSmall ? 14 : 18,
            paddingVertical: isSmall ? 6 : 8,
            borderRadius: isSmall ? 18 : 20,
            borderWidth: 1,
            gap: 6,
        },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: isSmall ? 16 : 20,
            paddingVertical: isSmall ? 12 : 14,
            borderRadius: isSmall ? 18 : 22,
            borderWidth: 1,
            marginBottom: 20,
            shadowColor: CORE_COLORS.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
        },
        searchInput: {
            flex: 1,
            fontSize: isSmall ? 14 : 16,
            fontWeight: '500',
            padding: 0,
        },
        scrubberContainer: {
            position: 'absolute',
            right: 2,
            top: '25%',
            bottom: '25%',
            width: isSmall ? 24 : 28,
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 50,
            paddingVertical: 10,
            backgroundColor: withAlpha(CORE_COLORS.black, 0.1),
            borderRadius: isSmall ? 12 : 14,
        },
        scrubberLetter: {
            fontSize: isSmall ? 9 : 10,
            fontWeight: '800',
        },
        gridItem: {
            width: gridItemWidth,
            marginHorizontal: isSmall ? 2 : 4,
            marginBottom: isSmall ? 12 : 16,
            borderRadius: isSmall ? 10 : 12,
            padding: isSmall ? 4 : 6,
            alignItems: 'flex-start'
        },
        actionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 20,
            gap: 12,
        },
        shufflePlayBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: isSmall ? 48 : 54,
            borderRadius: isSmall ? 24 : 27,
            gap: 10,
            elevation: 8,
            shadowColor: CORE_COLORS.black,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 15,
        },
        shufflePlayText: {
            fontSize: isSmall ? 14 : 16,
            fontWeight: '900',
            letterSpacing: 0.5,
        },
        miniActionBtn: {
            width: isSmall ? 48 : 54,
            height: isSmall ? 48 : 54,
            borderRadius: isSmall ? 24 : 27,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
        },
        gridThumbnailContainer: {
            width: '100%',
            aspectRatio: 1,
            borderRadius: isSmall ? 8 : 10,
            marginBottom: 6,
            overflow: 'hidden',
            backgroundColor: withAlpha(CORE_COLORS.black, 0.03),
        },
        gridTitle: {
            fontSize: isSmall ? 11 : 12,
            fontWeight: '600',
            lineHeight: 16,
            paddingHorizontal: 2,
        },
        gridSubTitle: {
            fontSize: isSmall ? 9 : 10,
            fontWeight: '500',
            marginTop: 2,
            paddingHorizontal: 2,
        },
        sortText: {
            fontSize: isSmall ? 11 : 12,
            fontWeight: '700',
        },
        videoBadge: {
            borderRadius: 8,
            paddingHorizontal: isSmall ? 4 : 6,
            paddingVertical: 4,
            marginLeft: 8,
        },
    });
}
