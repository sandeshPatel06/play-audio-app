import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BaseDialogProps {
    visible: boolean;
    title: string;
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

export function ActionDialog({ visible, title, message, actions, onClose }: ActionDialogProps) {
    const { colors } = useTheme();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={8}>
                            <Ionicons name="close" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    {!!message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}

                    <View style={styles.actionsWrap}>
                        {actions.map((action) => (
                            <TouchableOpacity
                                key={action.key}
                                style={[styles.actionRow, { borderBottomColor: colors.border }]}
                                onPress={action.onPress}
                            >
                                <Ionicons
                                    name={action.icon}
                                    size={18}
                                    color={action.danger ? '#FF3B30' : colors.accent}
                                />
                                <Text
                                    style={[
                                        styles.actionLabel,
                                        { color: action.danger ? '#FF3B30' : colors.text },
                                    ]}
                                >
                                    {action.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
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
            <View style={styles.overlay}>
                <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    {!!message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.buttonBase} onPress={onClose}>
                            <Text style={[styles.buttonText, { color: colors.textMuted }]}>{cancelText}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.buttonBase,
                                styles.primaryButton,
                                { backgroundColor: danger ? '#FF3B30' : colors.accent },
                            ]}
                            onPress={onConfirm}
                        >
                            <Text style={[styles.buttonText, { color: '#FFF' }]}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
            <View style={styles.overlay}>
                <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    {!!message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}

                    <TouchableOpacity
                        style={[styles.singleButton, { backgroundColor: colors.accent }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.buttonText, { color: '#FFF' }]}>{buttonText}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(2,6,23,0.62)',
        justifyContent: 'center',
        padding: 20,
    },
    sheet: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
    },
    dialog: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 19,
        fontWeight: '800',
    },
    message: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
    },
    actionsWrap: {
        marginTop: 14,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 10,
    },
    buttonRow: {
        marginTop: 18,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    buttonBase: {
        minWidth: 92,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButton: {
        elevation: 1,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    singleButton: {
        marginTop: 20,
        alignSelf: 'flex-end',
        minWidth: 92,
        paddingVertical: 11,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
});
