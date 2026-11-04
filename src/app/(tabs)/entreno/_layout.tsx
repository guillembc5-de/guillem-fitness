import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/design/stackOptions';

export default function EntrenoLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="rutina/[id]" options={{ title: 'Rutina' }} />
      <Stack.Screen name="historial/index" options={{ title: 'Historial' }} />
      <Stack.Screen name="historial/[id]" options={{ title: 'Entreno' }} />
      <Stack.Screen name="ejercicios/index" options={{ title: 'Ejercicios' }} />
      <Stack.Screen name="ejercicios/[id]" options={{ title: 'Ejercicio' }} />
    </Stack>
  );
}
