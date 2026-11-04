import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/design/stackOptions';

export default function PerfilLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="datos" options={{ title: 'Datos y objetivos' }} />
      <Stack.Screen name="ia" options={{ title: 'Análisis de fotos' }} />
      <Stack.Screen name="datos-app" options={{ title: 'Tus datos' }} />
    </Stack>
  );
}
