import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '../tokens';

type Props = {
  /** 0..1 (se recorta a 1). */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Color del arco: rojo mientras avanzas, verde al cumplir. */
  color?: string;
  children?: ReactNode;
  accessibilityLabel: string;
};

/** Anillo de progreso dibujado con Skia, con animación al cambiar. */
export function ProgressRing({ progress, size = 200, strokeWidth = 16, color = colors.accent, children, accessibilityLabel }: Props) {
  const end = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    end.value = withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [clamped, end]);

  const path = useMemo(() => {
    const inset = strokeWidth / 2;
    const rect = Skia.XYWHRect(inset, inset, size - strokeWidth, size - strokeWidth);
    return Skia.PathBuilder.Make().addArc(rect, -90, 359.9).build();
  }, [size, strokeWidth]);

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={path} style="stroke" strokeWidth={strokeWidth} color={colors.surfaceRaised} />
        <Path path={path} style="stroke" strokeWidth={strokeWidth} strokeCap="round" color={color} start={0} end={end} />
      </Canvas>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
