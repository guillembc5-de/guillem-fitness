import { Linking, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Icon, spacing } from '@/design';

import type { SourceReason } from './decideSource';
import { HEALTH_APP_NAME, openHealthSettings } from './providers/health';
import { useStepsSetup } from './queries';

/** Primera vez: explica para qué se piden los permisos antes de pedirlos. */
export function StepsIntro() {
  const setup = useStepsSetup();
  return (
    <Card style={styles.card}>
      <View style={styles.iconCircle}>
        <Icon name="footsteps" size={32} />
      </View>
      <AppText variant="headline" align="center">
        Para contar tus pasos necesito leerlos de {HEALTH_APP_NAME}
      </AppText>
      <AppText variant="body" color="textSecondary">
        • Solo leo los pasos. No escribo nada ni leo otros datos de salud.
      </AppText>
      <AppText variant="body" color="textSecondary">
        • Con {HEALTH_APP_NAME} tendrás todo tu historial en el calendario.
      </AppText>
      <AppText variant="body" color="textSecondary">
        • También te pediré «Movimiento y forma física», como respaldo si no das acceso a {HEALTH_APP_NAME}.
      </AppText>
      <AppText variant="body" color="textSecondary">
        • Los datos se quedan en este móvil.
      </AppText>
      <Button title={`Permitir acceso a ${HEALTH_APP_NAME}`} onPress={() => setup.mutate('health')} loading={setup.isPending && setup.variables === 'health'} />
      <Button
        title="Usar solo el sensor del móvil"
        variant="ghost"
        onPress={() => setup.mutate('sensor')}
        loading={setup.isPending && setup.variables === 'sensor'}
        accessibilityHint="Sin Salud: solo se recuperan los últimos 7 días"
      />
    </Card>
  );
}

const MESSAGES: Partial<Record<SourceReason, { title: string; body: string }>> = {
  health_denied: {
    title: `Sin acceso a tus pasos de ${HEALTH_APP_NAME}`,
    body: `Estoy usando el sensor del móvil, que solo recuerda 7 días. Para activarlo: abre la app ${HEALTH_APP_NAME} → tu foto (arriba a la derecha) → Apps → Guillem Fitness → activa «Pasos».`,
  },
  health_unavailable: {
    title: `${HEALTH_APP_NAME} no está disponible`,
    body: 'Esta instalación no puede leer Salud (por ejemplo, si se compiló sin HealthKit). Uso el sensor del móvil: solo recupera 7 días, pero la app guarda cada día.',
  },
  no_source: {
    title: 'No puedo contar tus pasos',
    body: 'No hay permiso para Salud ni para «Movimiento y forma física». Actívalo en Ajustes → Guillem Fitness.',
  },
};

/** Aviso claro cuando falta un permiso, con reintentar y acceso a Ajustes. */
export function PermissionBanner({ reason }: { reason: SourceReason }) {
  const setup = useStepsSetup();
  const message = MESSAGES[reason];
  if (!message) return null;
  return (
    <Card style={styles.banner} accessibilityRole="alert">
      <View style={styles.bannerHeader}>
        <Icon name="alert-circle-outline" color="warmup" />
        <AppText variant="bodyStrong" style={styles.flex}>
          {message.title}
        </AppText>
      </View>
      <AppText variant="caption" color="textSecondary">
        {message.body}
      </AppText>
      <View style={styles.row}>
        <Button title="Reintentar" variant="secondary" compact onPress={() => setup.mutate('health')} loading={setup.isPending} style={styles.flex} />
        <Button
          title="Abrir Ajustes"
          variant="secondary"
          compact
          onPress={() => (reason === 'no_source' ? void Linking.openSettings() : openHealthSettings())}
          style={styles.flex}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, alignItems: 'stretch' },
  iconCircle: { alignSelf: 'center', padding: spacing.md },
  banner: { gap: spacing.xs },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
