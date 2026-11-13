import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

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
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Galería de platos"
            accessibilityHint="Tus fotos de comida guardadas, para repetirlas"
            onPress={() => router.push('/calorias/galeria')}
            style={styles.iconButton}
          >
            <Icon name="images-outline" size={26} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Historial de días"
            onPress={() => router.push('/calorias/historial')}
            style={styles.iconButton}
          >
            <Icon name="calendar-outline" size={26} />
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
