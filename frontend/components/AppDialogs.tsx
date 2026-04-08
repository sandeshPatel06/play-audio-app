import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ScalePressable from './ScalePressable';
import { BottomSheetScaffold, GlassDialog } from './ui/primitives';

interface BaseDialogProps {
    visible: boolean;
    title: string;
    subtitle?: string;
    imageSource?: any;
    message?: string;
    onClose: () => void;
}

interface ConfirmDialogProps extends BaseDialogProps {
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
}

interface NoticeDialogProps extends BaseDialogProps {
    buttonText?: string;
}

interface ActionItem {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    danger?: boolean;
    onPress: () => void;
}

interface ActionDialogProps extends BaseDialogProps {
    actions: ActionItem[];
}

export function ActionDialog({ visible, title, subtitle, imageSource, message, actions, onClose }: ActionDialogProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[styles.overlaySheet, { backgroundColor: colors.modalOverlay }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <BottomSheetScaffold
                    title={title}
                    subtitle={subtitle}
                    style={{ paddingBottom: Math.max(insets.bottom, 24) }}
                    trailing={
                        <ScalePressable style={[styles.closeButton, { backgroundColor: colors.cardBackground }]} onPress={onClose} hitSlop={8}>
                            <Ionicons name="close" size={22} color={colors.textMuted} />
                        </ScalePressable>
                    }
                >
                    {!!imageSource && (
                        <View style={[styles.sheetHero, { backgroundColor: colors.cardBackgroundSubtle, borderColor: colors.cardBorder }]}>
                            <Image source={imageSource} style={styles.headerImage} />
                            {!!message && <Text style={[styles.message, { color: colors.textMuted, flex: 1 }]}>{message}</Text>}
                        </View>
                    )}
                    {!imageSource && !!message && <Text style={[styles.message, { color: colors.textMuted, marginBottom: 6 }]}>{message}</Text>}

                    <View style={styles.actionsWrap}>
                        {actions.map((action) => (
                            <ScalePressable
                                key={action.key}
                                style={[
                                    styles.actionRow,
                                    {
                                        backgroundColor: action.danger ? colors.dangerSurface : colors.cardBackgroundSubtle,
                                        borderColor: action.danger ? colors.dangerBorder : colors.cardBorder,
                                    },
                                ]}
                                onPress={action.onPress}
                            >
                                <Ionicons
                                    name={action.icon}
                                    size={24}
                                    color={action.danger ? colors.danger : colors.text}
                                />
                                <Text
                                    style={[
                                        styles.actionLabel,
                                        { color: action.danger ? colors.danger : colors.text },
                                    ]}
                                >
                                    {action.label}
                                </Text>
                            </ScalePressable>
                        ))}
                    </View>
                </BottomSheetScaffold>
            </View>
        </Modal>
    );
}

export function ConfirmDialog({
    visible,
    title,
    message,
    onClose,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
}: ConfirmDialogProps) {
    const { colors } = useTheme();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <GlassDialog>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    {!!message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}

                    <View style={styles.buttonRow}>
                        <ScalePressable style={[styles.buttonBase, { backgroundColor: colors.modalCancelBackground }]} onPress={onClose}>
                            <Text style={[styles.buttonText, { color: colors.textMuted }]}>{cancelText}</Text>
                        </ScalePressable>
                        <ScalePressable
                            style={[
                                styles.buttonBase,
                                styles.primaryButton,
                                { backgroundColor: danger ? colors.danger : colors.accent },
                            ]}
                            onPress={onConfirm}
                        >
                            <Text style={[styles.buttonText, { color: danger ? colors.onDanger : colors.onAccent }]}>{confirmText}</Text>
                        </ScalePressable>
                    </View>
                </GlassDialog>
            </View>
        </Modal>
    );
}

export function NoticeDialog({
    visible,
    title,
    message,
    onClose,
    buttonText = 'OK',
}: NoticeDialogProps) {
    const { colors } = useTheme();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <GlassDialog>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    {!!message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}

                    <ScalePressable
                        style={[styles.singleButton, { backgroundColor: colors.accent }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.buttonText, { color: colors.onAccent }]}>{buttonText}</Text>
                    </ScalePressable>
                </GlassDialog>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    overlaySheet: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    headerImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    sheetHero: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    message: {
        marginTop: 10,
        fontSize: 14,
        lineHeight: 21,
    },
    divider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginVertical: 16,
    },
    actionsWrap: {
        marginTop: 4,
        gap: 6,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 56,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 16,
    },
    buttonRow: {
        marginTop: 22,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    buttonBase: {
        minWidth: 108,
        minHeight: 46,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        elevation: 1,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    singleButton: {
        marginTop: 22,
        alignSelf: 'flex-end',
        minWidth: 108,
        minHeight: 46,
        paddingVertical: 11,
        paddingHorizontal: 18,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
