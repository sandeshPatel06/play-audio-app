import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    disabled?: boolean;
    colors: {
        text: string;
        textMuted: string;
        border: string;
        accent: string;
    };
}

export default function PaginationControls({
    currentPage,
    totalPages,
    onPrev,
    onNext,
    disabled = false,
    colors,
}: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    const canPrev = currentPage > 1 && !disabled;
    const canNext = currentPage < totalPages && !disabled;

    return (
        <View style={[styles.container, { borderColor: colors.border }]}>
            <TouchableOpacity
                onPress={onPrev}
                disabled={!canPrev}
                style={[styles.btn, !canPrev && styles.btnDisabled]}
            >
                <Ionicons name="chevron-back" size={16} color={canPrev ? colors.text : colors.textMuted} />
                <Text style={[styles.btnText, { color: canPrev ? colors.text : colors.textMuted }]}>Prev</Text>
            </TouchableOpacity>

            <Text style={[styles.pageText, { color: colors.textMuted }]}>
                Page {currentPage} / {totalPages}
            </Text>

            <TouchableOpacity
                onPress={onNext}
                disabled={!canNext}
                style={[styles.btn, !canNext && styles.btnDisabled]}
            >
                <Text style={[styles.btnText, { color: canNext ? colors.text : colors.textMuted }]}>Next</Text>
                <Ionicons name="chevron-forward" size={16} color={canNext ? colors.text : colors.textMuted} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    btnDisabled: {
        opacity: 0.55,
    },
    btnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    pageText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
