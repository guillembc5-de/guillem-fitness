import { Pressable, StyleSheet, TextInput } from 'react-native';

import { AppText, colors, radii, spacing, typography } from '@/design';
import type { SetType } from '@/domain/enums';
import { formatDuration } from '@/domain/format';
import { sanitizeDecimalInput } from '@/domain/parseNumber';

import { SET_TYPE_LABELS } from './labels';

/** Número de serie, o «W» en ámbar si es de calentamiento. Tocable para cambiar el tipo. */
export function SetBadge({ setType, number, onPress }: { setType: SetType; number: number; onPress?: () => void }) {
  const label = setType === 'warmup' ? 'W' : String(number);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Serie ${number}, ${SET_TYPE_LABELS[setType].toLowerCase()}`}
      accessibilityHint={onPress ? 'Cambiar tipo o borrar la serie' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={styles.badge}
    >
      <AppText variant="headline" color={setType === 'warmup' ? 'warmup' : 'text'} style={styles.tabular}>
        {label}
      </AppText>
    </Pressable>
  );
}

type CellProps = {
  value: string;
  onChangeText: (t: string) => void;
  onEndEditing?: () => void;
  placeholder?: string;
  maxDecimals: number;
  accessibilityLabel: string;
  editable?: boolean;
};

/** Campo numérico grande de una celda de serie (kg, reps o segundos). */
export function SetCell({ value, onChangeText, onEndEditing, placeholder, maxDecimals, accessibilityLabel, editable = true }: CellProps) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      value={value}
      onChangeText={(t) => onChangeText(sanitizeDecimalInput(t, maxDecimals))}
      onEndEditing={onEndEditing}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      keyboardType={maxDecimals > 0 ? 'decimal-pad' : 'number-pad'}
      inputMode={maxDecimals > 0 ? 'decimal' : 'numeric'}
      selectTextOnFocus
      editable={editable}
      maxFontSizeMultiplier={1.2}
      selectionColor={colors.accent}
      style={[styles.cell, typography.numberField, !editable ? styles.cellDone : null]}
    />
  );
}

export function RestLabel({ seconds, onPress }: { seconds: number | null; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Descanso: ${seconds ? formatDuration(seconds) : 'por defecto'}`} onPress={onPress} style={styles.rest}>
      <AppText variant="caption" color="textSecondary">
        ⏱ Descanso: {seconds ? formatDuration(seconds) : 'por defecto'}
      </AppText>
    </Pressable>
  );
}

export const REST_CHOICES = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300] as const;

const styles = StyleSheet.create({
  badge: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  cell: {
    flex: 1,
    minHeight: 48,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
  },
  cellDone: { backgroundColor: 'transparent' },
  rest: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
