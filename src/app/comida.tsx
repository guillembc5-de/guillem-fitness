import { router, Stack, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, Icon, Screen, SegmentedControl, colors, radii, spacing } from '@/design';
import { MEAL_TYPES, type MealType } from '@/domain/enums';
import { formatNumber } from '@/domain/format';
import { fromLocalDate, isLocalDate, todayLocalDate, type LocalDate } from '@/domain/localDay';
import { mealTypeForTime, sumTotals } from '@/domain/nutrition';
import type { FoodDraft, MealDraft } from '@/domain/nutritionTypes';
import type { AiProvider } from '@/domain/types';
import { getRepositories } from '@/data/repositories';
import { useProfile } from '@/features/profile/queries';
import { emptyRow, rowFromDraft, rowToDraft, rowTotals, type FoodRow } from '@/features/nutrition/foodDraft';
import { FoodRowEditor } from '@/features/nutrition/FoodRowEditor';
import { MEAL_LABELS } from '@/features/nutrition/labels';
import { preparePhoto, readPhotoBase64 } from '@/features/nutrition/photos';
import { applyMemory, promptHints, type LearnEntry } from '@/domain/foodMemory';
import { useDeleteMeal, useLearnFoods, useRecentFoods, useSaveMeal, useSavePending } from '@/features/nutrition/queries';
import { analyzeFood } from '@/features/nutrition/vision/analyze';
import { getVisionProvider } from '@/features/nutrition/vision/provider';
import { canRetryLater, VisionError, VISION_ERROR_TEXT } from '@/features/nutrition/vision/types';
import { now } from '@/lib/ids';

type Params = {
  mode?: 'photo' | 'manual' | 'edit' | 'pending';
  uri?: string;
  w?: string;
  h?: string;
  date?: string;
  mealType?: string;
  mealId?: string;
  pendingId?: string;
  manual?: string;
};

type Phase =
  | { kind: 'loading'; label: string }
  | { kind: 'review' }
  | { kind: 'no_food' }
  | { kind: 'error'; error: VisionError };

const MEAL_OPTIONS = MEAL_TYPES.map((value) => ({ value, label: MEAL_LABELS[value] }));

function asMealType(value: string | undefined): MealType | null {
  return MEAL_TYPES.find((m) => m === value) ?? null;
}

/**
 * Añadir o editar una comida: por foto (la IA estima), a mano, desde una foto
 * pendiente o editando una ya guardada. Nada se suma al día hasta pulsar Guardar.
 */
export default function MealScreen() {
  const params = useLocalSearchParams<Params>();
  const mode = params.mode ?? 'manual';
  const profile = useProfile();
  const navigation = useNavigation();

  const date: LocalDate = params.date && isLocalDate(params.date) ? params.date : todayLocalDate();
  const isToday = date === todayLocalDate();
  const [mealType, setMealType] = useState<MealType>(() => asMealType(params.mealType) ?? (isToday ? mealTypeForTime(now()) : 'lunch'));
  const [rows, setRows] = useState<FoodRow[]>(() => (mode === 'manual' ? [emptyRow()] : []));
  const [phase, setPhase] = useState<Phase>(() =>
    mode === 'manual' ? { kind: 'review' } : { kind: 'loading', label: mode === 'edit' ? 'Cargando…' : 'Preparando la foto…' },
  );
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<AiProvider | null>(null);
  const [eatenAt, setEatenAt] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [done, setDone] = useState(false);
  const base64 = useRef<string | null>(null);
  const started = useRef(false);

  const saveMeal = useSaveMeal();
  const deleteMeal = useDeleteMeal();
  const savePending = useSavePending();
  const recent = useRecentFoods();
  const learnFoods = useLearnFoods();

  const analyze = async (data: string) => {
    if (!profile.data) return;
    setPhase({ kind: 'loading', label: 'Analizando la foto…' });
    let provider;
    try {
      provider = await getVisionProvider(profile.data);
    } catch (e) {
      setPhase({ kind: 'error', error: e instanceof VisionError ? e : new VisionError('no_key', VISION_ERROR_TEXT.no_key) });
      return;
    }
    // Lo aprendido de tus comidas: contexto para la IA y ajuste de su respuesta.
    const memories = await getRepositories()
      .foodMemory.list()
      .catch(() => []);
    const result = await analyzeFood(provider, data, promptHints(memories) || undefined);
    setAiProvider(profile.data.aiProvider);
    if (result.status === 'ok') {
      setRows(applyMemory(result.items, memories).map((i) => rowFromDraft(i, true, i)));
      setDirty(true);
      setPhase({ kind: 'review' });
    } else if (result.status === 'no_food') {
      setPhase({ kind: 'no_food' });
    } else {
      setPhase({ kind: 'error', error: result.error });
    }
  };

  // Arranque según el modo (una sola vez, cuando el perfil está cargado).
  useEffect(() => {
    if (started.current || !profile.data) return;
    started.current = true;
    void (async () => {
      try {
        if (mode === 'edit' && params.mealId) {
          const meal = await getRepositories().meals.get(params.mealId);
          if (!meal) {
            router.back();
            return;
          }
          setRows(meal.items.map((i) => rowFromDraft(i)));
          setMealType(meal.mealType);
          setPhotoUri(meal.photoUri);
          setAiProvider(meal.aiProvider);
          setEatenAt(meal.eatenAt);
          setPhase({ kind: 'review' });
        } else if (mode === 'photo' && params.uri) {
          const prepared = await preparePhoto({ uri: params.uri, width: Number(params.w) || 0, height: Number(params.h) || 0 });
          base64.current = prepared.base64;
          setPhotoUri(prepared.uri);
          await analyze(prepared.base64);
        } else if (mode === 'pending' && params.pendingId) {
          const pending = await getRepositories().pendingPhotos.get(params.pendingId);
          if (!pending) {
            router.back();
            return;
          }
          setPhotoUri(pending.photoUri);
          setMealType(pending.mealType);
          if (params.manual === '1') {
            setRows([emptyRow()]);
            setPhase({ kind: 'review' });
          } else {
            base64.current = await readPhotoBase64(pending.photoUri);
            await analyze(base64.current);
          }
        }
      } catch (e) {
        setPhase({ kind: 'error', error: new VisionError('invalid_response', e instanceof Error ? e.message : String(e)) });
      }
    })();
    // analyze solo depende del perfil, ya comprobado arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.data]);

  usePreventRemove(dirty && !done, ({ data }) => {
    Alert.alert('¿Descartar la comida?', 'No se guardará nada de lo que has revisado.', [
      { text: 'Seguir revisando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const finish = () => {
    setDone(true);
    setTimeout(() => router.back(), 0);
  };

  const retry = async () => {
    const data = base64.current ?? (photoUri ? await readPhotoBase64(photoUri) : null);
    if (data) {
      base64.current = data;
      await analyze(data);
    }
  };

  const goManual = () => {
    setRows((r) => (r.length > 0 ? r : [emptyRow()]));
    setPhase({ kind: 'review' });
  };

  const saveAsPending = (message: string) => {
    if (!photoUri) return;
    savePending.mutate(
      { input: { photoUri, mealType, localDate: date, capturedAt: now(), lastError: message }, existingId: params.pendingId ?? null },
      { onSuccess: finish },
    );
  };

  const updateRow = (key: string, patch: Partial<FoodRow>) => {
    setFormError(null);
    setDirty(true);
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const onSave = () => {
    const filled = rows.filter((r) => r.name.trim() !== '' || r.grams !== '');
    const drafts = filled.map(rowToDraft);
    if (filled.length === 0) return setFormError('Añade al menos un alimento.');
    if (drafts.some((d) => d === null)) return setFormError('Cada alimento necesita nombre y gramos.');
    const items = drafts.filter((d): d is FoodDraft => d !== null);
    const draft: MealDraft = {
      localDate: date,
      mealType,
      eatenAt: eatenAt ?? (isToday ? now() : fromLocalDate(date).getTime() + 13 * 3_600_000),
      source: photoUri ? 'photo' : 'manual',
      photoUri,
      aiProvider: photoUri ? aiProvider : null,
      items,
    };
    // Lo que guardas enseña a la app: valores por 100 g y cuánto se desvió la IA en la ración.
    const entries: LearnEntry[] = filled.flatMap((row, i) => {
      const item = drafts[i];
      return item ? [{ ...item, aiName: row.aiName, aiGrams: row.aiGrams }] : [];
    });
    saveMeal.mutate(
      { id: mode === 'edit' ? (params.mealId ?? null) : null, draft, pendingId: params.pendingId ?? null },
      {
        onSuccess: () => {
          learnFoods.mutate(entries);
          finish();
        },
      },
    );
  };

  const onDelete = () => {
    if (!params.mealId) return;
    const id = params.mealId;
    Alert.alert('¿Borrar la comida?', 'Dejará de contar en el día.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => deleteMeal.mutate(id, { onSuccess: finish }) },
    ]);
  };

  const total = sumTotals(rows.map(rowTotals));
  const anyAi = rows.some((r) => r.aiEstimated);
  const learnedCount = rows.filter((r) => r.learned.length > 0).length;
  const title = mode === 'edit' ? 'Editar comida' : photoUri || mode === 'photo' ? 'Revisar comida' : 'Añadir comida';

  return (
    <Screen
      edges={[]}
      footer={
        phase.kind === 'review' ? (
          <View style={styles.footer}>
            {formError || saveMeal.isError ? (
              <AppText variant="caption" color="accentText" accessibilityRole="alert">
                {formError ?? `No se pudo guardar: ${saveMeal.error?.message ?? ''}`}
              </AppText>
            ) : null}
            <View style={styles.totalRow}>
              <AppText variant="body" color="textSecondary">
                Total
              </AppText>
              <AppText variant="headline" color="success" style={styles.tabular}>
                +{formatNumber(total.kcal)} kcal
              </AppText>
            </View>
            <Button title={mode === 'edit' ? 'Guardar cambios' : 'Guardar comida'} onPress={onSave} loading={saveMeal.isPending} />
          </View>
        ) : undefined
      }
    >
      <Stack.Screen options={{ title }} />

      {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel="Foto de la comida" /> : null}

      {phase.kind === 'loading' ? (
        <Card style={styles.center}>
          <ActivityIndicator color={colors.textSecondary} size="large" />
          <AppText variant="body" color="textSecondary" accessibilityLiveRegion="polite">
            {phase.label}
          </AppText>
        </Card>
      ) : null}

      {phase.kind === 'no_food' ? (
        <Card style={styles.center}>
          <Icon name="help-circle-outline" size={40} color="textSecondary" />
          <AppText variant="headline" align="center">
            No veo comida en la foto
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            Prueba con otra foto más cerca del plato o añade los alimentos a mano.
          </AppText>
          <Button title="Añadir a mano" onPress={goManual} style={styles.stretch} />
        </Card>
      ) : null}

      {phase.kind === 'error' ? (
        <Card style={styles.center} accessibilityRole="alert">
          <Icon name="cloud-offline-outline" size={40} color="textSecondary" />
          <AppText variant="headline" align="center">
            {VISION_ERROR_TEXT[phase.error.kind]}
          </AppText>
          {phase.error.kind !== 'no_key' ? (
            <AppText variant="caption" color="textTertiary" align="center">
              {phase.error.message}
            </AppText>
          ) : null}
          {canRetryLater(phase.error.kind) || phase.error.kind === 'no_key' || phase.error.kind === 'auth' ? (
            <Button
              title="Guardar como pendiente"
              onPress={() => saveAsPending(VISION_ERROR_TEXT[phase.error.kind])}
              loading={savePending.isPending}
              style={styles.stretch}
              accessibilityHint="La foto queda guardada para analizarla más tarde"
            />
          ) : null}
          {phase.error.kind === 'no_key' || phase.error.kind === 'auth' ? (
            <Button
              title="Configurar la clave"
              variant="secondary"
              onPress={() => {
                setDone(true);
                router.back();
                setTimeout(() => router.push('/perfil/ia'), 350);
              }}
              style={styles.stretch}
            />
          ) : (
            <Button title="Reintentar" variant="secondary" onPress={() => void retry()} style={styles.stretch} />
          )}
          <Button title="Introducir a mano" variant="ghost" onPress={goManual} style={styles.stretch} />
        </Card>
      ) : null}

      {phase.kind === 'review' ? (
        <>
          {anyAi ? (
            <Card style={styles.aiBanner}>
              <Icon name="sparkles-outline" color="warmup" />
              <AppText variant="caption" color="text" style={styles.flex}>
                Estimación de IA: revisa los alimentos y los gramos. Nada cuenta en tu día hasta que pulses Guardar.
              </AppText>
            </Card>
          ) : null}
          {learnedCount > 0 ? (
            <Card style={styles.learnedBanner}>
              <Icon name="school-outline" color="info" />
              <AppText variant="caption" color="text" style={styles.flex}>
                {learnedCount === 1 ? 'He ajustado 1 alimento' : `He ajustado ${learnedCount} alimentos`} con lo que corregiste en comidas anteriores. Cuanto más
                corrijas, más se acercará.
              </AppText>
            </Card>
          ) : null}

          <SegmentedControl accessibilityLabel="Comida del día" options={MEAL_OPTIONS} value={mealType} onChange={setMealType} />

          {rows.map((row) => (
            <FoodRowEditor
              key={row.key}
              row={row}
              onChange={(patch) => updateRow(row.key, patch)}
              onRemove={() => {
                setDirty(true);
                setRows((list) => list.filter((r) => r.key !== row.key));
              }}
            />
          ))}

          <Button
            title="Añadir alimento"
            icon="add"
            variant="secondary"
            onPress={() => {
              setDirty(true);
              setRows((list) => [...list, emptyRow()]);
            }}
          />

          {recent.data && recent.data.length > 0 ? (
            <View style={styles.recent}>
              <AppText variant="caption" color="textSecondary">
                Usados recientemente
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                {recent.data.map((f) => (
                  <Chip
                    key={f.name}
                    label={`+ ${f.name}`}
                    selected={false}
                    onPress={() => {
                      setDirty(true);
                      setRows((list) => [...list.filter((r) => r.name !== '' || r.grams !== ''), rowFromDraft(f)]);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {mode === 'edit' ? <Button title="Borrar comida" variant="danger" onPress={onDelete} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.surface },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  stretch: { alignSelf: 'stretch' },
  aiBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.warmup },
  learnedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.info },
  flex: { flex: 1 },
  recent: { gap: spacing.xs },
  chips: { gap: spacing.xs },
  footer: { gap: spacing.xs },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tabular: { fontVariant: ['tabular-nums'] },
});
