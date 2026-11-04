import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/design/stackOptions';

export default function PasosLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
