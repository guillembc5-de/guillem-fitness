import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, NumberField, TextField, spacing } from '@/design';
import { formatNumber } from '@/domain/format';

import { rowTotals, type FoodRow } from './foodDraft';

type Props = {
  row: FoodRow;
  onChange: (patch: Partial<FoodRow>) => void;
  onRemove: () => void;
};

/**
 * Un alimento editable. Al cambiar los gramos, las kcal y los macros se
 * recalculan con los valores por 100 g.
 */
export function FoodRowEditor({ row, onChange, onRemove }: Props) {
  const [expanded, setExpanded] = useState(!row.aiEstimated && row.kcal100 === '');
  const totals = rowTotals(row);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <TextField label="Alimento" value={row.name} onChangeText={(name) => onChange({ name })} placeholder="Por ejemplo: arroz blanco" />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${row.name || 'alimento'}`} onPress={onRemove} style={styles.remove}>
          <Icon name="trash-outline" color="textSecondary" />
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.grams}>
          <NumberField label="Ración" unit="g" maxDecimals={0} value={row.grams} onChangeText={(grams) => onChange({ grams })} />
        </View>
        <View style={styles.result} accessible accessibilityLabel={`${formatNumber(totals.kcal)} kilocalorías`}>
          <AppText variant="caption" color="textSecondary">
            Calorías
          </AppText>
          <AppText variant="numberField">{formatNumber(totals.kcal)}</AppText>
          <AppText variant="caption" color="textSecondary">
            P {formatNumber(totals.protein, { maxDecimals: 1 })} · H {formatNumber(totals.carbs, { maxDecimals: 1 })} · G{' '}
            {formatNumber(totals.fat, { maxDecimals: 1 })} g
          </AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((e) => !e)}
        style={styles.toggle}
      >
        <AppText variant="caption" color="textSecondary">
          {expanded ? 'Ocultar valores por 100 g' : 'Editar valores por 100 g'}
        </AppText>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="textSecondary" />
      </Pressable>

      {expanded ? (
        <View style={styles.per100}>
          <View style={styles.half}>
            <NumberField label="kcal / 100 g" maxDecimals={0} value={row.kcal100} onChangeText={(kcal100) => onChange({ kcal100 })} />
          </View>
          <View style={styles.half}>
            <NumberField label="Proteína / 100 g" maxDecimals={1} value={row.protein100} onChangeText={(protein100) => onChange({ protein100 })} />
          </View>
          <View style={styles.half}>
            <NumberField label="Hidratos / 100 g" maxDecimals={1} value={row.carbs100} onChangeText={(carbs100) => onChange({ carbs100 })} />
          </View>
          <View style={styles.half}>
            <NumberField label="Grasa / 100 g" maxDecimals={1} value={row.fat100} onChangeText={(fat100) => onChange({ fat100 })} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  flex: { flex: 1 },
  remove: { width: 44, height: 56, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  grams: { width: 140 },
  result: { flex: 1, gap: 2, paddingBottom: spacing.xxs },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  per100: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  half: { width: '47%' },
});
