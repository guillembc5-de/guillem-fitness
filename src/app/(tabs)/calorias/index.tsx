import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/design';
import { todayLocalDate } from '@/domain/localDay';
import { DayView } from '@/features/nutrition/DayView';
import { useNow } from '@/lib/useNow';

export default function CaloriasScreen() {
  // Se refresca cada minuto para cambiar de día a medianoche.
  const today = todayLocalDate(useNow(60_000));
  return (
    <DayView
      date={today}
      title="Calorías"
      showPending
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Historial de días"
          onPress={() => router.push('/calorias/historial')}
          style={styles.iconButton}
        >
          <Icon name="calendar-outline" size={26} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
