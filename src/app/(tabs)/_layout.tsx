import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ComponentProps } from 'react';
import { AppState } from 'react-native';

import { getRepositories } from '@/data/repositories';
import { colors } from '@/design';
import { stepKeys, useStepsSync } from '@/features/steps/queries';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={26} color={focused ? colors.text : colors.textSecondary} />;
  };
}

/** Solo una vez por arranque de la app. */
let resumeChecked = false;

export default function TabsLayout() {
  // Si la app se cerró con un entreno a medias, al abrirla vuelves a él.
  useEffect(() => {
    if (resumeChecked) return;
    resumeChecked = true;
    void getRepositories()
      .workouts.getActive()
      .then((active) => {
        if (active) router.push('/entreno-activo');
      });
  }, []);

  // Guarda los pasos al abrir la app y cada vez que vuelve a primer plano,
  // estés en la pestaña que estés: el sensor del iPhone solo recuerda 7 días.
  const client = useQueryClient();
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.invalidateQueries({ queryKey: stepKeys.sync });
    });
    return () => sub.remove();
  }, [client]);
  useStepsSync(true);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="entreno" options={{ title: 'Entreno', tabBarIcon: tabIcon('barbell', 'barbell-outline') }} />
      <Tabs.Screen name="pasos" options={{ title: 'Pasos', tabBarIcon: tabIcon('footsteps', 'footsteps-outline') }} />
      <Tabs.Screen name="calorias" options={{ title: 'Calorías', tabBarIcon: tabIcon('flame', 'flame-outline') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: tabIcon('person', 'person-outline') }} />
    </Tabs>
  );
}
