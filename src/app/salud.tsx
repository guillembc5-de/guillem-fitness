import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, colors, spacing } from '@/design';
import { formatNumber } from '@/domain/format';
import { parseHealthLink, type HealthLinkDay } from '@/features/steps/healthLink';
import { fitnessKeys } from '@/features/steps/fitnessQueries';
import { stepKeys } from '@/features/steps/queries';
import { importHealthLinkDays } from '@/features/steps/stepsService';

/** «8.432 pasos · 612 kcal activas · 48 min de ejercicio guardados». */
function savedText(day: HealthLinkDay): string {
  const parts = [
    day.steps === undefined ? null : `${formatNumber(day.steps)} pasos`,
    day.activeKcal === undefined ? null : `${formatNumber(day.activeKcal)} kcal activas`,
    day.exerciseMin === undefined ? null : `${formatNumber(day.exerciseMin)} min de ejercicio`,
  ].filter((p): p is string => p !== null);
  return `${parts.join(' · ')} guardados`;
}

type State ={ kind: 'saving' } | { kind: 'done'; text: string } | { kind: 'error'; text: string };

/**
 * Destino del enlace guillemfitness://salud?… que abre el Atajo de Salud.
 * Guarda los pasos, lo confirma un momento y se cierra sola.
 */
export default function HealthLinkScreen() {
  const params = useLocalSearchParams<{ pasos?: string; fecha?: string; dias?: string; energia?: string; ejercicio?: string }>();
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
        void client.invalidateQueries({ queryKey: fitnessKeys.all });
        const last = parsed.days[parsed.days.length - 1];
        setState({ kind: 'done', text: parsed.days.length === 1 && last ? savedText(last) : `${parsed.days.length} días de Salud guardados` });
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
