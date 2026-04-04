import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Switch, Text, View } from 'react-native';

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
  const { theme, resolvedTheme, setTheme, accentColor, setAccentColor, colors } = useTheme();
  const safePush = useSafeRouterPush();
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

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerEyebrow, { color: colors.accent }]}>Personalize</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.statsCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            <StatPill icon="musical-notes" label="Tracks" value={library.length} colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
            <StatPill icon="heart" label="Liked" value={likedIds.size} colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
            <StatPill icon="list" label="Playlists" value={playlists.length} colors={colors} />
          </View>
        </View>

        {/* ── Appearance ────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel text="Appearance" color={colors.textMuted} />

          {/* Theme cards */}
          <View style={styles.themeCardRow}>
            {(['system', 'light', 'dark'] as const).map((opt) => {
              const selected = theme === opt;
              const isDarkPreview = opt === 'dark' || (opt === 'system' && resolvedTheme === 'dark');
              return (
                <ScalePressable
                  key={opt}
                  style={[
                    styles.themeCard,
                    {
                      borderColor: selected ? accentColor : colors.cardBorder,
                      backgroundColor: colors.cardBackground,
                    },
                  ]}
                  onPress={() => handleThemeChange(opt)}
                >
                  {/* Mini theme preview */}
                  <View style={[styles.themePreviewMini, { backgroundColor: isDarkPreview ? colors.previewDarkBG : colors.previewLightBG }]}>
                    <View style={[styles.themePreviewTopBar, { backgroundColor: isDarkPreview ? colors.previewDarkSub : colors.pureWhite }]} />
                    <View style={{ padding: 4, gap: 3 }}>
                      {[1, 2].map(i => (
                        <View key={i} style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: i === 1 ? accentColor : (isDarkPreview ? colors.previewDarkSub : colors.previewLightSub) }} />
                          <View style={[styles.previewLine, { width: i === 1 ? 28 : 20, height: 3, backgroundColor: isDarkPreview ? colors.previewDarkText : colors.previewLightText }]} />
                        </View>
                      ))}
                    </View>
                  </View>
                  {/* Label */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <Ionicons
                      name={opt === 'dark' ? 'moon' : opt === 'light' ? 'sunny' : 'phone-portrait-outline'}
                      size={12}
                      color={selected ? accentColor : colors.textMuted}
                    />
                    <Text style={[styles.themeCardLabel, { color: selected ? accentColor : colors.textMuted }]}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Text>
                  </View>
                  {selected && (
                    <View style={[styles.themeSelectedBadge, { backgroundColor: accentColor }]}>
                      <Ionicons name="checkmark" size={10} color={colors.pureWhite} />
                    </View>
                  )}
                </ScalePressable>
              );
            })}
          </View>

          {/* Accent Color */}
          <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground, marginTop: 12 }]}>
            <View style={styles.accentHeader}>
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Accent Color</Text>
                <Text style={[styles.rowHint, { color: colors.textMuted }]}>Highlights, buttons, and active states</Text>
              </View>
              <View style={[styles.accentCurrentDot, { backgroundColor: accentColor }]} />
            </View>
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <View style={styles.accentGrid}>
              {([
                { key: 'teal', color: colors.accents.teal, label: 'Teal' },
                { key: 'classic', color: colors.accents.classic, label: 'Sky' },
                { key: 'purple', color: colors.accents.purple, label: 'Purple' },
                { key: 'spotify', color: colors.accents.spotify, label: 'Lime' },
                { key: 'sunset', color: colors.accents.sunset, label: 'Sunset' },
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

        {/* ── Playback ──────────────────────────── */}
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
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToggleRow
              icon="videocam-outline"
              label="Video Badges"
              hint="Show icon on video files in library"
              value={showVideoBadges}
              onToggle={setShowVideoBadges}
              colors={colors}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToggleRow
              icon="phone-portrait-outline"
              label="Lock-screen Controls"
              hint="Control playback from lock screen"
              value={enableLockScreenControls}
              onToggle={setEnableLockScreenControls}
              colors={colors}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToggleRow
              icon="cloud-outline"
              label="Online Music (JioSaavn)"
              hint="Search and play from online"
              value={onlineSourceEnabled}
              onToggle={setOnlineSourceEnabled}
              colors={colors}
            />
            {onlineSourceEnabled && (
              <>
                <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
                <View style={styles.actionRow}>
                  <View style={[styles.iconBox, { backgroundColor: colors.iconBackground }]}>
                    <Ionicons name="options-outline" size={18} color={colors.text} />
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
                        <Text style={{ color: selected ? colors.accent : colors.textMuted, fontSize: 13, fontWeight: '700' }}>
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
                <Ionicons name={repeatIcon} size={18} color={colors.text} />
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
                <Ionicons name="shuffle" size={18} color={colors.text} />
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

            {/* Speed */}
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
                    <Text style={{ color: selected ? colors.accent : colors.textMuted, fontSize: 13, fontWeight: '700' }}>
                      {rate === 1 ? 'Normal' : `${rate}×`}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Tools ─────────────────────────────── */}
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
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToolRow
              icon="radio-outline"
              iconBg={colors.settingsTeal}
              label="Listening Room"
              hint="Stream audio to another device"
              colors={colors}
              onPress={() => safePush('/room')}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToolRow
              icon="link"
              iconBg={colors.settingsBlue}
              label="Play From Link"
              hint="Paste a direct audio/video URL"
              colors={colors}
              onPress={() => setIsLinkModalVisible(true)}
            />
            <View style={[styles.divider, { borderColor: colors.cardBorder }]} />
            <ToolRow
              icon="play-circle-outline"
              iconBg={colors.settingsPurple}
              label="Open Player"
              hint="Jump to current playback screen"
              colors={colors}
              onPress={openPlayerSafely}
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
            />
          </View>
        </View>

        {/* ── About ─────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel text="About" color={colors.textMuted} />
          <View style={[styles.aboutCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
            <View style={[styles.aboutIcon, { backgroundColor: colors.accentSurface }]}>
              <Ionicons name="musical-notes" size={32} color={colors.accent} />
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
    <Text style={[styles.sectionLabel, { color }]}>{text.toUpperCase()}</Text>
  );
}

function StatPill({ icon, label, value, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; colors: any }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={18} color={colors.accent} style={{ marginBottom: 4 }} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function ToggleRow({ icon, label, hint, value, onToggle, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.iconBox, { backgroundColor: colors.iconBackground }]}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.rowHint, { color: colors.textMuted }]}>{hint}</Text>
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

function ToolRow({ icon, iconBg, label, hint, colors, onPress, danger }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  hint: string;
  colors: any;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <ScalePressable style={styles.actionRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={colors.pureWhite} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
        <Text style={[styles.rowHint, { color: colors.textMuted }]}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </ScalePressable>
  );
}

// ── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.07,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
    opacity: 0.4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowHint: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  themeModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
    marginLeft: 50,
  },
  themeModePill: {
    flex: 1,
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  themeModeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  colorDot: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Live preview card
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewDot: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  previewLine: {
    height: 6,
    borderRadius: 3,
  },
  previewPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Theme cards
  themeCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 0,
  },
  themeCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 10,
  },
  themePreviewMini: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  themePreviewTopBar: {
    height: 14,
    width: '100%',
  },
  themeCardLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeSelectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Accent swatches
  accentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  accentCurrentDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  accentSwatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  accentSwatchDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentSwatchLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  speedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  speedPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  valueBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  valueBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  aboutCard: {
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    padding: 28,
    gap: 6,
  },
  aboutIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  aboutAppName: {
    fontSize: 22,
    fontWeight: '800',
  },
  aboutTagline: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  aboutBadge: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  aboutVersion: {
    fontSize: 12,
    fontWeight: '600',
  },
  preferenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 50,
  },
  prefPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
