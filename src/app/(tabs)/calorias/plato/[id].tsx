import { router, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Divider, EmptyState, ErrorState, LoadingState, Screen, colors, radii, spacing } from '@/design';
import { dishTitle, photoFileName } from '@/domain/dishGallery';
import { formatNumber } from '@/domain/format';
import { isLocalDate, todayLocalDate } from '@/domain/localDay';
import { itemTotals, sumTotals } from '@/domain/nutrition';
import { MEAL_LABELS } from '@/features/nutrition/labels';
import { resolvePhotoUri } from '@/features/nutrition/photos';
import { useDishGallery, useMeal } from '@/features/nutrition/queries';
import { formatLongDay } from '@/features/steps/labels';

const g = (value: number) => formatNumber(value, { maxDecimals: 1 });

/** Un plato de la galería: su foto, sus valores confirmados y qué hacer con él. */
export default function DishScreen() {
  const params = useLocalSearchParams<{ id: string; date?: string; mealType?: string }>();
  const meal = useMeal(params.id ?? null);
  const gallery = useDishGallery();

  if (meal.isPending) return <LoadingState />;
  if (meal.isError) return <ErrorState message={meal.error.message} onRetry={() => void meal.refetch()} />;
  const dish = meal.data;
  if (!dish) {
    return (
      <View style={styles.gone}>
        <EmptyState icon="images-outline" title="Este plato ya no existe" message="La comida se borró." actionLabel="Volver" onAction={() => router.back()} />
      </View>
    );
  }

  const totals = sumTotals(dish.items.map(itemTotals));
  const timesUsed = dish.photoUri ? (gallery.data?.find((d) => d.key === photoFileName(dish.photoUri ?? ''))?.timesUsed ?? 1) : 1;
  const day = formatLongDay(dish.localDate);
  const today = todayLocalDate();
  const date = params.date && isLocalDate(params.date) ? params.date : today;

  const reuse = () =>
    router.push({ pathname: '/comida', params: { mode: 'reuse', mealId: dish.id, date, ...(params.mealType ? { mealType: params.mealType } : {}) } });
  const edit = () => router.push({ pathname: '/comida', params: { mode: 'edit', mealId: dish.id, date: dish.localDate } });

  return (
    <Screen
      edges={[]}
      footer={
        <View style={styles.footer}>
          <Button
            title={date === today ? 'Añadir a hoy' : `Añadir al ${formatLongDay(date)}`}
            icon="add"
            onPress={reuse}
            accessibilityHint="Abre el plato para revisar los gramos antes de guardarlo"
          />
          <Button title="Corregir valores" variant="secondary" onPress={edit} accessibilityHint="Edita esta comida; la app aprende de la corrección" />
        </View>
      }
    >
      {dish.photoUri ? <Image source={{ uri: resolvePhotoUri(dish.photoUri) }} style={styles.photo} accessibilityLabel="Foto del plato" /> : null}

      <View style={styles.titleBlock}>
        <AppText variant="headline">{dishTitle(dish, 4)}</AppText>
        <AppText variant="caption" color="textSecondary">
          {day.charAt(0).toUpperCase() + day.slice(1)} · {MEAL_LABELS[dish.mealType]}
          {timesUsed > 1 ? ` · guardado ${timesUsed} veces` : ''}
        </AppText>
      </View>

      <Card style={styles.totals}>
        <Total label="Calorías" value={formatNumber(totals.kcal)} unit="kcal" />
        <Total label="Proteína" value={g(totals.protein)} unit="g" />
        <Total label="Hidratos" value={g(totals.carbs)} unit="g" />
        <Total label="Grasa" value={g(totals.fat)} unit="g" />
      </Card>

      <Card padded={false}>
        {dish.items.map((item, i) => {
          const t = itemTotals(item);
          return (
            <View key={item.id}>
              {i > 0 ? <Divider /> : null}
              <View
                style={styles.item}
                accessible
                accessibilityLabel={`${item.name}, ${formatNumber(item.grams)} gramos, ${formatNumber(t.kcal)} kilocalorías, proteína ${g(t.protein)}, hidratos ${g(t.carbs)}, grasa ${g(t.fat)} gramos`}
              >
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{item.name}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {formatNumber(item.grams)} g · P {g(t.protein)} · H {g(t.carbs)} · G {g(t.fat)} g
                  </AppText>
                </View>
                <AppText variant="number" color="textSecondary">
                  {formatNumber(t.kcal)} kcal
                </AppText>
              </View>
            </View>
          );
        })}
      </Card>

      <AppText variant="caption" color="textTertiary">
        Son los valores que tú confirmaste. Si los corriges, la app lo aprende: la próxima foto con estos alimentos saldrá con tus valores, y este plato se
        te propondrá cuando la IA vea algo parecido.
      </AppText>
    </Screen>
  );
}

function Total({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.total} accessible accessibilityLabel={`${label}: ${value} ${unit}`}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="headline" style={styles.tabular}>
        {value}
      </AppText>
      <AppText variant="caption" color="textTertiary">
        {unit}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gone: { flex: 1, backgroundColor: colors.bg },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.surface },
  titleBlock: { gap: spacing.xxs },
  totals: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { alignItems: 'center', flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 56 },
  footer: { gap: spacing.xs },
});
