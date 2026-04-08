import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useRef } from 'react';
import {
    Animated,
    Platform,
    PressableProps,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import { SurfaceVariant } from '../../constants/design';
import { withAlpha } from '../../constants/colors';
import { useAdaptiveTheme, usePageSpacing } from '../../hooks/useAdaptiveTheme';
import ScalePressable from '../ScalePressable';

const ANDROID_BLUR_PROPS = Platform.OS === 'android'
    ? { experimentalBlurMethod: 'dimezisBlurView' as const }
    : {};

type ChildProps = {
    children?: React.ReactNode;
};

interface GlassSurfaceProps extends ChildProps {
    variant?: SurfaceVariant;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    blurIntensity?: number;
}

export function GlassSurface({
    children,
    variant = 'glass',
    style,
    contentStyle,
    blurIntensity,
}: GlassSurfaceProps) {
    const theme = useAdaptiveTheme() as any;

    const backgroundColor = useMemo(() => ({
        glass: theme.surfaces.glass,
        glassStrong: theme.surfaces.glassStrong,
        solidCard: theme.surfaces.solidCard,
        floating: theme.surfaces.floating,
        danger: theme.surfaces.danger,
        accentSurface: theme.surfaces.accentSurface,
    }[variant]), [theme.surfaces, variant]);

    const borderColor = useMemo(() => ({
        glass: theme.surfaces.border,
        glassStrong: theme.surfaces.strongBorder,
        solidCard: theme.surfaces.border,
        floating: theme.surfaces.strongBorder,
        danger: theme.surfaces.dangerBorder,
        accentSurface: theme.surfaces.accentBorder,
    }[variant]), [theme.surfaces, variant]);

    const shouldBlur = variant !== 'solidCard' && variant !== 'danger';

    return (
        <View
            style={[
                styles.surface,
                {
                    borderRadius: theme.radii.lg,
                    borderColor,
                    shadowColor: theme.surfaces.shadow,
                },
                style,
            ]}
        >
            {shouldBlur && (
                <BlurView
                    tint={theme.isDark ? 'dark' : 'light'}
                    intensity={blurIntensity ?? theme.blurIntensity}
                    style={StyleSheet.absoluteFill}
                    {...ANDROID_BLUR_PROPS}
                />
            )}
            <View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor,
                        borderRadius: theme.radii.lg,
                    },
                ]}
            />
            <View style={contentStyle}>{children}</View>
        </View>
    );
}

interface PageShellProps extends ChildProps {
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    glowOffset?: 'left' | 'right';
}

export function PageShell({ children, style, contentStyle, glowOffset = 'right' }: PageShellProps) {
    const theme = useAdaptiveTheme();

    return (
        <View style={[styles.pageShell, { backgroundColor: theme.colors.screenBackground }, style]}>
            <View
                pointerEvents="none"
                style={[
                    styles.glow,
                    {
                        backgroundColor: theme.artworkPalette.glow,
                        top: -120,
                        [glowOffset]: -96,
                    },
                ]}
            />
            <View
                pointerEvents="none"
                style={[
                    styles.secondaryGlow,
                    {
                        backgroundColor: withAlpha(theme.accent, theme.isDark ? 0.09 : 0.06),
                    },
                ]}
            />
            <View style={[styles.pageContent, contentStyle]}>{children}</View>
        </View>
    );
}

interface GlassHeaderProps {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function GlassHeader({
    eyebrow,
    title,
    subtitle,
    leading,
    trailing,
    style,
}: GlassHeaderProps) {
    const theme = useAdaptiveTheme();
    const page = usePageSpacing();

    return (
        <View style={[{ paddingHorizontal: page.horizontal }, style]}>
            <GlassSurface
                variant="glassStrong"
                contentStyle={[
                    styles.headerSurface,
                    {
                        paddingHorizontal: theme.spacing.card,
                        paddingVertical: theme.spacing.md,
                        gap: theme.spacing.sm,
                    },
                ]}
            >
                {leading ? <View style={styles.headerEdge}>{leading}</View> : null}
                <View style={styles.headerCopy}>
                    {eyebrow ? (
                        <Text style={[styles.eyebrow, { color: theme.accent, fontSize: theme.typeScale.eyebrow }]}>
                            {eyebrow}
                        </Text>
                    ) : null}
                    <Text style={[styles.headerTitle, { color: theme.colors.text, fontSize: theme.typeScale.title }]}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted, fontSize: theme.typeScale.bodySmall }]}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                {trailing ? <View style={styles.headerEdge}>{trailing}</View> : null}
            </GlassSurface>
        </View>
    );
}

interface SectionCardProps extends ChildProps {
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    variant?: SurfaceVariant;
}

export function SectionCard({ children, style, contentStyle, variant = 'glass' }: SectionCardProps) {
    const theme = useAdaptiveTheme();

    return (
        <GlassSurface
            variant={variant}
            style={style}
            contentStyle={[
                {
                    paddingHorizontal: theme.spacing.card,
                    paddingVertical: theme.spacing.card,
                },
                contentStyle,
            ]}
        >
            {children}
        </GlassSurface>
    );
}

interface ActionChipProps extends Omit<PressableProps, 'style'> {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    selected?: boolean;
    danger?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

export function ActionChip({
    label,
    icon,
    selected = false,
    danger = false,
    style,
    textStyle,
    ...pressableProps
}: ActionChipProps) {
    const theme = useAdaptiveTheme();

    const backgroundColor = danger
        ? theme.colors.dangerSurface
        : selected
            ? theme.colors.accentSurface
            : theme.colors.cardBackground;
    const borderColor = danger
        ? theme.colors.dangerBorder
        : selected
            ? theme.colors.accent
            : theme.colors.cardBorder;
    const color = danger
        ? theme.colors.danger
        : selected
            ? theme.accent
            : theme.colors.textMuted;

    return (
        <ScalePressable
            scaleTo={theme.motion.pressScale}
            style={[
                styles.actionChip,
                {
                    borderRadius: theme.radii.pill,
                    backgroundColor,
                    borderColor,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.xs + 2,
                },
                style,
            ]}
            {...pressableProps}
        >
            {icon ? <Ionicons name={icon} size={14} color={color} style={styles.actionChipIcon} /> : null}
            <Text style={[styles.actionChipText, { color, fontSize: theme.typeScale.bodySmall }, textStyle]}>
                {label}
            </Text>
        </ScalePressable>
    );
}

interface SegmentedControlOption<T extends string> {
    label: string;
    value: T;
    icon?: keyof typeof Ionicons.glyphMap;
}

interface SegmentedControlProps<T extends string> {
    options: SegmentedControlOption<T>[];
    value: T;
    onChange: (value: T) => void;
    style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    style,
}: SegmentedControlProps<T>) {
    const theme = useAdaptiveTheme();

    return (
        <GlassSurface
            variant="glass"
            style={style}
            contentStyle={[
                styles.segmentedWrap,
                {
                    padding: theme.spacing.xxs,
                    gap: theme.spacing.xs,
                },
            ]}
        >
            {options.map((option) => (
                <ActionChip
                    key={option.value}
                    label={option.label}
                    icon={option.icon}
                    selected={value === option.value}
                    onPress={() => onChange(option.value)}
                    style={styles.segmentedChip}
                />
            ))}
        </GlassSurface>
    );
}

interface EmptyStateProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: StyleProp<ViewStyle>;
}

export function EmptyState({
    icon,
    title,
    message,
    actionLabel,
    onAction,
    style,
}: EmptyStateProps) {
    const theme = useAdaptiveTheme();

    return (
        <SectionCard style={style} contentStyle={styles.emptyCardContent}>
            <View
                style={[
                    styles.emptyIconWrap,
                    {
                        backgroundColor: theme.colors.accentSurface,
                        borderRadius: theme.radii.lg,
                    },
                ]}
            >
                <Ionicons name={icon} size={34} color={theme.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text, fontSize: theme.typeScale.sectionTitle }]}>
                {title}
            </Text>
            <Text style={[styles.emptyMessage, { color: theme.colors.textMuted, fontSize: theme.typeScale.body }]}>
                {message}
            </Text>
            {actionLabel && onAction ? (
                <ActionChip label={actionLabel} selected icon="arrow-forward" onPress={onAction} style={{ marginTop: theme.spacing.sm }} />
            ) : null}
        </SectionCard>
    );
}

interface SkeletonBlockProps {
    height: number;
    width?: number | string;
    style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({ height, width = '100%', style }: SkeletonBlockProps) {
    const theme = useAdaptiveTheme();
    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.85,
                    duration: theme.motion.cardMs,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.45,
                    duration: theme.motion.cardMs,
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();

        return () => {
            loop.stop();
            opacity.stopAnimation();
        };
    }, [opacity, theme.motion.cardMs]);

    return (
        <Animated.View
            style={[
                {
                    height,
                    width: width as any,
                    borderRadius: theme.radii.md,
                    backgroundColor: theme.colors.cardBackgroundStrong,
                    opacity,
                },
                style,
            ]}
        />
    );
}

interface GlassDialogProps extends ChildProps {
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
}

export function GlassDialog({ children, style, contentStyle }: GlassDialogProps) {
    const theme = useAdaptiveTheme();

    return (
        <GlassSurface
            variant="glassStrong"
            style={[styles.dialogWrap, style]}
            contentStyle={[
                {
                    paddingHorizontal: theme.spacing.card,
                    paddingVertical: theme.spacing.card,
                    gap: theme.spacing.sm,
                },
                contentStyle,
            ]}
        >
            {children}
        </GlassSurface>
    );
}

interface BottomSheetScaffoldProps extends ChildProps {
    title: string;
    subtitle?: string;
    trailing?: React.ReactNode;
    scrollable?: boolean;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
}

export function BottomSheetScaffold({
    children,
    title,
    subtitle,
    trailing,
    scrollable = false,
    style,
    contentStyle,
}: BottomSheetScaffoldProps) {
    const theme = useAdaptiveTheme();
    const body = (
        <>
            <View style={[styles.sheetHandle, { backgroundColor: theme.colors.textMuted }]} />
            <View style={styles.sheetHeader}>
                <View style={styles.sheetCopy}>
                    <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{title}</Text>
                    {subtitle ? (
                        <Text style={[styles.sheetSubtitle, { color: theme.colors.textMuted }]}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                {trailing}
            </View>
            {scrollable ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={contentStyle}>
                    {children}
                </ScrollView>
            ) : (
                <View style={contentStyle}>{children}</View>
            )}
        </>
    );

    return (
        <GlassSurface
            variant="glassStrong"
            style={[styles.sheetWrap, style]}
            contentStyle={[
                {
                    paddingHorizontal: theme.spacing.card,
                    paddingTop: theme.spacing.sm,
                    paddingBottom: theme.spacing.lg,
                },
            ]}
        >
            {body}
        </GlassSurface>
    );
}

const styles = StyleSheet.create({
    surface: {
        overflow: 'hidden',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
        elevation: 6,
    },
    pageShell: {
        flex: 1,
    },
    pageContent: {
        flex: 1,
    },
    glow: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    secondaryGlow: {
        position: 'absolute',
        left: -80,
        bottom: 96,
        width: 220,
        height: 220,
        borderRadius: 110,
    },
    headerSurface: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerEdge: {
        minWidth: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCopy: {
        flex: 1,
    },
    eyebrow: {
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        marginBottom: 2,
    },
    headerTitle: {
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        marginTop: 4,
        fontWeight: '600',
    },
    actionChip: {
        minHeight: 40,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionChipIcon: {
        marginRight: 6,
    },
    actionChipText: {
        fontWeight: '800',
    },
    segmentedWrap: {
        flexDirection: 'row',
    },
    segmentedChip: {
        flex: 1,
    },
    emptyCardContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
    },
    emptyIconWrap: {
        width: 76,
        height: 76,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyMessage: {
        lineHeight: 22,
        textAlign: 'center',
        maxWidth: 320,
    },
    dialogWrap: {
        width: '100%',
        maxWidth: 440,
    },
    sheetWrap: {
        width: '100%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    sheetHandle: {
        width: 42,
        height: 5,
        borderRadius: 999,
        alignSelf: 'center',
        marginBottom: 18,
        opacity: 0.32,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
        gap: 12,
    },
    sheetCopy: {
        flex: 1,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '900',
    },
    sheetSubtitle: {
        marginTop: 2,
        fontSize: 13,
        fontWeight: '600',
    },
});
