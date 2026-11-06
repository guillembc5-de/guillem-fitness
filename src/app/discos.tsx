import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Chip, NumberField, Screen, colors, radii, spacing } from '@/design';
import { formatNumber, fromDisplayWeight, toDisplayWeight } from '@/domain/format';
import { parseDecimal, toInputText } from '@/domain/parseNumber';
import { plateBreakdown } from '@/domain/plates';
import { useProfile } from '@/features/profile/queries';
import { useWorkoutSettings } from '@/features/workout/settings';

/** Barras habituales: olímpica, de mujer o corta, y la Z. */
const BARS = [20, 15, 10] as const;

/** Colores de disco de competición, para reconocerlos de un vistazo. */
function plateColor(kg: number): string {
  if (kg >= 25) return '#D33A3A';
  if (kg >= 20) return '#3A6FD3';
  if (kg >= 15) return '#D3B43A';
  if (kg >= 10) return '#3AA55E';
  return '#9A9AA0';
}

/** Qué discos poner en cada lado de la barra para un peso. */
export default function PlatesScreen() {
  const { kg } = useLocalSearchParams<{ kg?: string }>();
  const profile = useProfile();
  const unit = profile.data?.weightUnit ?? 'kg';
  const settings = useWorkoutSettings();
  const initial = kg && Number(kg) > 0 ? toInputText(toDisplayWeight(Number(kg), unit), 2) : '';
  const [weight, setWeight] = useState(initial);
  const [bar, setBar] = useState<number>(settings.barKg);

  const target = parseDecimal(weight);
  const targetKg = target !== null ? fromDisplayWeight(target, unit) : null;
  const result = targetKg !== null ? plateBreakdown(targetKg, bar, settings.plates) : null;
  const perSide = result?.perSide.flatMap((p) => Array.from({ length: p.count }, () => p.plate)) ?? [];

  return (
    <Screen edges={[]}>
      <NumberField label="Peso total" value={weight} onChangeText={setWeight} unit={unit} maxDecimals={2} placeholder="100" />
      <View style={styles.row}>
        <AppText variant="caption" color="textSecondary">
          Barra:
        </AppText>
        {BARS.map((b) => (
          <Chip key={b} label={`${formatNumber(b)} kg`} selected={bar === b} onPress={() => setBar(b)} />
        ))}
      </View>

      {result && targetKg !== null ? (
        <Card style={styles.card}>
          {targetKg <= bar ? (
            <AppText variant="body" color="textSecondary">
              Con {formatNumber(targetKg, { maxDecimals: 2 })} kg basta con la barra (pesa {formatNumber(bar)} kg).
            </AppText>
          ) : (
            <>
              <AppText variant="overline" color="textSecondary">
                En cada lado
              </AppText>
              <View style={styles.bar} accessible accessibilityLabel={`En cada lado: ${result.perSide.map((p) => `${p.count} de ${formatNumber(p.plate, { maxDecimals: 2 })}`).join(', ')}`}>
                <View style={styles.sleeveStart} />
                {perSide.map((p, i) => (
                  <View key={i} style={[styles.plate, { height: 40 + Math.min(p, 25) * 3.2, backgroundColor: plateColor(p) }]} />
                ))}
                <View style={styles.sleeve} />
              </View>
              {result.perSide.map((p) => (
                <View key={p.plate} style={styles.line}>
                  <View style={[styles.dot, { backgroundColor: plateColor(p.plate) }]} />
                  <AppText variant="bodyStrong" style={styles.flex}>
                    {formatNumber(p.plate, { maxDecimals: 2 })} kg
                  </AppText>
                  <AppText variant="number">× {p.count}</AppText>
                </View>
              ))}
              {result.remainderKg > 0 ? (
                <AppText variant="caption" color="warmup">
                  Con tus discos, lo más cercano es {formatNumber(result.achievedKg, { maxDecimals: 2 })} kg (faltan {formatNumber(result.remainderKg, { maxDecimals: 2 })} kg).
                </AppText>
              ) : null}
            </>
          )}
        </Card>
      ) : (
        <AppText variant="body" color="textSecondary" align="center">
          Escribe el peso total para ver qué discos poner.
        </AppText>
      )}
      <AppText variant="caption" color="textTertiary">
        Puedes cambiar la barra por defecto y los discos que tiene tu gimnasio en Perfil → Entreno.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  card: { gap: spacing.sm },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 130, paddingVertical: spacing.xs },
  sleeveStart: { width: 12, height: 18, borderRadius: 3, backgroundColor: colors.textTertiary },
  sleeve: { flex: 1, height: 12, borderRadius: radii.sm, backgroundColor: colors.textTertiary },
  plate: { width: 14, borderRadius: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
