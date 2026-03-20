import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScalePressable from '../components/ScalePressable';
import { useTheme } from '../context/ThemeContext';
import { useListeningRoom } from '../hooks/useListeningRoom';
import { useAudio } from '../hooks/useAudio';

function RoomScreen() {
    useKeepAwake(); // Keep the app from sleeping during broadcast/listen sessions
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const [joinId, setJoinId] = useState('');
    const { roomId, isBroadcasting, isListening, startBroadcast, stopBroadcast, joinRoom, leaveRoom, LISTEN_URL } = useListeningRoom();
    const { playFromUrl } = useAudio();

    const handleCreateRoom = () => {
        if (Platform.OS === 'web') {
            Alert.alert("Not Supported", "Broadcasting local files is not yet supported in the web browser.");
            return;
        }
        const id = Math.random().toString(36).substring(2, 8).toUpperCase();
        startBroadcast(id);
    };

    const handleJoinRoom = async () => {
        if (!joinId) return;
        joinRoom(joinId);
        await playFromUrl(`${LISTEN_URL}${joinId}/`);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.screenBackground, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <ScalePressable style={[styles.iconBtn, { borderColor: colors.iconButtonBorder, backgroundColor: colors.iconButtonBackground }]} onPress={() => router.back()}>
                    <Ionicons name="chevron-down" size={24} color={colors.text} />
                </ScalePressable>
                <Text style={[styles.title, { color: colors.text }]}>Listening Room</Text>
            </View>

            <View style={styles.content}>
                {isBroadcasting ? (
                    <View style={styles.activeRoomCard}>
                        <Text style={[styles.activeTitle, { color: colors.text }]}>Broadcasting Live!</Text>
                        <Text style={[styles.activeDesc, { color: colors.textMuted }]}>
                            Tell your friends to join using this Room ID:
                        </Text>
                        <View style={[styles.idBadge, { backgroundColor: colors.accentSurface }]}>
                            <Text style={[styles.idText, { color: colors.accent }]}>{roomId}</Text>
                        </View>
                        <ScalePressable style={[styles.btn, { backgroundColor: colors.danger }]} onPress={stopBroadcast}>
                            <Text style={styles.btnText}>Stop Broadcasting</Text>
                        </ScalePressable>
                    </View>
                ) : isListening ? (
                    <View style={styles.activeRoomCard}>
                        <Text style={[styles.activeTitle, { color: colors.text }]}>Listening Live!</Text>
                        <Text style={[styles.activeDesc, { color: colors.textMuted }]}>
                            You are connected to Room:
                        </Text>
                        <View style={[styles.idBadge, { backgroundColor: colors.accentSurface }]}>
                            <Text style={[styles.idText, { color: colors.accent }]}>{roomId}</Text>
                        </View>
                        <ScalePressable style={[styles.btn, { backgroundColor: colors.danger }]} onPress={leaveRoom}>
                            <Text style={styles.btnText}>Leave Room</Text>
                        </ScalePressable>
                    </View>
                ) : (
                    <View style={styles.setupCard}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Host a Room</Text>
                            <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
                                Start playing a song, then broadcast your live audio to friends over the internet.
                            </Text>
                            <ScalePressable style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleCreateRoom}>
                                <Text style={styles.btnText}>Start Broadcasting</Text>
                            </ScalePressable>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Join a Room</Text>
                            <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
                                Enter a Room ID to listen to what someone else is playing.
                            </Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.cardBorder, color: colors.text }]}
                                placeholder="Enter Room ID"
                                placeholderTextColor={colors.textMuted}
                                value={joinId}
                                onChangeText={setJoinId}
                                autoCapitalize="characters"
                            />
                            <ScalePressable style={[styles.btn, { backgroundColor: colors.cardBorder }]} onPress={handleJoinRoom}>
                                <Text style={[styles.btnText, { color: colors.text }]}>Join Room</Text>
                            </ScalePressable>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    iconBtn: { padding: 10, borderRadius: 12, borderWidth: 1, marginRight: 16 },
    title: { fontSize: 24, fontWeight: '800' },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    setupCard: { gap: 24 },
    section: { gap: 12 },
    sectionTitle: { fontSize: 20, fontWeight: '700' },
    sectionDesc: { fontSize: 14, lineHeight: 20 },
    btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, fontWeight: '600', letterSpacing: 2, textAlign: 'center' },
    divider: { height: 1, width: '100%', marginVertical: 8 },
    activeRoomCard: { alignItems: 'center', paddingTop: 60, gap: 20 },
    activeTitle: { fontSize: 28, fontWeight: '800' },
    activeDesc: { fontSize: 16, textAlign: 'center' },
    idBadge: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 },
    idText: { fontSize: 32, fontWeight: '900', letterSpacing: 4 },
});

export default RoomScreen;
