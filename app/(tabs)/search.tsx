import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useCallback, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreatePlaylistModal from '../../components/CreatePlaylistModal';
import MiniPlayer from '../../components/MiniPlayer';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';

export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();
    const {
        queue,
        loadAudio,
        setCurrentIndex,
        likedIds,
        toggleLike,
        playLikedSongs,
        playlists,
        playPlaylist,
        createPlaylist
    } = useAudio();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isCreatePlaylistVisible, setIsCreatePlaylistVisible] = useState(false);

    const filteredItems = queue.filter(item =>
        item.filename.toLowerCase().includes(query.toLowerCase())
    );

    const onSongPress = async (item: MediaLibrary.Asset) => {
        Haptics.selectionAsync();
        const index = queue.findIndex(s => s.id === item.id);
        setCurrentIndex(index);
        await loadAudio(item);
        router.push('/player');
    };

    const renderSearchItem = useCallback(({ item, index }: { item: MediaLibrary.Asset, index: number }) => (
        <SearchItem
            item={item}
            index={index}
            onPress={() => onSongPress(item)}
            onLike={() => toggleLike(item.id)}
            isLiked={likedIds.includes(item.id)}
            colors={colors}
            styles={styles}
        />
    ), [likedIds, colors, toggleLike, onSongPress]);

    const renderSections = () => (
        <View style={styles.sections}>
            <ScalePressable
                style={[styles.sectionCard, { backgroundColor: colors.accent + '20' }]}
                onPress={playLikedSongs}
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
                <ScalePressable
                    key={p.id}
                    style={[styles.playlistItem, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                    onPress={() => playPlaylist(p.id)}
                >
                    <View style={[styles.playlistIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                        <Ionicons name="musical-notes" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.playlistInfo}>
                        <Text style={[styles.playlistName, { color: colors.text }]}>{p.name}</Text>
                        <Text style={[styles.playlistMeta, { color: colors.textMuted }]}>
                            {p.assetIds.length} songs
                        </Text>
                    </View>
                </ScalePressable>
            ))}
        </View>
    );

    return (
        <LinearGradient
            colors={[colors.background, '#121212', '#000000']}
            style={styles.container}
        >
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Explore</Text>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
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

            {/* @ts-ignore */}
            <FlashList
                data={query ? filteredItems : []}
                renderItem={renderSearchItem}
                keyExtractor={(item: any) => item.id}
                estimatedItemSize={72}
                ListHeaderComponent={!query ? renderSections : null}
                ListEmptyComponent={query ? (
                    <View style={styles.empty}>
                        <Ionicons name="search-outline" size={60} color={colors.textMuted} style={{ opacity: 0.5 }} />
                        <Text style={{ color: colors.textMuted, marginTop: 20, fontSize: 16 }}>
                            No matching songs found
                        </Text>
                    </View>
                ) : null}
                contentContainerStyle={{ paddingBottom: 160 + insets.bottom, paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
            />

            < CreatePlaylistModal
                visible={isCreatePlaylistVisible}
                onClose={() => setIsCreatePlaylistVisible(false)}
                onCreate={createPlaylist}
            />

            <MiniPlayer />
        </LinearGradient >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '800',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 15,
        marginBottom: 20,
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
        marginBottom: 30,
    },
    sectionCard: {
        padding: 20,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
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
        fontSize: 18,
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
        marginBottom: 15,
    },
    playlistHeaderText: {
        fontSize: 20,
        fontWeight: '800',
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 16,
        marginBottom: 10,
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
        fontSize: 16,
        fontWeight: '700',
    },
    playlistMeta: {
        fontSize: 12,
        marginTop: 2,
    },
});

const SearchItem = memo(({ item, index, onPress, onLike, isLiked, colors, styles }: any) => (
    <Animated.View
        entering={FadeInDown.delay(Math.min(index * 20, 200)).duration(400)}
        exiting={FadeOut.duration(200)}
    >
        <ScalePressable
            onPress={onPress}
            style={[styles.resultItem, { borderBottomColor: colors.border }]}
        >
            <Image
                source={require('../../assets/images/placeholder.png')}
                style={styles.thumbnail}
            />
            <View style={styles.resultInfo}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                    {item.filename}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                    Sonic Flow • {Math.floor(item.duration / 60)}:{(item.duration % 60).toFixed(0).padStart(2, '0')}
                </Text>
            </View>
            <ScalePressable onPress={onLike} style={{ padding: 10 }}>
                <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={20}
                    color={isLiked ? colors.accent : colors.textMuted}
                />
            </ScalePressable>
        </ScalePressable>
    </Animated.View>
));
