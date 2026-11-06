import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, colors, spacing } from '@/design';
import { formatNumber } from '@/domain/format';
import { parseHealthLink } from '@/features/steps/healthLink';
import { stepKeys } from '@/features/steps/queries';
import { importHealthLinkDays } from '@/features/steps/stepsService';

type State = { kind: 'saving' } | { kind: 'done'; text: string } | { kind: 'error'; text: string };

/**
 * Destino del enlace guillemfitness://salud?… que abre el Atajo de Salud.
 * Guarda los pasos, lo confirma un momento y se cierra sola.
 */
export default function HealthLinkScreen() {
  const params = useLocalSearchParams<{ pasos?: string; fecha?: string; dias?: string }>();
  const client = useQueryClient();
  const [parsed] = useState(() => parseHealthLink(params));
  const [state, setState] = useState<State>(() => (parsed.ok ? { kind: 'saving' } : { kind: 'error', text: parsed.error }));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const close = (ms: number) =>
      setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/pasos');
      }, ms);
    if (!parsed.ok) {
      close(3000);
      return;
    }
    void importHealthLinkDays(parsed.days)
      .then(() => {
        void client.invalidateQueries({ queryKey: stepKeys.all });
        void client.invalidateQueries({ queryKey: stepKeys.sync });
        const last = parsed.days[parsed.days.length - 1];
        setState({
          kind: 'done',
          text: parsed.days.length === 1 && last ? `${formatNumber(last.steps)} pasos de Salud guardados` : `${parsed.days.length} días de Salud guardados`,
        });
        close(1200);
      })
      .catch((e: unknown) => {
        setState({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
        close(3000);
      });
  }, [client, parsed]);

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <Card style={styles.card} accessibilityLiveRegion="polite">
        <Icon
          name={state.kind === 'error' ? 'alert-circle-outline' : state.kind === 'done' ? 'checkmark-circle' : 'heart-outline'}
          size={36}
          color={state.kind === 'error' ? 'warmup' : state.kind === 'done' ? 'success' : 'textSecondary'}
        />
        <AppText variant="bodyStrong" align="center">
          {state.kind === 'saving' ? 'Guardando pasos de Salud…' : state.text}
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay, padding: spacing.lg },
  card: { alignItems: 'center', gap: spacing.sm, minWidth: 240 },
});
