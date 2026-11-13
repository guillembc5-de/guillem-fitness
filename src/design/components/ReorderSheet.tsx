import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { colors, radii, spacing } from '../tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

export type ReorderItem = { key: string; label: string; caption?: string };

type ReorderState = {
  visible: boolean;
  title: string;
  items: ReorderItem[];
  onDone: ((keys: string[]) => void) | null;
  show: (title: string, items: readonly ReorderItem[], onDone: (keys: string[]) => void) => void;
  move: (index: number, delta: -1 | 1) => void;
  hide: () => void;
};

const useReorder = create<ReorderState>((set) => ({
  visible: false,
  title: '',
  items: [],
  onDone: null,
  show: (title, items, onDone) => set({ visible: true, title, items: [...items], onDone }),
  move: (index, delta) =>
    set((st) => {
      const j = index + delta;
      const a = st.items[index];
      const b = st.items[j];
      if (!a || !b) return st;
      const next = [...st.items];
      next[index] = b;
      next[j] = a;
      return { items: next };
    }),
  hide: () => set({ visible: false, onDone: null }),
}));

/** Abre «Reordenar ejercicios»: lista compacta para cambiar el orden de todos a la vez. */
export function showReorderSheet(title: string, items: readonly ReorderItem[], onDone: (keys: string[]) => void): void {
  useReorder.getState().show(title, items, onDone);
}

/** Se monta una vez en el layout raíz. */
export function ReorderSheetHost() {
  const { visible, title, items, onDone, move, hide } = useReorder();
  const insets = useSafeAreaInsets();

  const done = () => {
    onDone?.(items.map((i) => i.key));
    hide();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={hide} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.header}>
            <Button title="Cancelar" variant="ghost" compact onPress={hide} />
            <AppText variant="headline" align="center" style={styles.flex}>
              {title}
            </AppText>
            <Button title="Listo" compact onPress={done} />
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {items.map((item, i) => (
              <View key={item.key} style={styles.row} accessible accessibilityLabel={`${i + 1}. ${item.label}`}>
                <Icon name="reorder-three" color="textTertiary" />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={2}>
                    {item.label}
                  </AppText>
                  {item.caption ? (
                    <AppText variant="caption" color="textSecondary">
                      {item.caption}
                    </AppText>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Subir ${item.label}`}
                  accessibilityState={{ disabled: i === 0 }}
                  disabled={i === 0}
                  onPress={() => move(i, -1)}
                  style={({ pressed }) => [styles.arrow, pressed ? styles.pressed : null]}
                >
                  <Icon name="chevron-up" color={i === 0 ? 'textTertiary' : 'text'} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Bajar ${item.label}`}
                  accessibilityState={{ disabled: i === items.length - 1 }}
                  disabled={i === items.length - 1}
                  onPress={() => move(i, 1)}
                  style={({ pressed }) => [styles.arrow, pressed ? styles.pressed : null]}
                >
                  <Icon name="chevron-down" color={i === items.length - 1 ? 'textTertiary' : 'text'} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.md, gap: spacing.xs },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
