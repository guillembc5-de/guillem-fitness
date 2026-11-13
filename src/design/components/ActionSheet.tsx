import { useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { colors, radii, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type SheetOption = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  selected?: boolean;
  /** Con icono, el menú se dibuja como lista (estilo Hevy). */
  icon?: IconName;
  /** Se ve en gris y no hace nada (como «Agregar a superserie» sin más ejercicios). */
  disabled?: boolean;
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
  const list = options.some((o) => o.icon);

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
        <View
          style={[styles.sheet, list ? styles.sheetList : null, { paddingBottom: insets.bottom + spacing.sm }]}
          onStartShouldSetResponder={() => true}
        >
          {list ? <View style={styles.grabber} /> : null}
          {title ? (
            <AppText variant="caption" color="textSecondary" align="center" style={styles.title}>
              {title}
            </AppText>
          ) : null}
          {options.map((o, i) => {
            const color = o.disabled ? 'textTertiary' : o.destructive ? 'accentText' : 'text';
            return list ? (
              <Pressable
                key={o.label}
                accessibilityRole="button"
                accessibilityState={{ selected: o.selected === true, disabled: o.disabled === true }}
                disabled={o.disabled}
                onPress={() => run(o.onPress)}
                style={({ pressed }) => [styles.row, i > 0 && !o.destructive ? styles.rowDivider : null, o.destructive ? styles.rowDanger : null, pressed ? styles.pressed : null]}
              >
                {o.icon ? <Icon name={o.icon} size={22} color={color} /> : <View style={styles.iconGap} />}
                <AppText variant="body" color={color} style={styles.flex}>
                  {o.label}
                </AppText>
                {o.selected ? <Icon name="checkmark" size={20} color="info" /> : null}
              </Pressable>
            ) : (
              <Pressable
                key={o.label}
                accessibilityRole="button"
                accessibilityState={{ selected: o.selected === true, disabled: o.disabled === true }}
                disabled={o.disabled}
                onPress={() => run(o.onPress)}
                style={({ pressed }) => [styles.option, pressed ? styles.pressed : null]}
              >
                <AppText variant="bodyStrong" color={color} align="center">
                  {o.selected ? `✓ ${o.label}` : o.label}
                </AppText>
              </Pressable>
            );
          })}
          {list ? null : (
            <Pressable accessibilityRole="button" onPress={hide} style={({ pressed }) => [styles.option, styles.cancel, pressed ? styles.pressed : null]}>
              <AppText variant="bodyStrong" color="textSecondary" align="center">
                Cancelar
              </AppText>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xxs,
  },
  sheetList: { gap: 0, paddingTop: spacing.xs },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.sm },
  title: { paddingVertical: spacing.xs },
  option: { minHeight: 52, justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.surfaceRaised },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowDanger: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: spacing.xxs },
  iconGap: { width: 22 },
  cancel: { marginTop: spacing.xs, backgroundColor: 'transparent' },
  pressed: { opacity: 0.6 },
});
