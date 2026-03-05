import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

interface ScalePressableProps extends PressableProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
}

export default function ScalePressable({
    children,
    style,
    scaleTo = 0.95,
    ...props
}: ScalePressableProps) {
    void scaleTo;

    return (
        <Pressable
            {...props}
            style={style}
        >
            {children}
        </Pressable>
    );
}
