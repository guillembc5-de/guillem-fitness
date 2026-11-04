import { Stack, useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/design';
import { isLocalDate } from '@/domain/localDay';
import { DayView } from '@/features/nutrition/DayView';
import { formatLongDay } from '@/features/steps/labels';

export default function CaloriesDayScreen() {
  const { fecha } = useLocalSearchParams<{ fecha: string }>();
  if (!isLocalDate(fecha)) return <ErrorState message="Fecha no válida." />;
  const title = formatLongDay(fecha);
  return (
    <>
      <Stack.Screen options={{ title: title.charAt(0).toUpperCase() + title.slice(1) }} />
      <DayView date={fecha} />
    </>
  );
}
