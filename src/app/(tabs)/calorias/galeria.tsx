import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, EmptyState, ErrorState, LoadingState, SegmentedControl, TextField, colors, radii, spacing } from '@/design';
import { dishMatchesSearch, dishTitle, type GalleryDish } from '@/domain/dishGallery';
import { formatNumber } from '@/domain/format';
import { resolvePhotoUri } from '@/features/nutrition/photos';
import { useDishGallery } from '@/features/nutrition/queries';
import { formatLongDay } from '@/features/steps/labels';

type Order = 'recent' | 'used';

const ORDER_OPTIONS: { value: Order; label: string }[] = [
  { value: 'recent', label: 'Recientes' },
  { value: 'used', label: 'Más repetidos' },
];

const COLUMNS = 3;
const GAP = spacing.xs;

/**
 * Galería de platos: todas las fotos de comida que has guardado, con los
 * valores que confirmaste. Toca una para repetirla o corregirla.
 */
export default function DishGalleryScreen() {
  // Si se abre desde «Añadir comida», el plato elegido irá a ese día y esa comida.
  const params = useLocalSearchParams<{ date?: string; mealType?: string }>();
  const gallery = useDishGallery();
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<Order>('recent');
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - spacing.md * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const dishes = useMemo(() => {
    const list = (gallery.data ?? []).filter((d) => dishMatchesSearch(d, query));
    return order === 'used' ? [...list].sort((a, b) => b.timesUsed - a.timesUsed || b.lastUsedAt - a.lastUsedAt) : list;
  }, [gallery.data, query, order]);

  if (gallery.isPending) return <LoadingState />;
  if (gallery.isError) return <ErrorState message={gallery.error.message} onRetry={() => void gallery.refetch()} />;
  if ((gallery.data ?? []).length === 0) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon="images-outline"
          title="Aún no hay platos"
          message="Cada comida que guardes con foto aparecerá aquí, con los valores que confirmaste, para repetirla con un toque."
        />
      </View>
    );
  }

  const open = (dish: GalleryDish) =>
    router.push({
      pathname: '/calorias/plato/[id]',
      params: { id: dish.latest.id, ...(params.date ? { date: params.date } : {}), ...(params.mealType ? { mealType: params.mealType } : {}) },
    });

  return (
    <View style={styles.root}>
      <FlatList
        data={dishes}
        keyExtractor={(d) => d.key}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.rowGap}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <TextField label="Buscar por alimento" value={query} onChangeText={setQuery} placeholder="arroz, pollo…" autoCapitalize="none" autoCorrect={false} />
            <SegmentedControl accessibilityLabel="Orden" options={ORDER_OPTIONS} value={order} onChange={setOrder} />
            <AppText variant="caption" color="textSecondary">
              {dishes.length === 1 ? '1 plato' : `${dishes.length} platos`} · toca uno para repetirlo o corregirlo
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <AppText variant="body" color="textSecondary" align="center" style={styles.noResults}>
            Ningún plato con «{query.trim()}».
          </AppText>
        }
        renderItem={({ item }) => <DishTile dish={item} size={tile} onPress={() => open(item)} />}
      />
    </View>
  );
}

function DishTile({ dish, size, onPress }: { dish: GalleryDish; size: number; onPress: () => void }) {
  const kcal = formatNumber(dish.totals.kcal);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dishTitle(dish.latest)}, ${kcal} kilocalorías, ${formatLongDay(dish.latest.localDate)}${dish.timesUsed > 1 ? `, guardado ${dish.timesUsed} veces` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size }, styles.tile, pressed ? styles.pressed : null]}
    >
      <Image source={{ uri: resolvePhotoUri(dish.photoUri) }} style={styles.image} />
      {dish.timesUsed > 1 ? (
        <View style={styles.badge}>
          <AppText variant="caption" color="text" style={styles.badgeText}>
            ×{dish.timesUsed}
          </AppText>
        </View>
      ) : null}
      <View style={styles.kcal}>
        <AppText variant="caption" color="text" style={styles.badgeText} numberOfLines={1}>
          {kcal} kcal
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: GAP },
  rowGap: { gap: GAP },
  header: { gap: spacing.sm, paddingBottom: spacing.sm },
  noResults: { paddingVertical: spacing.lg },
  tile: { borderRadius: radii.sm, overflow: 'hidden', backgroundColor: colors.surface },
  image: { width: '100%', height: '100%' },
  pressed: { opacity: 0.7 },
  badge: { position: 'absolute', top: spacing.xxs, right: spacing.xxs, paddingHorizontal: spacing.xs, borderRadius: radii.sm, backgroundColor: colors.overlay },
  kcal: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xs, paddingVertical: 2, backgroundColor: colors.overlay },
  badgeText: { fontVariant: ['tabular-nums'] },
});
