import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
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
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToPlaylistModal from '../../components/AddToPlaylistModal';
import MiniPlayer from '../../components/MiniPlayer';
import RenameModal from '../../components/RenameModal';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';

export default function LibraryScreen() {
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();
    const router = useRouter();
    const {
        setPermissionGranted,
        queue,
        currentSong,
        loadAudio,
        setCurrentIndex,
        refreshLibrary,
        deleteSong,
        renameSong,
        likedIds,
        toggleLike,
        playlists,
        addToPlaylist
    } = useAudio();

    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<MediaLibrary.Asset | null>(null);
    const [isRenameVisible, setIsRenameVisible] = useState(false);
    const [isAddPlaylistVisible, setIsAddPlaylistVisible] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'duration'>('name');

    const sectionedData = useMemo(() => {
        let sorted = [...queue];
        if (sortBy === 'name') {
            sorted.sort((a, b) => a.filename.localeCompare(b.filename));
        } else if (sortBy === 'date') {
            sorted.sort((a, b) => b.creationTime - a.creationTime);
        } else if (sortBy === 'duration') {
            sorted.sort((a, b) => b.duration - a.duration);
        }

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
    }, [queue, sortBy]);

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
        Alert.alert(
            "Bulk Delete",
            `Are you sure you want to delete ${selectedIds.size} songs?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: performBulkDelete }
            ]
        );
    };

    const performBulkDelete = async () => {
        setLoading(true);
        const assetsToDelete = queue.filter(item => selectedIds.has(item.id));
        const success = await MediaLibrary.deleteAssetsAsync(assetsToDelete);
        if (success) {
            await refreshLibrary();
            exitSelectionMode();
        } else {
            Alert.alert("Error", "Bulk delete failed");
        }
        setLoading(false);
    };

    const selectAll = () => {
        if (selectedIds.size === queue.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(queue.map(s => s.id)));
        }
    };

    const checkPermissions = useCallback(async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
            setPermissionGranted(true);
            await refreshLibrary();
        }
        setLoading(false);
    }, [refreshLibrary, setPermissionGranted]);

    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);

    const onSongPress = async (item: MediaLibrary.Asset, index: number) => {
        Haptics.selectionAsync();
        setCurrentIndex(index);
        await loadAudio(item);
        router.push('/player');
    };

    const onMenuPress = (item: MediaLibrary.Asset) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedAsset(item);
        Alert.alert(
            item.filename,
            "Manage this song",
            [
                { text: "Add to Playlist", onPress: () => setIsAddPlaylistVisible(true) },
                { text: "Rename", onPress: () => setIsRenameVisible(true) },
                { text: "Delete", style: "destructive", onPress: () => confirmDelete(item) },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const confirmDelete = (item: MediaLibrary.Asset) => {
        Alert.alert(
            "Delete Song",
            `Are you sure you want to permanently delete "${item.filename}"?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => handleDelete(item) }
            ]
        );
    };

    const handleDelete = async (item: MediaLibrary.Asset) => {
        const success = await deleteSong(item);
        if (!success) {
            Alert.alert("Error", "Could not delete the file.");
        }
    };

    const handleRename = async (newName: string) => {
        if (!selectedAsset) return;
        const success = await renameSong(selectedAsset, newName);
        if (success) {
            setIsRenameVisible(false);
            setSelectedAsset(null);
        } else {
            Alert.alert("Error", "Could not rename the file.");
        }
    };

    const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
        if (item.type === 'header') {
            return <SectionHeader title={item.title} colors={colors} styles={styles} />;
        }

        return (
            <SongItem
                asset={item as MediaLibrary.Asset}
                index={index}
                isActive={currentSong?.id === item.id}
                isSelected={selectedIds.has(item.id)}
                isSelectionMode={isSelectionMode}
                onPress={() => {
                    if (isSelectionMode) toggleSelection(item.id);
                    else onSongPress(item, index);
                }}
                onLongPress={() => !isSelectionMode && enterSelectionMode(item.id)}
                onLike={() => toggleLike(item.id)}
                onMenu={() => onMenuPress(item)}
                isLiked={likedIds.includes(item.id)}
                colors={colors}
                styles={styles}
            />
        );
    }, [currentSong, selectedIds, isSelectionMode, likedIds, colors, toggleSelection, onSongPress, enterSelectionMode, toggleLike, onMenuPress]);

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
            colors={[colors.background, '#121212', '#000000']}
            style={styles.container}
        >
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

            <View style={[styles.bgGlow, { backgroundColor: colors.accent }]} />

            <Animated.View
                entering={FadeInRight.delay(200).duration(800)}
                style={[styles.header, { paddingTop: insets.top + 10 }]}
            >
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
                                {selectedIds.size === queue.length ? 'None' : 'All'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.headerTop}>
                            <View>
                                <Text style={[styles.headerSubtitle, { color: colors.accent }]}>Welcome Back</Text>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>Your Library</Text>
                            </View>
                            <ScalePressable
                                style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                                onPress={() => router.push('/search')}
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
                                style={[styles.sortBtn, sortBy === 'name' && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}
                            >
                                <Ionicons name="text-outline" size={14} color={sortBy === 'name' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: sortBy === 'name' ? colors.accent : colors.textMuted }]}>Name</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSortBy('date');
                                }}
                                style={[styles.sortBtn, sortBy === 'date' && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}
                            >
                                <Ionicons name="calendar-outline" size={14} color={sortBy === 'date' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: sortBy === 'date' ? colors.accent : colors.textMuted }]}>Recent</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSortBy('duration');
                                }}
                                style={[styles.sortBtn, sortBy === 'duration' && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}
                            >
                                <Ionicons name="time-outline" size={14} color={sortBy === 'duration' ? colors.accent : colors.textMuted} />
                                <Text style={[styles.sortText, { color: sortBy === 'duration' ? colors.accent : colors.textMuted }]}>Length</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </Animated.View>

            {/* @ts-ignore */}
            <FlashList
                data={sectionedData.items as any}
                renderItem={renderItem}
                keyExtractor={(item: any) => item.id || item.filename}
                estimatedItemSize={85}
                getItemType={(item: any) => (item.type === 'header' ? 'header' : 'row')}
                stickyHeaderIndices={sectionedData.indices}
                contentContainerStyle={[styles.listContent, { paddingBottom: 160 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                            ALL SONGS ({queue.length})
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="musical-notes" size={80} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, marginTop: 20 }}>No songs found on this device</Text>
                    </View>
                }
            />

            {isSelectionMode && (
                <Animated.View
                    entering={FadeInDown}
                    exiting={FadeOut}
                    style={[styles.selectionBar, { bottom: 100 + insets.bottom, backgroundColor: colors.surface }]}
                >
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
                </Animated.View>
            )}

            <RenameModal
                visible={isRenameVisible}
                onClose={() => setIsRenameVisible(false)}
                onRename={handleRename}
                currentName={selectedAsset?.filename.substring(0, selectedAsset.filename.lastIndexOf('.')) || ''}
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
        top: -100,
        left: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        opacity: 0.08,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
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
        fontSize: 18,
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
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '800',
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
    },
    listHeader: {
        marginBottom: 10,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    songItem: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    songContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#121217', // subSurface
    },
    thumbnailContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginRight: 16,
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
        fontSize: 16,
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
        paddingVertical: 12,
        borderRadius: 30,
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
        paddingVertical: 12,
        paddingHorizontal: 10,
        marginTop: 10,
    },
    headerSectionText: {
        fontSize: 20,
        fontWeight: '800',
        opacity: 0.8,
    },
    sortContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        gap: 6,
    },
    sortText: {
        fontSize: 12,
        fontWeight: '700',
    },
});

const SectionHeader = memo(({ title, colors, styles }: any) => (
    <View style={[styles.headerSection, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerSectionText, { color: colors.accent }]}>{title}</Text>
    </View>
));

const SongItem = memo(({
    asset,
    index,
    isActive,
    isSelected,
    isSelectionMode,
    onPress,
    onLongPress,
    onLike,
    onMenu,
    isLiked,
    colors,
    styles
}: any) => (
    <Animated.View
        entering={FadeInDown.delay(Math.min(index * 20, 300)).springify()}
        exiting={FadeOut.duration(200)}
    >
        <ScalePressable
            style={[
                styles.songItem,
                isActive && !isSelectionMode && { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: colors.accent, borderWidth: 1 },
                isSelected && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent, borderWidth: 1 }
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
        >
            <View style={styles.songContent}>
                <View style={[styles.thumbnailContainer, { shadowColor: colors.accent }]}>
                    <Image
                        source={require('../../assets/images/placeholder.png')}
                        style={styles.thumbnail}
                    />
                    {isActive && !isSelectionMode && (
                        <View style={[styles.activeOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                            <Ionicons name="stats-chart" size={20} color={colors.accent} />
                        </View>
                    )}
                    {isSelectionMode && (
                        <View style={[styles.selectionOverlay, { backgroundColor: isSelected ? colors.accent : 'rgba(0,0,0,0.4)' }]}>
                            <Ionicons
                                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                size={24}
                                color="#FFF"
                            />
                        </View>
                    )}
                </View>

                <View style={styles.songInfo}>
                    <Text
                        numberOfLines={1}
                        style={[styles.songTitle, { color: (isActive && !isSelectionMode) || isSelected ? colors.accent : colors.text }]}
                    >
                        {asset.filename}
                    </Text>
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
    </Animated.View>
));
