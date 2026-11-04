import { router } from 'expo-router';
import { Alert, Linking } from 'react-native';

import { showActionSheet } from '@/design';
import type { MealType } from '@/domain/enums';
import type { LocalDate } from '@/domain/localDay';

import { pickPhoto } from './photos';

/** Menú «añadir comida»: foto, galería o a mano. */
export function useAddMeal(date: LocalDate) {
  const fromPhoto = async (source: 'camera' | 'library', mealType?: MealType) => {
    const result = await pickPhoto(source);
    if (result.status === 'denied') {
      Alert.alert('Sin acceso a la cámara', 'Permite el acceso a la cámara en Ajustes para fotografiar tu comida, o añádela a mano.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    if (result.status !== 'ok') return;
    router.push({
      pathname: '/comida',
      params: { mode: 'photo', uri: result.uri, w: String(result.width), h: String(result.height), date, ...(mealType ? { mealType } : {}) },
    });
  };

  const manual = (mealType?: MealType) =>
    router.push({ pathname: '/comida', params: { mode: 'manual', date, ...(mealType ? { mealType } : {}) } });

  const open = (mealType?: MealType) =>
    showActionSheet('Añadir comida', [
      { label: 'Hacer foto', onPress: () => void fromPhoto('camera', mealType) },
      { label: 'Elegir de la galería', onPress: () => void fromPhoto('library', mealType) },
      { label: 'Añadir a mano', onPress: () => manual(mealType) },
    ]);

  return { open };
}
