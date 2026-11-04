import { useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { colors, radii, spacing } from '../tokens';
import { AppText } from './AppText';

export type SheetOption = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  selected?: boolean;
};

type SheetState = {
  title: string | null;
  options: SheetOption[];
  visible: boolean;
  show: (title: string | null, options: SheetOption[]) => void;
  hide: () => void;
};

const useSheet = create<SheetState>((set) => ({
  title: null,
  options: [],
  visible: false,
  show: (title, options) => set({ title, options, visible: true }),
  hide: () => set({ visible: false }),
}));

/** Abre una hoja de acciones (menú «⋯») igual en iPhone y Android. */
export function showActionSheet(title: string | null, options: SheetOption[]): void {
  useSheet.getState().show(title, options);
}

/** Se monta una vez en el layout raíz. */
export function ActionSheetHost() {
  const { title, options, visible, hide } = useSheet();
  const insets = useSafeAreaInsets();
  const pending = useRef<(() => void) | null>(null);

  // En iOS no se puede abrir otra pantalla modal mientras esta se cierra:
  // la acción elegida se ejecuta cuando el menú ha terminado de cerrarse.
  const run = (action: () => void) => {
    hide();
    if (Platform.OS === 'ios') pending.current = action;
    else action();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={hide}
      statusBarTranslucent
      onDismiss={() => {
        const action = pending.current;
        pending.current = null;
        action?.();
      }}
    >
      <Pressable style={styles.backdrop} onPress={hide} accessibilityLabel="Cerrar menú" accessibilityRole="button">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]} onStartShouldSetResponder={() => true}>
          {title ? (
            <AppText variant="caption" color="textSecondary" align="center" style={styles.title}>
              {title}
            </AppText>
          ) : null}
          {options.map((o) => (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              accessibilityState={{ selected: o.selected === true }}
              onPress={() => run(o.onPress)}
              style={({ pressed }) => [styles.option, pressed ? styles.pressed : null]}
            >
              <AppText variant="bodyStrong" color={o.destructive ? 'accentText' : 'text'} align="center">
                {o.selected ? `✓ ${o.label}` : o.label}
              </AppText>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={hide} style={({ pressed }) => [styles.option, styles.cancel, pressed ? styles.pressed : null]}>
            <AppText variant="bodyStrong" color="textSecondary" align="center">
              Cancelar
            </AppText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xxs,
  },
  title: { paddingVertical: spacing.xs },
  option: { minHeight: 52, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceRaised },
  cancel: { marginTop: spacing.xs, backgroundColor: 'transparent' },
  pressed: { opacity: 0.6 },
});
