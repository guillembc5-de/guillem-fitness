import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '../tokens';
import { AppText } from './AppText';

type Props = {
  /** Título grande al estilo iOS. Omitir si la pantalla tiene cabecera nativa. */
  title?: string;
  /** Acción a la derecha del título (por ejemplo, un botón). */
  headerRight?: ReactNode;
  children: ReactNode;
  /** Envuelve el contenido en un scroll que evita que el teclado tape los campos. */
  scroll?: boolean;
  /** Zona fija al pie (botón principal). */
  footer?: ReactNode;
  edges?: readonly Edge[];
};

export function Screen({ title, headerRight, children, scroll = true, footer, edges = ['top'] }: Props) {
  const header = title ? (
    <View style={styles.header}>
      <AppText variant="title" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      {headerRight}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bottomOffset={spacing.lg}
          showsVerticalScrollIndicator={false}
        >
          {header}
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>
          {header}
          {children}
        </View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    minHeight: 52,
  },
  title: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
