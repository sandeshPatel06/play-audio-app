import React, { useRef } from 'react';
import {
    Animated,
    Pressable,
    PressableProps,
    StyleProp,
    ViewStyle,
} from 'react-native';

interface ScalePressableProps extends PressableProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
}

export default function ScalePressable({
    children,
    style,
    scaleTo = 0.95,
    onPressIn,
    onPressOut,
    ...props
}: ScalePressableProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const animateTo = (value: number) => {
        Animated.spring(scale, {
            toValue: value,
            useNativeDriver: true,
            speed: 30,
            bounciness: 0,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <Pressable
                {...props}
                onPressIn={(event) => {
                    animateTo(scaleTo);
                    onPressIn?.(event);
                }}
                onPressOut={(event) => {
                    animateTo(1);
                    onPressOut?.(event);
                }}
                style={style}
            >
                {children}
            </Pressable>
        </Animated.View>
    );
}
