import { Canvas, Circle, Line as SkLine, Path, Skia, vec } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { colors, spacing } from '../tokens';
import { AppText } from './AppText';

export type ChartPoint = { x: number; y: number };

type Props = {
  points: readonly ChartPoint[];
  height?: number;
  /** Formato del valor (eje y y tooltip). */
  formatY: (y: number) => string;
  /** Formato de la x (fecha) en el tooltip y en los extremos. */
  formatX: (x: number) => string;
  accessibilityLabel: string;
};

const PAD = { top: 12, bottom: 8, left: 4, right: 4 };
const Y_LABEL_WIDTH = 52;

/**
 * Gráfica de líneas dibujada con Skia (GPU). Pensada para series de hasta
 * cientos de puntos (2 años de entrenos) sin perder fluidez.
 * Toca o arrastra para ver el valor de cada punto.
 */
export function LineChart({ points, height = 180, formatY, formatX, accessibilityLabel }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const plotWidth = Math.max(0, width - Y_LABEL_WIDTH - PAD.left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;

  const geometry = useMemo(() => {
    if (points.length === 0 || plotWidth <= 0) return null;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }
    const spanY = maxY - minY;
    minY -= spanY * 0.1;
    maxY += spanY * 0.1;
    const sx = (x: number) => PAD.left + (maxX === minX ? plotWidth / 2 : ((x - minX) / (maxX - minX)) * plotWidth);
    const sy = (y: number) => PAD.top + (1 - (y - minY) / (maxY - minY)) * plotHeight;
    const builder = Skia.PathBuilder.Make();
    points.forEach((p, i) => (i === 0 ? builder.moveTo(sx(p.x), sy(p.y)) : builder.lineTo(sx(p.x), sy(p.y))));
    const path = builder.build();
    const ticks = [maxY, (maxY + minY) / 2, minY];
    return { path, sx, sy, ticks };
  }, [points, plotWidth, plotHeight]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const pick = (e: GestureResponderEvent) => {
    if (!geometry || points.length === 0) return;
    const x = e.nativeEvent.locationX - Y_LABEL_WIDTH;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(geometry.sx(p.x) - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setSelected(best);
  };

  const sel = selected !== null ? points[selected] : undefined;
  const last = points[points.length - 1];
  const first = points[0];

  return (
    <View style={styles.wrap} accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.tooltip}>
        {sel ? (
          <AppText variant="caption" color="text">
            {formatX(sel.x)} · {formatY(sel.y)}
          </AppText>
        ) : last ? (
          <AppText variant="caption" color="textSecondary">
            Último: {formatY(last.y)} · toca la gráfica para ver cada punto
          </AppText>
        ) : null}
      </View>
      <View
        style={{ height }}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderTerminationRequest={() => true}
      >
        {geometry ? (
          <>
            <Canvas style={[StyleSheet.absoluteFill, { left: Y_LABEL_WIDTH }]}>
              {geometry.ticks.map((t, i) => (
                <SkLine
                  key={i}
                  p1={vec(PAD.left, geometry.sy(t))}
                  p2={vec(PAD.left + plotWidth, geometry.sy(t))}
                  color={colors.border}
                  strokeWidth={1}
                />
              ))}
              <Path path={geometry.path} style="stroke" strokeWidth={2.5} color={colors.accent} strokeJoin="round" strokeCap="round" />
              {points.length <= 60
                ? points.map((p, i) => <Circle key={i} cx={geometry.sx(p.x)} cy={geometry.sy(p.y)} r={3} color={colors.accent} />)
                : null}
              {sel ? <Circle cx={geometry.sx(sel.x)} cy={geometry.sy(sel.y)} r={6} color={colors.text} /> : null}
            </Canvas>
            {geometry.ticks.map((t, i) => (
              <AppText
                key={i}
                variant="caption"
                color="textSecondary"
                style={[styles.yLabel, { top: geometry.sy(t) - 9 }]}
                numberOfLines={1}
              >
                {formatY(t)}
              </AppText>
            ))}
          </>
        ) : null}
      </View>
      {first && last ? (
        <View style={styles.xLabels}>
          <AppText variant="caption" color="textTertiary">
            {formatX(first.x)}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {formatX(last.x)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  tooltip: { minHeight: 18 },
  yLabel: { position: 'absolute', left: 0, width: Y_LABEL_WIDTH - 6, textAlign: 'right' },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: Y_LABEL_WIDTH },
});
