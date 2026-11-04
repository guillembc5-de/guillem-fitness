import { Canvas, DashPathEffect, Line as SkLine, RoundedRect, vec } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { colors, spacing } from '../tokens';
import { AppText } from './AppText';

export type Bar = {
  key: string;
  value: number | null;
  label: string;
  /** Texto del detalle al tocar la barra. */
  detail: string;
  /** Color de la barra (por defecto, gris). */
  color?: string;
  highlighted?: boolean;
};

type Props = {
  bars: readonly Bar[];
  /** Línea de objetivo. */
  goal?: number;
  height?: number;
  /** Muestra la etiqueta solo cada N barras (para meses). */
  labelEvery?: number;
  accessibilityLabel: string;
};

/** Gráfica de barras con línea de objetivo (Skia). Toca una barra para ver su valor. */
export function BarChart({ bars, goal, height = 160, labelEvery = 1, accessibilityLabel }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(goal ?? 0, ...bars.map((b) => b.value ?? 0), 1) * 1.08;
  const gap = bars.length > 14 ? 2 : 8;
  const barWidth = bars.length > 0 ? Math.max(2, (width - gap * (bars.length - 1)) / bars.length) : 0;
  const y = (v: number) => height - (v / max) * height;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const pick = (e: GestureResponderEvent) => {
    if (bars.length === 0 || width === 0) return;
    const i = Math.floor((e.nativeEvent.locationX / width) * bars.length);
    setSelected(Math.max(0, Math.min(bars.length - 1, i)));
  };

  const sel = selected !== null ? bars[selected] : undefined;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={accessibilityLabel}>
      <AppText variant="caption" color={sel ? 'text' : 'textSecondary'} style={styles.tooltip}>
        {sel ? sel.detail : 'Toca una barra para ver el detalle'}
      </AppText>
      <View
        style={{ height }}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
      >
        {width > 0 ? (
          <Canvas style={StyleSheet.absoluteFill}>
            {bars.map((b, i) => {
              const v = b.value ?? 0;
              const h = Math.max(v > 0 ? 3 : 0, height - y(v));
              return (
                <RoundedRect
                  key={b.key}
                  x={i * (barWidth + gap)}
                  y={height - h}
                  width={barWidth}
                  height={h}
                  r={Math.min(4, barWidth / 2)}
                  color={b.color ?? colors.textTertiary}
                  opacity={selected === null || selected === i ? 1 : 0.5}
                />
              );
            })}
            {goal ? (
              <SkLine p1={vec(0, y(goal))} p2={vec(width, y(goal))} color={colors.textSecondary} strokeWidth={1}>
                <DashPathEffect intervals={[4, 4]} />
              </SkLine>
            ) : null}
          </Canvas>
        ) : null}
      </View>
      <View style={styles.labels}>
        {bars.map((b, i) => (
          <AppText
            key={b.key}
            variant="caption"
            color={b.highlighted ? 'text' : 'textTertiary'}
            align="center"
            style={[styles.label, { width: barWidth + (i < bars.length - 1 ? gap : 0) }]}
            numberOfLines={1}
          >
            {i % labelEvery === 0 ? b.label : ''}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  tooltip: { minHeight: 18 },
  labels: { flexDirection: 'row' },
  label: { fontSize: 11 },
});
