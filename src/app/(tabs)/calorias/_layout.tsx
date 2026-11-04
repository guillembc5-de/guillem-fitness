import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/design/stackOptions';

export default function CaloriasLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="historial" options={{ title: 'Historial' }} />
      <Stack.Screen name="dia/[fecha]" options={{ title: 'Día' }} />
      <Stack.Screen name="pendientes" options={{ title: 'Fotos pendientes' }} />
    </Stack>
  );
}
