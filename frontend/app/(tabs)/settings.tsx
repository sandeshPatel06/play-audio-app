import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState, useMemo } from 'react';
import { ScrollView, StatusBar, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmDialog, NoticeDialog } from '../../components/AppDialogs';
import LinkInputModal from '../../components/LinkInputModal';
import MiniPlayer from '../../components/MiniPlayer';
import ScalePressable from '../../components/ScalePressable';
import { useTheme } from '../../context/ThemeContext';

import { useAudio } from '../../hooks/useAudio';
import { useSafeRouterPush } from '../../hooks/useSafeRouterPush';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme, resolvedTheme, setTheme, accentColor, setAccentColor, colors } = useTheme();
  const isSmall = screenWidth < 375;
  const safePush = useSafeRouterPush();
  
  const styles = useMemo(() => createStyles(colors, isSmall, screenWidth), [colors, isSmall, screenWidth]);
  
  const {
    library,
    likedIds,
    playlists,
    shuffle,
    setShuffle,
    repeatMode,
    setRepeatMode,
    playbackRate,
    setPlaybackRate,
    autoOpenPlayerOnPlay,
    setAutoOpenPlayerOnPlay,
    showVideoBadges,
    setShowVideoBadges,
    enableLockScreenControls,
    setEnableLockScreenControls,
    onlineSourceEnabled,
    setOnlineSourceEnabled,
    onlineSourcePreference,
    setOnlineSourcePreference,
    refreshLibrary,
    clearAudio,
    playFromUrl,
  } = useAudio();

  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [noticeState, setNoticeState] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });
  const [confirmState, setConfirmState] = useState<{ visible: boolean; title: string; message: string; onConfirm: () => void }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const showNotice = (title: string, message: string) => {
    setNoticeState({ visible: true, title, message });
  };

  const handleAccentChange = (color: string) => {
    Haptics.selectionAsync();
    setAccentColor(color);
  };

  const handleThemeChange = (nextTheme: 'light' | 'dark' | 'system') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(nextTheme);
  };

  const cycleRepeatMode = () => {
    Haptics.selectionAsync();
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const handleRescan = async () => {
    const ok = await refreshLibrary();
    if (ok) showNotice('Library Updated', 'Rescan completed successfully.');
    else showNotice('Rescan Skipped', 'Library permission is missing or unavailable.');
  };

  const openPlayerSafely = () => safePush('/player');

  const handlePlayFromLink = async (link: string) => {
    const ok = await playFromUrl(link);
    if (!ok) {
      showNotice('Invalid Link', 'Use a direct HTTP/HTTPS media URL (audio or video).');
      return;
    }
    setIsLinkModalVisible(false);
    openPlayerSafely();
  };

  const repeatLabel = repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All' : 'One';
  const repeatIcon = repeatMode === 'one' ? 'repeat-outline' : 'repeat';

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Ambient glow */}
      <View style={[styles.bgGlow, { backgroundColor: colors.accent }]} />

      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={[styles.headerEyebrow, { color: colors.accent }]}>Personalize</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.section}>
          <View style={[styles.statsCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            <StatPill icon="musical-notes" label="Tracks" value={library.length} colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
            <StatPill icon="heart" label="Liked" value={likedIds.size} colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
            <StatPill icon="list" label="Playlists" value={playlists.length} colors={colors} />
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <SectionLabel text="Appearance" color={colors.textMuted} />

          <View style={styles.themeCardRow}>
            {(['system', 'light', 'dark'] as const).map((opt) => {
              const selected = theme === opt;
              return (
                <ScalePressable
                  key={opt}
                  style={[
                    styles.themeCard,
                    {
                      borderColor: selected ? accentColor : colors.cardBorder,
                      backgroundColor: selected ? accentColor + '10' : colors.cardBackground,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      gap: 8,
                      justifyContent: 'center',
                    },
                  ]}
                  onPress={() => handleThemeChange(opt)}
                >
                  <Ionicons
                    name={opt === 'dark' ? 'moon' : opt === 'light' ? 'sunny' : 'phone-portrait-outline'}
                    size={16}
                    color={selected ? accentColor : colors.textMuted}
                  />
                  <Text style={[styles.themeCardLabel, { 
                    color: selected ? accentColor : colors.textMuted, 
                    marginTop: 0,
                    fontSize: isSmall ? 11 : 13 
                  }]}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                  {selected && (
                    <View style={[styles.themeSelectedBadge, { 
                      backgroundColor: accentColor,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      shadowOpacity: 0
                    }]} />
                  )}
                </ScalePressable>
              );
            })}
          </View>

          <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground, marginTop: 12 }]}>
            <View style={styles.accentHeader}>
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Accent Color</Text>
                <Text style={[styles.rowHint, { color: colors.textMuted }]}>Highlights, buttons, and active states</Text>
              </View>
              <View style={[styles.accentCurrentDot, { backgroundColor: accentColor, borderColor: colors.pureWhite, borderWidth: 3 }]} />
            </View>
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <View style={styles.accentGrid}>
              {([
                { key: 'teal', color: colors.accents.teal, label: 'Teal' },
                { key: 'classic', color: colors.accents.classic, label: 'Sky' },
                { key: 'purple', color: colors.accents.purple, label: 'Purple' },
                { key: 'spotify', color: colors.accents.spotify, label: 'Lime' },
                { key: 'sunset', color: colors.accents.sunset, label: 'Sunset' },
                { key: 'jasmin', color: colors.accents.jasmin, label: 'Jasmin' },
              ]).map(({ key, color, label }) => {
                const isSelected = accentColor === color;
                return (
                  <ScalePressable
                    key={key}
                    style={[
                      styles.accentSwatch,
                      {
                        backgroundColor: color + '22',
                        borderColor: isSelected ? color : colors.cardBorder,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleAccentChange(color)}
                  >
                    <View style={[styles.accentSwatchDot, { backgroundColor: color }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color={colors.pureWhite} />}
                    </View>
                    <Text style={[styles.accentSwatchLabel, { color: isSelected ? color : colors.textMuted }]}>
                      {label}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Playback */}
        <View style={styles.section}>
          <SectionLabel text="Playback" color={colors.textMuted} />
          <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
            <ToggleRow
              icon="open-outline"
              label="Auto-open Player"
              hint="Jump to player when song starts"
              value={autoOpenPlayerOnPlay}
              onToggle={setAutoOpenPlayerOnPlay}
              colors={colors}
              isSmall={isSmall}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToggleRow
              icon="videocam-outline"
              label="Video Badges"
              hint="Show icon on video files in library"
              value={showVideoBadges}
              onToggle={setShowVideoBadges}
              colors={colors}
              isSmall={isSmall}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToggleRow
              icon="phone-portrait-outline"
              label="Lock-screen Controls"
              hint="Control playback from lock screen"
              value={enableLockScreenControls}
              onToggle={setEnableLockScreenControls}
              colors={colors}
              isSmall={isSmall}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToggleRow
              icon="cloud-outline"
              label="Online Music (JioSaavn)"
              hint="Search and play from online"
              value={onlineSourceEnabled}
              onToggle={setOnlineSourceEnabled}
              colors={colors}
              isSmall={isSmall}
            />
            {onlineSourceEnabled && (
              <>
                <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
                <View style={styles.actionRow}>
                  <View style={[styles.iconBox, { backgroundColor: colors.iconBackground }]}>
                    <Ionicons name="options-outline" size={isSmall ? 16 : 18} color={colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>Online Source</Text>
                    <Text style={[styles.rowHint, { color: colors.textMuted }]}>Choose where to play music from</Text>
                  </View>
                </View>
                <View style={styles.preferenceRow}>
                  {(['local', 'jiosaavn', 'both'] as const).map((pref) => {
                    const selected = onlineSourcePreference === pref;
                    return (
                      <ScalePressable
                        key={pref}
                        onPress={() => { Haptics.selectionAsync(); setOnlineSourcePreference(pref); }}
                        style={[
                          styles.prefPill,
                          {
                            borderColor: selected ? colors.accent : colors.cardBorder,
                            backgroundColor: selected ? colors.accentSurface : colors.cardBackgroundSubtle,
                          },
                        ]}
                      >
                        <Text style={{ color: selected ? colors.accent : colors.textMuted, fontSize: isSmall ? 12 : 13, fontWeight: '700' }}>
                          {pref === 'local' ? 'Local Only' : pref === 'jiosaavn' ? 'Online Only' : 'Both'}
                        </Text>
                      </ScalePressable>
                    );
                  })}
                </View>
              </>
            )}
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />

            {/* Repeat */}
            <ScalePressable style={styles.actionRow} onPress={cycleRepeatMode}>
              <View style={[styles.iconBox, { backgroundColor: colors.iconBackground }]}>
                <Ionicons name={repeatIcon} size={isSmall ? 16 : 18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Repeat Mode</Text>
                <Text style={[styles.rowHint, { color: colors.textMuted }]}>Tap to cycle through modes</Text>
              </View>
              <View style={[styles.valueBadge, { backgroundColor: colors.accentSurface }]}>
                <Text style={[styles.valueBadgeText, { color: colors.accent }]}>{repeatLabel}</Text>
              </View>
            </ScalePressable>
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />

            {/* Shuffle */}
            <ScalePressable style={styles.actionRow} onPress={() => { Haptics.selectionAsync(); setShuffle(!shuffle); }}>
              <View style={[styles.iconBox, { backgroundColor: colors.iconBackground }]}>
                <Ionicons name="shuffle" size={isSmall ? 16 : 18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Shuffle</Text>
                <Text style={[styles.rowHint, { color: colors.textMuted }]}>Randomize playback queue order</Text>
              </View>
              <View style={[styles.valueBadge, { backgroundColor: shuffle ? colors.accentSurface : colors.cardBackgroundSubtle }]}>
                <Text style={[styles.valueBadgeText, { color: shuffle ? colors.accent : colors.textMuted }]}>
                  {shuffle ? 'On' : 'Off'}
                </Text>
              </View>
            </ScalePressable>
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />

            <Text style={[styles.inlineLabel, { color: colors.text }]}>Playback Speed</Text>
            <View style={styles.speedRow}>
              {([0.75, 1, 1.25, 1.5, 2] as const).map((rate) => {
                const selected = playbackRate === rate;
                return (
                  <ScalePressable
                    key={rate}
                    onPress={() => { Haptics.selectionAsync(); setPlaybackRate(rate); }}
                    style={[
                      styles.speedPill,
                      {
                        borderColor: selected ? colors.accent : colors.cardBorder,
                        backgroundColor: selected ? colors.accentSurface : colors.cardBackgroundSubtle,
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? colors.accent : colors.textMuted, fontSize: isSmall ? 12 : 13, fontWeight: '700' }}>
                      {rate === 1 ? 'Normal' : `${rate}×`}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Tools */}
        <View style={styles.section}>
          <SectionLabel text="Tools" color={colors.textMuted} />
          <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
            <ToolRow
              icon="refresh"
              iconBg={colors.settingsTeal}
              label="Rescan Library"
              hint="Find newly downloaded tracks"
              colors={colors}
              onPress={handleRescan}
              isSmall={isSmall}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToolRow
              icon="link"
              iconBg={colors.settingsBlue}
              label="Play From Link"
              hint="Paste a direct audio/video URL"
              colors={colors}
              onPress={() => setIsLinkModalVisible(true)}
              isSmall={isSmall}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToolRow
              icon="play-circle-outline"
              iconBg={colors.settingsPurple}
              label="Open Player"
              hint="Jump to current playback screen"
              colors={colors}
              onPress={openPlayerSafely}
              isSmall={isSmall}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToolRow
              icon="stop-circle-outline"
              iconBg={colors.settingsRed}
              label="Stop Playback"
              hint="Clear active player and queue"
              colors={colors}
              onPress={clearAudio}
              danger
              isSmall={isSmall}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <SectionLabel text="About" color={colors.textMuted} />
          <View style={[styles.aboutCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
            <View style={[styles.aboutIcon, { backgroundColor: colors.accentSurface }]}>
              <Ionicons name="musical-notes" size={isSmall ? 28 : 32} color={colors.accent} />
            </View>
            <Text style={[styles.aboutAppName, { color: colors.text }]}>Play-Veee</Text>
            <Text style={[styles.aboutTagline, { color: colors.textMuted }]}>Your local media, beautifully organized</Text>
            <View style={[styles.aboutBadge, { backgroundColor: colors.cardBackgroundSubtle }]}>
              <Text style={[styles.aboutVersion, { color: colors.textMuted }]}>Version 1.0.0</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <LinkInputModal
        visible={isLinkModalVisible}
        onClose={() => setIsLinkModalVisible(false)}
        onSubmit={handlePlayFromLink}
      />

      <ConfirmDialog
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        onClose={() => setConfirmState((prev) => ({ ...prev, visible: false }))}
        onConfirm={confirmState.onConfirm}
        confirmText="Confirm"
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

// ── Sub-components ────────────────────────────────────────

function SectionLabel({ text, color }: { text: string; color: string }) {
  return (
    <Text style={[{ fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase' }, { color }]}>{text}</Text>
  );
}

function StatPill({ icon, label, value, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; colors: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Ionicons name={icon} size={20} color={colors.accent} style={{ marginBottom: 6 }} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function ToggleRow({ icon, label, hint, value, onToggle, colors, isSmall }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  colors: any;
  isSmall: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: isSmall ? 52 : 56, gap: 14 }}>
      <View style={{ width: isSmall ? 40 : 44, height: isSmall ? 40 : 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.iconBackground }}>
        <Ionicons name={icon} size={isSmall ? 18 : 20} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isSmall ? 15 : 16, fontWeight: '700', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: isSmall ? 12 : 13, marginTop: 3, fontWeight: '500', color: colors.textMuted }}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { Haptics.selectionAsync(); onToggle(v); }}
        trackColor={{ false: colors.switchTrackOff, true: colors.accent }}
        thumbColor={colors.switchThumb}
      />
    </View>
  );
}

function ToolRow({ icon, iconBg, label, hint, colors, onPress, danger, isSmall }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  hint: string;
  colors: any;
  onPress: () => void;
  danger?: boolean;
  isSmall: boolean;
}) {
  return (
    <ScalePressable style={{ flexDirection: 'row', alignItems: 'center', minHeight: isSmall ? 52 : 56, gap: 14 }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
      <View style={{ width: isSmall ? 40 : 44, height: isSmall ? 40 : 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: iconBg }}>
        <Ionicons name={icon} size={isSmall ? 18 : 20} color={colors.pureWhite} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isSmall ? 15 : 16, fontWeight: '700', color: danger ? colors.danger : colors.text }}>{label}</Text>
        <Text style={{ fontSize: isSmall ? 12 : 13, marginTop: 3, fontWeight: '500', color: colors.textMuted }}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </ScalePressable>
  );
}

// ── Styles Factory ────────────────────────────────────────

function createStyles(colors: any, isSmall: boolean, screenWidth: number) {
  return StyleSheet.create({
    container: { flex: 1 },
    bgGlow: { position: 'absolute', top: -100, right: -100, width: isSmall ? 280 : 320, height: isSmall ? 280 : 320, borderRadius: 160, opacity: 0.08 },
    header: { paddingHorizontal: isSmall ? 16 : 20, marginBottom: 16 },
    headerEyebrow: { fontSize: isSmall ? 10 : 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 },
    headerTitle: { fontSize: isSmall ? 26 : 32, fontWeight: '900', letterSpacing: -0.2 },
    scrollView: { flex: 1 },
    section: { marginBottom: 24, paddingHorizontal: isSmall ? 12 : 16 },
    statsCard: { 
      flexDirection: 'row', 
      borderRadius: isSmall ? 16 : 20, 
      borderWidth: 1, 
      paddingVertical: isSmall ? 16 : 18, 
      paddingHorizontal: isSmall ? 8 : 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2
    },
    statDivider: { width: 1, height: '80%', alignSelf: 'center', opacity: 0.4 },
    card: { 
      borderRadius: isSmall ? 18 : 22, 
      borderWidth: 1, 
      paddingHorizontal: isSmall ? 14 : 16, 
      paddingVertical: 6, 
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 3
    },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, marginVertical: 2, opacity: 0.5 },
    themeCardRow: { flexDirection: 'row', gap: isSmall ? 8 : 12 },
    themeCard: { 
      flex: 1, 
      borderRadius: 18, 
      borderWidth: 2, 
      overflow: 'hidden', 
      alignItems: 'center', 
      padding: isSmall ? 10 : 12, 
      position: 'relative' 
    },
    themeCardLabel: { fontSize: isSmall ? 12 : 13, fontWeight: '800', marginTop: 8 },
    themeSelectedBadge: { 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        width: 24, 
        height: 24, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3
    },
    accentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: isSmall ? 56 : 64 },
    accentCurrentDot: { 
        width: isSmall ? 32 : 36, 
        height: isSmall ? 32 : 36, 
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    accentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: isSmall ? 10 : 12, paddingTop: 8, paddingBottom: 4 },
    accentSwatch: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10, 
        paddingHorizontal: isSmall ? 12 : 14, 
        paddingVertical: isSmall ? 10 : 12, 
        borderRadius: 16, 
        minWidth: isSmall ? 140 : 160 
    },
    accentSwatchDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    accentSwatchLabel: { fontSize: isSmall ? 13 : 14, fontWeight: '800' },
    actionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 14 },
    iconBox: { width: isSmall ? 40 : 44, height: isSmall ? 40 : 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    rowLabel: { fontSize: isSmall ? 15 : 16, fontWeight: '700' },
    rowHint: { fontSize: isSmall ? 12 : 13, marginTop: 3, fontWeight: '500' },
    valueBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
    valueBadgeText: { fontSize: isSmall ? 13 : 14, fontWeight: '800' },
    inlineLabel: { fontSize: isSmall ? 13 : 14, fontWeight: '700', marginTop: 12, marginBottom: 8 },
    speedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: isSmall ? 8 : 10, marginTop: 12, marginBottom: 8 },
    speedPill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: isSmall ? 16 : 20, paddingVertical: isSmall ? 10 : 12 },
    preferenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: isSmall ? 8 : 10, marginTop: 12 },
    prefPill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: isSmall ? 14 : 16, paddingVertical: isSmall ? 8 : 10 },
    aboutCard: { 
        borderRadius: isSmall ? 24 : 28, 
        borderWidth: 1, 
        alignItems: 'center', 
        padding: isSmall ? 28 : 36, 
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3
    },
    aboutIcon: { 
        width: isSmall ? 80 : 96, 
        height: isSmall ? 80 : 96, 
        borderRadius: 24, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5
    },
    aboutAppName: { fontSize: isSmall ? 24 : 28, fontWeight: '900', letterSpacing: -0.5 },
    aboutTagline: { fontSize: isSmall ? 14 : 15, fontWeight: '500', textAlign: 'center', marginTop: 4, opacity: 0.7 },
    aboutBadge: { marginTop: 16, borderRadius: 999, paddingHorizontal: isSmall ? 18 : 22, paddingVertical: 8 },
    aboutVersion: { fontSize: isSmall ? 13 : 14, fontWeight: '700' },
  });
}