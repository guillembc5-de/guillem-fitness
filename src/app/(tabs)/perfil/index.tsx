import Constants from 'expo-constants';
import { router } from 'expo-router';

import { AppText, Card, ErrorState, ListRow, LoadingState, Screen, SectionHeader } from '@/design';
import { formatDuration, formatNumber, formatWeight } from '@/domain/format';
import { TargetSummary } from '@/features/profile/components';
import { AI_PROVIDER_LABELS, GOAL_LABELS, SEX_LABELS } from '@/features/profile/labels';
import { targetsForProfile, useApiKeyStatus, useProfile } from '@/features/profile/queries';

export default function PerfilScreen() {
  const profile = useProfile();
  const p = profile.data;
  const keyStatus = useApiKeyStatus(p?.aiProvider ?? 'gemini');

  if (profile.isPending) return <LoadingState />;
  if (!p) return <ErrorState message="No se encontró tu perfil." onRetry={() => void profile.refetch()} />;

  const targets = targetsForProfile(p);
  const rate = p.goal === 'maintain' ? '' : ` · ${formatNumber(p.goalRateKgWeek, { maxDecimals: 2 })} kg/sem`;

  return (
    <Screen title="Perfil">
      <TargetSummary target={targets} weightKg={p.weightKg} activityLevel={p.activityLevel} />

      <SectionHeader title="Tus datos" />
      <Card padded={false}>
        <ListRow
          icon="person-outline"
          title="Datos y objetivos"
          subtitle={`${SEX_LABELS[p.sex]} · ${targets.age} años · ${formatNumber(p.heightCm)} cm · ${formatWeight(p.weightKg, p.weightUnit)}`}
          onPress={() => router.push('/perfil/datos')}
          divider
        />
        <ListRow icon="flag-outline" title="Objetivo" value={`${GOAL_LABELS[p.goal]}${rate}`} onPress={() => router.push('/perfil/datos')} divider />
        <ListRow icon="footsteps-outline" title="Pasos al día" value={formatNumber(p.stepGoal)} onPress={() => router.push('/perfil/datos')} divider />
        <ListRow icon="timer-outline" title="Descanso por defecto" value={formatDuration(p.defaultRestSeconds)} onPress={() => router.push('/perfil/datos')} />
      </Card>

      <SectionHeader title="Inteligencia artificial" />
      <Card padded={false}>
        <ListRow
          icon="camera-outline"
          title="Análisis de fotos"
          subtitle={keyStatus.data ? `Clave guardada ${keyStatus.data}` : 'Falta la clave de la API'}
          value={AI_PROVIDER_LABELS[p.aiProvider]}
          onPress={() => router.push('/perfil/ia')}
        />
      </Card>

      <SectionHeader title="Datos de la app" />
      <Card padded={false}>
        <ListRow
          icon="cloud-download-outline"
          title="Copia de seguridad y datos de prueba"
          subtitle="Exportar o importar en JSON · generar o borrar 2 años de prueba"
          onPress={() => router.push('/perfil/datos-app')}
        />
      </Card>

      <SectionHeader title="Acerca de" />
      <Card>
        <AppText variant="body" color="textSecondary">
          Guillem Fitness {Constants.expoConfig?.version ?? ''}. Tus datos se guardan solo en este móvil: sin cuentas, sin nube y sin
          anuncios.
        </AppText>
      </Card>
    </Screen>
  );
}
