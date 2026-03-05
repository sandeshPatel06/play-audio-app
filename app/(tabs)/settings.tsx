import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmDialog, NoticeDialog } from '../../components/AppDialogs';
import LinkInputModal from '../../components/LinkInputModal';
import MiniPlayer from '../../components/MiniPlayer';
import { ACCENT_COLORS, useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../hooks/useAudio';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setTheme, accentColor, setAccentColor, colors } = useTheme();
  const isLight = theme === 'light';
  const gradientColors = isLight ? [colors.background, '#EAF1FF', '#F8FAFF'] : [colors.background, '#0D1524', '#070B14'];
  const cardBg = isLight ? 'rgba(17,24,39,0.04)' : 'rgba(255,255,255,0.06)';
  const iconBg = isLight ? 'rgba(17,24,39,0.07)' : 'rgba(255,255,255,0.08)';
  const pillBg = isLight ? 'rgba(17,24,39,0.05)' : 'rgba(255,255,255,0.04)';
  const speedInactiveBg = isLight ? 'rgba(17,24,39,0.04)' : 'rgba(255,255,255,0.03)';
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
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
    refreshLibrary,
    clearAudio,
    playFromUrl,
    clearLikedSongs,
    clearPlaylists,
  } = useAudio();

  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [pendingOpenPlayer, setPendingOpenPlayer] = useState(false);
  const [noticeState, setNoticeState] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });
  const [confirmState, setConfirmState] = useState<{ visible: boolean; title: string; message: string; onConfirm: () => void }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showNotice = (title: string, message: string) => {
    setNoticeState({ visible: true, title, message });
  };

  const handleAccentChange = (color: string) => {
    Haptics.selectionAsync();
    setAccentColor(color);
  };

  const handleThemeChange = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(val ? 'dark' : 'light');
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
    else showNotice('Rescan Skipped', 'Library permission is missing or unavailable in this runtime.');
  };

  useEffect(() => {
    if (!pendingOpenPlayer || !rootNavigationState?.key) return;
    const timer = setTimeout(() => {
      try {
        router.push('/player');
      } catch {
        // Ignore transient navigation readiness races.
      } finally {
        setPendingOpenPlayer(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [pendingOpenPlayer, rootNavigationState?.key, router]);

  const openPlayerSafely = () => {
    if (rootNavigationState?.key) {
      router.push('/player');
    } else {
      setPendingOpenPlayer(true);
    }
  };

  const handlePlayFromLink = async (link: string) => {
    const ok = await playFromUrl(link);
    if (!ok) {
      showNotice('Invalid Link', 'Use a direct HTTP/HTTPS media URL (audio or video).');
      return;
    }
    setIsLinkModalVisible(false);
    openPlayerSafely();
  };

  const askClearLiked = () => {
    setConfirmState({
      visible: true,
      title: 'Clear Liked Songs',
      message: 'Remove all liked songs?',
      onConfirm: () => {
        clearLikedSongs();
        setConfirmState((prev) => ({ ...prev, visible: false }));
        showNotice('Done', 'Liked songs cleared.');
      },
    });
  };

  const askClearPlaylists = () => {
    setConfirmState({
      visible: true,
      title: 'Delete All Playlists',
      message: 'Delete all playlists and their song mappings?',
      onConfirm: () => {
        clearPlaylists();
        setConfirmState((prev) => ({ ...prev, visible: false }));
        showNotice('Done', 'All playlists deleted.');
      },
    });
  };

  const repeatText = repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'Repeat All' : 'Repeat One';
  const runtimeText = Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? 'Expo Go' : 'Development/Standalone';

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}> 
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Personalize playback, tools, and app behavior</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={[styles.statsCard, { borderColor: colors.border, backgroundColor: cardBg }]}> 
            <StatPill label="Tracks" value={library.length.toString()} color={colors} bgColor={pillBg} />
            <StatPill label="Liked" value={likedIds.length.toString()} color={colors} bgColor={pillBg} />
            <StatPill label="Playlists" value={playlists.length.toString()} color={colors} bgColor={pillBg} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle text="Appearance" color={colors.text} />
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: cardBg }]}>
            <SettingRow
              icon="moon"
              label="Dark Mode"
              colors={colors}
              iconBg={iconBg}
              right={
                <Switch
                  value={theme === 'dark'}
                  onValueChange={handleThemeChange}
                  trackColor={{ false: '#6B7280', true: colors.accent }}
                  thumbColor="#f4f3f4"
                />
              }
            />
            <View style={[styles.divider, { borderColor: colors.border }]} />
            <Text style={[styles.inlineLabel, { color: colors.text }]}>Accent Color</Text>
            <View style={styles.colorGrid}>
              {Object.entries(ACCENT_COLORS).map(([name, color]) => (
                <TouchableOpacity
                  key={name}
                  activeOpacity={0.85}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    accentColor === color && { borderColor: colors.text, borderWidth: 3 },
                  ]}
                  onPress={() => handleAccentChange(color)}
                >
                  {accentColor === color ? <Ionicons name="checkmark" size={18} color={isLight ? '#111827' : '#FFF'} /> : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle text="Playback" color={colors.text} />
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: cardBg }]}>
            <SettingRow
              icon="open-outline"
              label="Auto-open Player"
              colors={colors}
              iconBg={iconBg}
              right={
                <Switch
                  value={autoOpenPlayerOnPlay}
                  onValueChange={setAutoOpenPlayerOnPlay}
                  trackColor={{ false: '#6B7280', true: colors.accent }}
                  thumbColor="#f4f3f4"
                />
              }
            />
            <View style={[styles.divider, { borderColor: colors.border }]} />
            <SettingRow
              icon="videocam-outline"
              label="Show VIDEO Badges"
              colors={colors}
              iconBg={iconBg}
              right={
                <Switch
                  value={showVideoBadges}
                  onValueChange={setShowVideoBadges}
                  trackColor={{ false: '#6B7280', true: colors.accent }}
                  thumbColor="#f4f3f4"
                />
              }
            />
            <View style={[styles.divider, { borderColor: colors.border }]} />
            <SettingRow
              icon="phone-portrait-outline"
              label="Lock-screen Controls"
              colors={colors}
              iconBg={iconBg}
              right={
                <Switch
                  value={enableLockScreenControls}
                  onValueChange={setEnableLockScreenControls}
                  trackColor={{ false: '#6B7280', true: colors.accent }}
                  thumbColor="#f4f3f4"
                />
              }
            />
            <View style={[styles.divider, { borderColor: colors.border }]} />
            <TouchableOpacity style={styles.actionRow} onPress={cycleRepeatMode}>
                <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <Ionicons name="repeat" size={18} color={colors.text} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Repeat Mode</Text>
              </View>
              <Text style={[styles.valueText, { color: colors.accent }]}>{repeatText}</Text>
            </TouchableOpacity>
            <View style={[styles.divider, { borderColor: colors.border }]} />
            <TouchableOpacity style={styles.actionRow} onPress={() => setShuffle(!shuffle)}>
                <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <Ionicons name="shuffle" size={18} color={colors.text} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Shuffle</Text>
              </View>
              <Text style={[styles.valueText, { color: shuffle ? colors.accent : colors.textMuted }]}>
                {shuffle ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { borderColor: colors.border }]} />
            <Text style={[styles.inlineLabel, { color: colors.text }]}>Playback Speed</Text>
            <View style={styles.speedRow}>
              {[0.75, 1, 1.25, 1.5].map((rate) => (
                <TouchableOpacity
                  key={rate}
                  onPress={() => setPlaybackRate(rate)}
                  style={[
                    styles.speedPill,
                    {
                      borderColor: playbackRate === rate ? colors.accent : colors.border,
                      backgroundColor: playbackRate === rate ? `${colors.accent}20` : speedInactiveBg,
                    },
                  ]}
                >
                  <Text style={{ color: playbackRate === rate ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                    {rate}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle text="Tools" color={colors.text} />
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: cardBg }]}>
            <TouchableOpacity style={styles.actionRow} onPress={handleRescan}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <Ionicons name="refresh" size={18} color={colors.text} />
                </View>
                <View>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Rescan Library</Text>
                  <Text style={[styles.rowHint, { color: colors.textMuted }]}>Find newly downloaded tracks</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { borderColor: colors.border }]} />
            <TouchableOpacity style={styles.actionRow} onPress={() => setIsLinkModalVisible(true)}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <Ionicons name="link" size={18} color={colors.text} />
                </View>
                <View>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Play From Link</Text>
                  <Text style={[styles.rowHint, { color: colors.textMuted }]}>Paste direct audio/video URL</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { borderColor: colors.border }]} />
            <TouchableOpacity style={styles.actionRow} onPress={openPlayerSafely}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <Ionicons name="play-circle-outline" size={18} color={colors.text} />
                </View>
                <View>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Open Player</Text>
                  <Text style={[styles.rowHint, { color: colors.textMuted }]}>Jump to current playback screen</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { borderColor: colors.border }]} />
            <TouchableOpacity style={styles.actionRow} onPress={clearAudio}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <Ionicons name="stop-circle-outline" size={18} color={colors.text} />
                </View>
                <View>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Stop Playback</Text>
                  <Text style={[styles.rowHint, { color: colors.textMuted }]}>Clear active player and queue</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle text="Danger Zone" color={colors.text} />
          <View style={[styles.card, { borderColor: 'rgba(255,59,48,0.35)', backgroundColor: 'rgba(255,59,48,0.07)' }]}>
            <TouchableOpacity style={styles.actionRow} onPress={askClearLiked}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,159,10,0.18)' }]}>
                  <Ionicons name="heart-dislike" size={18} color="#FF9F0A" />
                </View>
                <View>
                  <Text style={[styles.rowLabel, { color: '#FFB25C' }]}>Clear Liked Songs</Text>
                  <Text style={[styles.rowHint, { color: colors.textMuted }]}>Removes all liked entries</Text>
                </View>
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, { borderColor: 'rgba(255,59,48,0.25)' }]} />
            <TouchableOpacity style={styles.actionRow} onPress={askClearPlaylists}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,59,48,0.2)' }]}>
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </View>
                <View>
                  <Text style={[styles.rowLabel, { color: '#FF6B62' }]}>Delete All Playlists</Text>
                  <Text style={[styles.rowHint, { color: colors.textMuted }]}>Cannot be undone</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle text="About" color={colors.text} />
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: cardBg }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
              <Text style={[styles.valueText, { color: colors.textMuted }]}>1.0.0</Text>
            </View>
            <View style={[styles.divider, { borderColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Runtime</Text>
              <Text style={[styles.valueText, { color: colors.textMuted }]}>{runtimeText}</Text>
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
    </LinearGradient>
  );
}

function SectionTitle({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.sectionTitle, { color }]}>{text}</Text>;
}

function StatPill({
  label,
  value,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  color: { text: string; textMuted: string; accent: string };
  bgColor: string;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: bgColor }]}>
      <Text style={[styles.statValue, { color: color.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: color.textMuted }]}>{label}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  colors,
  iconBg,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: { text: string };
  iconBg: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={colors.text} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {right}
    </View>
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
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    opacity: 0.9,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  statPill: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  divider: {
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  inlineLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  speedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  speedPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
});
