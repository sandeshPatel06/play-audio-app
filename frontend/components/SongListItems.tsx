import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import React, { memo } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import ScalePressable from './ScalePressable';

interface ThemeColors {
    background: string;
    text: string;
    textMuted: string;
    accent: string;
    onAccent: string;
    accentSurface: string;
    activeRowBackground: string;
    activeOverlay: string;
    selectionOverlay: string;
    screenSurface: string;
    cardBackground: string;
    cardBorder: string;
}

interface SongListStyles {
    songItem?: any;
    songContent?: any;
    thumbnailContainer?: any;
    thumbnail?: any;
    activeOverlay?: any;
    selectionOverlay?: any;
    songInfo?: any;
    likeBtn?: any;
    songTitle?: any;
    itemSub?: any;
    songSubtitle?: any;
    menuBtn?: any;
    videoBadge?: any;
    headerSection?: any;
    headerSectionText?: any;
    gridItem?: any;
    gridThumbnailContainer?: any;
    gridTitle?: any;
    gridSubTitle?: any;
}

interface SectionHeaderProps {
    title: string;
    colors: ThemeColors;
    styles: SongListStyles;
}

export const SectionHeader = memo<SectionHeaderProps>(({ title, colors, styles }) => (
    <View style={[styles.headerSection, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerSectionText, { color: colors.accent }]}>{title}</Text>
    </View>
));
SectionHeader.displayName = 'SectionHeader';

interface SongItemProps {
    asset: MediaLibrary.Asset;
    isActive: boolean;
    isSelected: boolean;
    isSelectionMode: boolean;
    onPress: () => void;
    onLongPress: () => void;
    onLike: () => void;
    onMenu: () => void;
    isLiked: boolean;
    showVideoBadges: boolean;
    colors: ThemeColors;
    styles: SongListStyles;
}

export const SongItem = memo<SongItemProps>(({
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
}) => (
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
                        source={require('../assets/images/placeholder.png')}
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
                    {asset.duration > 0 && (
                        <Text style={[styles.songSubtitle, { color: colors.textMuted }]}>
                            {Math.floor(asset.duration / 60)}:{(asset.duration % 60).toFixed(0).padStart(2, '0')}
                        </Text>
                    )}
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
SongItem.displayName = 'SongItem';

interface GridItemProps {
    asset: MediaLibrary.Asset;
    isActive: boolean;
    isSelected: boolean;
    isSelectionMode: boolean;
    onPress: () => void;
    onLongPress: () => void;
    colors: ThemeColors;
    styles: SongListStyles;
}

export const GridItem = memo<GridItemProps>(({
    asset,
    isActive,
    isSelected,
    isSelectionMode,
    onPress,
    onLongPress,
    colors,
    styles
}) => (
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
            <Image source={require('../assets/images/placeholder.png')} style={styles.thumbnail} />
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
            {asset.duration > 0 && (
                <Text style={[styles.gridSubTitle, { color: colors.textMuted }]}>
                    {Math.floor(asset.duration / 60)}:{(asset.duration % 60).toFixed(0).padStart(2, '0')}
                </Text>
            )}
        </View>
    </ScalePressable>
));
GridItem.displayName = 'GridItem';