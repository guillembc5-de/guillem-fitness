import { StyleSheet, Switch, View } from 'react-native';

import { AppText, Card, Chip, Screen, SectionHeader, SegmentedControl, colors, spacing } from '@/design';
import { formatNumber } from '@/domain/format';
import { DEFAULT_PLATES_KG } from '@/domain/plates';
import { useWorkoutSettings } from '@/features/workout/settings';

/** Todos los discos que se pueden marcar como disponibles. */
const ALL_PLATES = [...DEFAULT_PLATES_KG, 0.5].sort((a, b) => b - a);
const BARS = [20, 15, 10];

const PREVIOUS_OPTIONS = [
  { value: 'any' as const, label: 'Cualquier entreno' },
  { value: 'routine' as const, label: 'Misma rutina' },
];

/** Ajustes del registro de entrenos (Perfil → Entreno). */
export default function WorkoutSettingsScreen() {
  const s = useWorkoutSettings();

  const togglePlate = (p: number) => {
    const next = s.plates.includes(p) ? s.plates.filter((x) => x !== p) : [...s.plates, p];
    if (next.length > 0) s.update({ plates: next });
  };

  return (
    <Screen edges={[]}>
      <SectionHeader title="Mientras entrenas" />
      <Card style={styles.card}>
        <Toggle
          title="Pantalla siempre encendida"
          description="No se bloquea el móvil entre series."
          value={s.keepAwake}
          onChange={(keepAwake) => s.update({ keepAwake })}
        />
        <Toggle
          title="Aviso de récord"
          description="Vibra y avisa al batir una marca (1RM, peso, volumen o repeticiones)."
          value={s.prAlerts}
          onChange={(prAlerts) => s.update({ prAlerts })}
        />
        <Toggle
          title="Columna RPE"
          description="Apunta el esfuerzo de cada serie (6–10: cuántas repeticiones te quedaban)."
          value={s.rpe}
          onChange={(rpe) => s.update({ rpe })}
        />
      </Card>

      <SectionHeader title="Columna «Anterior»" />
      <Card style={styles.card}>
        <SegmentedControl accessibilityLabel="De dónde sale «Anterior»" options={PREVIOUS_OPTIONS} value={s.previousFrom} onChange={(previousFrom) => s.update({ previousFrom })} />
        <AppText variant="caption" color="textSecondary">
          {s.previousFrom === 'any'
            ? 'Muestra lo que hiciste la última vez en ese ejercicio, en cualquier entreno.'
            : 'Muestra lo que hiciste la última vez en esa misma rutina (si no hay, la última vez en cualquier entreno).'}
        </AppText>
      </Card>

      <SectionHeader title="Calculadora de discos" />
      <Card style={styles.card}>
        <AppText variant="bodyStrong">Barra por defecto</AppText>
        <View style={styles.chips}>
          {BARS.map((b) => (
            <Chip key={b} label={`${b} kg`} selected={s.barKg === b} onPress={() => s.update({ barKg: b })} />
          ))}
        </View>
        <AppText variant="bodyStrong">Discos de tu gimnasio</AppText>
        <View style={styles.chips}>
          {ALL_PLATES.map((p) => (
            <Chip key={p} label={`${formatNumber(p, { maxDecimals: 2 })} kg`} selected={s.plates.includes(p)} onPress={() => togglePlate(p)} />
          ))}
        </View>
        <AppText variant="caption" color="textSecondary">
          La calculadora y las series de calentamiento usan estos discos y esta barra.
        </AppText>
      </Card>

      <AppText variant="caption" color="textTertiary">
        El descanso por defecto se cambia en Perfil → Datos y objetivos.
      </AppText>
    </Screen>
  );
}

function Toggle({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color="textSecondary">
          {description}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.success, false: colors.surfaceRaised }}
        thumbColor={colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56 },
});
