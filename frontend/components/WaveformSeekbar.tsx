import React, { useMemo, useRef } from 'react';
import {
    GestureResponderEvent,
    PanResponder,
    PanResponderGestureState,
    StyleSheet,
    View,
} from 'react-native';

type WaveformSeekbarProps = {
    samples: number[];
    progressSeconds: number;
    durationSeconds: number;
    activeColor: string;
    inactiveColor: string;
    scrubberColor: string;
    onSeekStart: () => void;
    onSeekPreview: (seconds: number) => void;
    onSeekComplete: (seconds: number) => void;
};

const BAR_COUNT = 44;

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

const buildWaveform = (samples: number[]) => {
    if (samples.length === 0) {
        return Array.from({ length: BAR_COUNT }, (_, index) => 0.22 + ((index % 5) * 0.12));
    }

    return Array.from({ length: BAR_COUNT }, (_, index) => {
        const sampleIndex = Math.min(
            samples.length - 1,
            Math.floor((index / Math.max(BAR_COUNT - 1, 1)) * samples.length)
        );
        return clamp(samples[sampleIndex] || 0.2, 0.08, 1);
    });
};

export default function WaveformSeekbar({
    samples,
    progressSeconds,
    durationSeconds,
    activeColor,
    inactiveColor,
    scrubberColor,
    onSeekStart,
    onSeekPreview,
    onSeekComplete,
}: WaveformSeekbarProps) {
    const trackWidthRef = useRef(1);
    const waveformBars = useMemo(() => buildWaveform(samples), [samples]);
    const progressRatio = durationSeconds > 0 ? clamp(progressSeconds / durationSeconds, 0, 1) : 0;

    const resolveSeconds = (locationX: number) => {
        if (durationSeconds <= 0) {
            return 0;
        }

        const ratio = clamp(locationX / Math.max(trackWidthRef.current, 1), 0, 1);
        return ratio * durationSeconds;
    };

    const handleSeekPreview = (
        event: GestureResponderEvent | PanResponderGestureState,
        commit = false
    ) => {
        const locationX = 'nativeEvent' in event ? event.nativeEvent.locationX : event.moveX;
        const seconds = resolveSeconds(locationX);
        if (commit) {
            onSeekComplete(seconds);
            return;
        }
        onSeekPreview(seconds);
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (event) => {
                onSeekStart();
                handleSeekPreview(event);
            },
            onPanResponderMove: (event) => {
                handleSeekPreview(event);
            },
            onPanResponderRelease: (event) => {
                handleSeekPreview(event, true);
            },
            onPanResponderTerminate: (event) => {
                handleSeekPreview(event, true);
            },
        })
    ).current;

    return (
        <View
            style={styles.container}
            onLayout={(event) => {
                trackWidthRef.current = Math.max(event.nativeEvent.layout.width, 1);
            }}
            {...panResponder.panHandlers}
        >
            <View style={styles.barRow}>
                {waveformBars.map((sample, index) => {
                    const barRatio = index / Math.max(waveformBars.length - 1, 1);
                    const isActive = barRatio <= progressRatio;

                    return (
                        <View
                            key={`${index}-${sample}`}
                            style={[
                                styles.bar,
                                {
                                    height: 12 + sample * 42,
                                    backgroundColor: isActive ? activeColor : inactiveColor,
                                },
                            ]}
                        />
                    );
                })}
            </View>

            <View
                style={[
                    styles.scrubber,
                    {
                        backgroundColor: scrubberColor,
                        left: `${progressRatio * 100}%`,
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 72,
        justifyContent: 'center',
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
        height: 64,
        overflow: 'hidden',
    },
    bar: {
        flex: 1,
        borderRadius: 999,
        minHeight: 10,
    },
    scrubber: {
        position: 'absolute',
        width: 3,
        height: 72,
        borderRadius: 999,
        marginLeft: -1.5,
    },
});
