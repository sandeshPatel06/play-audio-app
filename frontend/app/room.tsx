import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Alert, 
    Platform, 
    StyleSheet, 
    Text, 
    TextInput, 
    View, 
    KeyboardAvoidingView, 
    ScrollView, 
    Keyboard,
    TouchableOpacity,
    Animated,
    Easing,
    Share,
    useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScalePressable from '../components/ScalePressable';
import { CORE_COLORS } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useListeningRoom } from '../hooks/useListeningRoom';
import { useAudio } from '../hooks/useAudio';
import { useSafeRouterPush } from '../hooks/useSafeRouterPush';

function RoomScreen() {
    useKeepAwake();
    const { width: screenWidth } = useWindowDimensions();
    const { colors, resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const isSmall = screenWidth < 375;
    const styles = useMemo(() => createStyles(colors, isSmall, screenWidth), [colors, isSmall, screenWidth]);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const safePush = useSafeRouterPush();

    // Audio: expo-audio native HTTP streaming for listener playback
    const { playFromUrl, clearAudio } = useAudio();

    const [joinId, setJoinId] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const {
        roomId,
        isBroadcasting,
        isListening,
        startBroadcast,
        stopBroadcast,
        joinRoom,
        leaveRoom,
        BROADCAST_URL,
        LISTEN_URL,
    } = useListeningRoom();


    // Pulse animation for broadcasting state
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isBroadcasting) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.4,
                        duration: 1500,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isBroadcasting, pulseAnim]);

    const handleCreateRoom = () => {
        if (Platform.OS === 'web') {
            Alert.alert("Not Supported", "Broadcasting local files is not yet supported.");
            return;
        }
        if (!BROADCAST_URL) {
            Alert.alert("Not Configured", "Server WebSocket URL is not configured.");
            return;
        }
        const id = Math.floor(100000 + Math.random() * 900000).toString();
        startBroadcast(id);
    };

    const handleShare = async () => {
        if (!roomId) return;
        try {
            await Share.share({
                message: `Join my Listening Room! Code: ${roomId}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleJoinRoom = async () => {
        if (!joinId || joinId.length < 6) {
            Alert.alert('Invalid Code', 'Please enter a valid 6-digit room code.');
            return;
        }
        Keyboard.dismiss();

        if (!BROADCAST_URL || !LISTEN_URL) {
            Alert.alert('Not Configured', 'Server URLs are not configured. Check EXPO_PUBLIC_WS_URL and EXPO_PUBLIC_API_URL.');
            return;
        }

        // ── Audio: HTTP streaming via expo-audio (native MP3 support) ──
        // The backend serves raw MP3 bytes decoded from the broadcaster's base64 chunks.
        const cleanHttp = LISTEN_URL.replace(/\/+$/, '');
        const streamUrl = `${cleanHttp}/stream/listen/${joinId}/`;
        console.log('[Room] Starting HTTP audio stream:', streamUrl);
        const ok = await playFromUrl(streamUrl);
        if (!ok) {
            Alert.alert('Connection Failed', 'Could not connect to the room audio stream. Ensure the broadcaster is active.');
            return;
        }

        // ── Metadata: WebSocket subscription (song title/artist sync) ──
        joinRoom(joinId, BROADCAST_URL, LISTEN_URL);

        // Navigate to player so user can see the now-playing info
        safePush('/player');
    };


    const renderContent = () => {
        if (isBroadcasting) {
            return (
                <View style={styles.stateContainer}>
                    <View style={styles.animationWrapper}>
                        <Animated.View style={[
                            styles.pulseCircle, 
                            { 
                                backgroundColor: colors.accent + '30',
                                transform: [{ scale: pulseAnim }]
                            }
                        ]} />
                        <View style={[styles.mainCircle, { backgroundColor: colors.accent }]}>
                            <Ionicons name="radio" size={44} color={CORE_COLORS.white} />
                        </View>
                    </View>
                    
                    <View style={styles.statusInfo}>
                        <Text style={[styles.statusTitle, { color: colors.text }]}>Broadcasting Live</Text>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    </View>

                    <Text style={[styles.statusSubtitle, { color: colors.textMuted }]}>
                        Share this code with your friends to start the party!
                    </Text>
                    
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={handleShare}
                        style={[styles.idCard, { backgroundColor: colors.cardBackground, shadowColor: colors.accent }]}
                    >
                        <Text style={[styles.idText, { color: colors.accent }]}>{roomId}</Text>
                        <View style={styles.shareRow}>
                            <Ionicons name="share-outline" size={16} color={colors.textMuted} />
                            <Text style={[styles.copyHint, { color: colors.textMuted }]}>Tap to invite friends</Text>
                        </View>
                    </TouchableOpacity>

                    <ScalePressable 
                        style={[styles.primaryBtn, { backgroundColor: colors.danger, shadowColor: colors.danger }]} 
                        onPress={stopBroadcast}
                    >
                        <View style={styles.btnContent}>
                            <Ionicons name="stop-circle" size={20} color={CORE_COLORS.white} />
                            <Text style={styles.btnText}>END BROADCAST</Text>
                        </View>
                    </ScalePressable>
                </View>
            );
        }

        if (isListening) {
            return (
                <View style={styles.stateContainer}>
                    <View style={[styles.mainCircle, { backgroundColor: colors.accent }]}>
                        <Ionicons name="headset" size={44} color={CORE_COLORS.white} />
                    </View>
                    <Text style={[styles.statusTitle, { color: colors.text }]}>Connected!</Text>
                    <Text style={[styles.statusSubtitle, { color: colors.textMuted }]}>
                        You&apos;re listening to Room: <Text style={{ color: colors.accent, fontWeight: '900' }}>{roomId}</Text>
                    </Text>
                    
                    <ScalePressable 
                        style={[styles.primaryBtn, { backgroundColor: colors.danger, shadowColor: colors.danger }]} 
                        onPress={() => { leaveRoom(); clearAudio(); }}
                    >
                        <View style={styles.btnContent}>
                            <Ionicons name="log-out" size={20} color={CORE_COLORS.white} />
                            <Text style={styles.btnText}>LEAVE ROOM</Text>
                        </View>
                    </ScalePressable>
                </View>
            );
        }

        return (
            <View style={styles.setupContainer}>
                <View style={[styles.glassCard, { backgroundColor: colors.cardBackground, borderLeftColor: colors.accent, borderLeftWidth: 4 }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconWrapper, { backgroundColor: colors.accent + '15' }]}>
                            <Ionicons name="wifi" size={20} color={colors.accent} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Host a Room</Text>
                    </View>
                    <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                        Let others listen to what you&apos;re playing in real-time.
                    </Text>
                    <ScalePressable 
                        style={[styles.primaryBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]} 
                        onPress={handleCreateRoom}
                    >
                        <View style={styles.btnContent}>
                            <Ionicons name="sparkles" size={18} color={CORE_COLORS.white} />
                            <Text style={styles.btnText}>START HOSTING</Text>
                        </View>
                    </ScalePressable>
                </View>

                <View style={[styles.glassCard, { backgroundColor: colors.cardBackground, borderLeftColor: colors.cardBorder, borderLeftWidth: 4 }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconWrapper, { backgroundColor: colors.textMuted + '15' }]}>
                            <Ionicons name="log-in-outline" size={20} color={colors.text} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Join Room</Text>
                    </View>
                    <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                        Enter a numeric code to start listening.
                    </Text>
                    
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: isDark ? '#ffffff05' : '#00000005',
                            borderColor: isFocused ? colors.accent : colors.cardBorder, 
                            color: colors.text 
                        }]}
                        placeholder="000 000"
                        placeholderTextColor={colors.textMuted}
                        value={joinId}
                        onChangeText={setJoinId}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        autoCapitalize="characters"
                        maxLength={6}
                        keyboardType="number-pad"
                    />

                    <ScalePressable 
                        style={[styles.secondaryBtn, { borderColor: colors.accent }]} 
                        onPress={handleJoinRoom}
                    >
                        <View style={styles.btnContent}>
                            <Ionicons name="enter" size={18} color={colors.accent} />
                            <Text style={[styles.btnText, { color: colors.accent }]}>JOIN NOW</Text>
                        </View>
                    </ScalePressable>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.screenBackground }]}
        >
            <Stack.Screen options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <ScalePressable 
                    style={[styles.backBtn, { backgroundColor: colors.cardBackground }]} 
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </ScalePressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Audio Space</Text>
                <View style={{ width: 44 }} /> 
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {renderContent()}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}


function createStyles(colors: any, isSmall: boolean, screenWidth: number) {
    return StyleSheet.create({
        container: { flex: 1 },
        header: { 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            paddingHorizontal: isSmall ? 16 : 20,
            paddingBottom: 20
        },
        backBtn: { 
            width: isSmall ? 40 : 44, 
            height: isSmall ? 40 : 44, 
            borderRadius: isSmall ? 12 : 14, 
            alignItems: 'center', 
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2
        },
        headerTitle: { fontSize: isSmall ? 20 : 22, fontWeight: '900', letterSpacing: -0.5 },
        scrollContent: { padding: isSmall ? 16 : 20, paddingBottom: 100 },
        
        stateContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: isSmall ? 24 : 40, gap: isSmall ? 20 : 24 },
        animationWrapper: { width: isSmall ? 120 : 140, height: isSmall ? 120 : 140, alignItems: 'center', justifyContent: 'center' },
        pulseCircle: { 
            position: 'absolute',
            width: isSmall ? 100 : 120, 
            height: isSmall ? 100 : 120, 
            borderRadius: 60 
        },
        mainCircle: { 
            width: isSmall ? 80 : 90, 
            height: isSmall ? 80 : 90, 
            borderRadius: 45, 
            alignItems: 'center', 
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 10
        },
        
        statusInfo: { alignItems: 'center', gap: 8 },
        statusTitle: { fontSize: isSmall ? 28 : 34, fontWeight: '900', letterSpacing: -1 },
        liveBadge: { 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: '#FF3B30', 
            paddingHorizontal: isSmall ? 10 : 12, 
            paddingVertical: 4, 
            borderRadius: 8,
            gap: 6
        },
        liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
        liveText: { color: 'white', fontSize: isSmall ? 12 : 13, fontWeight: '900' },
        
        statusSubtitle: { fontSize: isSmall ? 14 : 16, textAlign: 'center', opacity: 0.8, paddingHorizontal: isSmall ? 16 : 20 },
        
        idCard: { 
            width: '100%',
            paddingVertical: isSmall ? 24 : 32, 
            borderRadius: isSmall ? 24 : 32, 
            alignItems: 'center', 
            borderWidth: 1,
            borderColor: 'transparent',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.15,
            shadowRadius: 30,
            elevation: 15
        },
        idText: { fontSize: isSmall ? 48 : 56, fontWeight: '900', letterSpacing: isSmall ? 8 : 10 },
        shareRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
        copyHint: { fontSize: isSmall ? 12 : 13, fontWeight: '700', textTransform: 'uppercase' },
        
        setupContainer: { gap: isSmall ? 22 : 28 },
        glassCard: { 
            padding: isSmall ? 20 : 24, 
            borderRadius: isSmall ? 24 : 28, 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.05,
            shadowRadius: 15,
            elevation: 4
        },
        cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
        iconWrapper: { padding: 10, borderRadius: 12 },
        cardTitle: { fontSize: isSmall ? 20 : 24, fontWeight: '900', letterSpacing: -0.5 },
        cardDesc: { fontSize: isSmall ? 14 : 16, lineHeight: isSmall ? 22 : 24, opacity: 0.8, marginVertical: 8 },
        
        input: { 
            height: isSmall ? 64 : 72,
            borderRadius: isSmall ? 16 : 20, 
            borderWidth: 2, 
            paddingHorizontal: isSmall ? 16 : 20, 
            fontSize: isSmall ? 24 : 28, 
            fontWeight: '900', 
            textAlign: 'center', 
            letterSpacing: isSmall ? 10 : 12,
            marginTop: 8
        },
        btnContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        primaryBtn: { 
            height: isSmall ? 56 : 64, 
            borderRadius: isSmall ? 16 : 20, 
            alignItems: 'center', 
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 15,
            elevation: 8,
            marginTop: 10
        },
        secondaryBtn: { 
            height: isSmall ? 56 : 64, 
            borderRadius: isSmall ? 16 : 20, 
            alignItems: 'center', 
            justifyContent: 'center',
            borderWidth: 2,
            marginTop: 12
        },
        btnText: { color: CORE_COLORS.white, fontSize: isSmall ? 14 : 16, fontWeight: '900', letterSpacing: 1.5 },
    });
}

export default RoomScreen;
