import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { sanitizeDecimalInput } from '@/domain/parseNumber';

import { colors, radii, spacing, typography } from '../tokens';
import { AppText } from './AppText';

type BaseProps = {
  label: string;
  /** Texto de ayuda o error bajo el campo. */
  hint?: string;
  error?: string;
};

type NumberFieldProps = BaseProps & {
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  /** Máximo de decimales. 0 → teclado sin coma. */
  maxDecimals?: number;
  placeholder?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
};

/**
 * Campo numérico con teclado decimal. Acepta coma y punto («62,5» o «62.5»)
 * y no deja escribir más de un separador ni más decimales de los permitidos.
 */
export function NumberField({
  label,
  hint,
  error,
  value,
  onChangeText,
  unit,
  maxDecimals = 1,
  placeholder,
  returnKeyType = 'done',
  onSubmitEditing,
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <View style={[styles.box, focused ? styles.boxFocused : null, error ? styles.boxError : null]}>
        <TextInput
          accessibilityLabel={unit ? `${label} en ${unit}` : label}
          value={value}
          onChangeText={(t) => onChangeText(sanitizeDecimalInput(t, maxDecimals))}
          keyboardType={maxDecimals > 0 ? 'decimal-pad' : 'number-pad'}
          inputMode={maxDecimals > 0 ? 'decimal' : 'numeric'}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, typography.numberField]}
          maxFontSizeMultiplier={1.3}
        />
        {unit ? (
          <AppText variant="body" color="textSecondary">
            {unit}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="accentText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textTertiary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

type TextFieldProps = BaseProps &
  Pick<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'secureTextEntry' | 'autoCapitalize' | 'autoCorrect' | 'returnKeyType' | 'onSubmitEditing'>;

export function TextField({ label, hint, error, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <View style={[styles.box, focused ? styles.boxFocused : null, error ? styles.boxError : null]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, typography.body]}
          {...inputProps}
        />
      </View>
      {error ? (
        <AppText variant="caption" color="accentText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textTertiary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  box: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  boxFocused: { borderColor: colors.textSecondary },
  boxError: { borderColor: colors.accent },
  input: { flex: 1, color: colors.text, paddingVertical: spacing.sm },
});
