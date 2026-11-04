import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Chip, EmptyState, ErrorState, Icon, LoadingState, colors, radii, spacing, typography } from '@/design';
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type MuscleGroup } from '@/domain/enums';
import { matchesSearch } from '@/domain/text';
import type { Exercise } from '@/domain/workoutTypes';

import { EQUIPMENT_LABELS, MUSCLE_LABELS } from './labels';
import { useExercises } from './queries';

type Props = {
  onPressExercise: (exercise: Exercise) => void;
  /** Modo selección: marca los elegidos con un check. */
  selectedIds?: ReadonlySet<string>;
  /** Acción al final de la lista (crear ejercicio propio). */
  onCreate?: (suggestedName: string) => void;
};

export function ExerciseBrowser({ onPressExercise, selectedIds, onCreate }: Props) {
  const exercises = useExercises();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const filtered = useMemo(
    () =>
      (exercises.data ?? []).filter(
        (e) =>
          (muscle === null || e.muscleGroup === muscle) &&
          (equipment === null || e.equipment === equipment) &&
          (query.trim() === '' || matchesSearch(e.searchName, query)),
      ),
    [exercises.data, query, muscle, equipment],
  );

  return (
    <View style={styles.root}>
      <View style={styles.filters}>
        <View style={styles.search}>
          <Icon name="search" size={20} color="textSecondary" />
          <TextInput
            accessibilityLabel="Buscar ejercicio"
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ejercicio"
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.accent}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={[styles.searchInput, typography.body]}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip label="Todos" selected={muscle === null} onPress={() => setMuscle(null)} />
          {MUSCLE_GROUPS.map((m) => (
            <Chip key={m} label={MUSCLE_LABELS[m]} selected={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip label="Cualquier material" selected={equipment === null} onPress={() => setEquipment(null)} />
          {EQUIPMENT.map((eq) => (
            <Chip key={eq} label={EQUIPMENT_LABELS[eq]} selected={equipment === eq} onPress={() => setEquipment(equipment === eq ? null : eq)} />
          ))}
        </ScrollView>
      </View>

      {exercises.isPending ? <LoadingState /> : null}
      {exercises.isError ? <ErrorState message={exercises.error.message} onRetry={() => void exercises.refetch()} /> : null}
      {exercises.isSuccess ? (
        <FlashList
          data={filtered}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          extraData={selectedIds}
          renderItem={({ item }) => {
            const selected = selectedIds?.has(item.id) ?? false;
            return (
              <Pressable
                accessibilityRole={selectedIds ? 'checkbox' : 'button'}
                accessibilityState={selectedIds ? { checked: selected } : undefined}
                accessibilityLabel={`${item.name}. ${MUSCLE_LABELS[item.muscleGroup]}, ${EQUIPMENT_LABELS[item.equipment]}`}
                onPress={() => onPressExercise(item)}
                style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
              >
                <View style={styles.rowTexts}>
                  <AppText variant="body" numberOfLines={2}>
                    {item.name}
                  </AppText>
                  <AppText variant="caption" color="textSecondary">
                    {MUSCLE_LABELS[item.muscleGroup]} · {EQUIPMENT_LABELS[item.equipment]}
                    {item.isCustom ? ' · Propio' : ''}
                  </AppText>
                </View>
                {selectedIds ? (
                  <Icon name={selected ? 'checkmark-circle' : 'ellipse-outline'} color={selected ? 'success' : 'textTertiary'} />
                ) : (
                  <Icon name="chevron-forward" size={18} color="textTertiary" />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyState icon="search" title="Sin resultados" message="Prueba con otra palabra o quita los filtros." />}
          ListFooterComponent={
            onCreate ? (
              <Pressable accessibilityRole="button" onPress={() => onCreate(query.trim())} style={styles.create}>
                <Icon name="add-circle-outline" color="text" />
                <AppText variant="bodyStrong">
                  {query.trim() ? `Crear «${query.trim()}»` : 'Crear ejercicio propio'}
                </AppText>
              </Pressable>
            ) : null
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { gap: spacing.xs, paddingBottom: spacing.xs },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: spacing.sm },
  chips: { gap: spacing.xs, paddingHorizontal: spacing.md },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTexts: { flex: 1, gap: 2 },
  pressed: { backgroundColor: colors.surface },
  create: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
});
