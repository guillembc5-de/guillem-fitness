import { QueryClientProvider } from '@tanstack/react-query';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { db } from '@/data/db/client';
import { seedDatabase } from '@/data/seed/seed';
import { ActionSheetHost, ErrorState, LoadingState, colors } from '@/design';
import { stackScreenOptions } from '@/design/stackOptions';
import { useProfile } from '@/features/profile/queries';
import { configureNotifications } from '@/features/workout/restTimer';
import { queryClient } from '@/lib/queryClient';

import migrations from '../../drizzle/migrations';

void SplashScreen.preventAutoHideAsync();
configureNotifications();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.text,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={navTheme}>
              <StatusBar style="light" />
              <DatabaseGate />
              <ActionSheetHost />
            </ThemeProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

type DbState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; error: Error };

/** Aplica las migraciones y la carga inicial antes de mostrar nada que lea la base de datos. */
function DatabaseGate() {
  const [state, setState] = useState<DbState>({ status: 'loading' });

  useEffect(() => {
    migrate(db, migrations)
      .then(() => {
        seedDatabase(db);
        setState({ status: 'ready' });
      })
      .catch((e: unknown) => {
        setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) });
        void SplashScreen.hideAsync();
      });
  }, []);

  if (state.status === 'error') {
    return (
      <View style={styles.root}>
        <ErrorState title="No se pudo abrir la base de datos" message={state.error.message} />
      </View>
    );
  }
  if (state.status === 'loading') return null;
  return <AppNavigator />;
}

function AppNavigator() {
  const profile = useProfile();

  useEffect(() => {
    if (!profile.isPending) void SplashScreen.hideAsync();
  }, [profile.isPending]);

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) {
    return (
      <View style={styles.root}>
        <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} />
      </View>
    );
  }

  const onboarded = profile.data?.onboardingCompletedAt != null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entreno-activo" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="rutina-editor" options={{ ...stackScreenOptions, presentation: 'modal', headerShown: true, title: 'Rutina' }} />
        <Stack.Screen
          name="elegir-ejercicio"
          options={{ ...stackScreenOptions, presentation: 'modal', headerShown: true, title: 'Ejercicios' }}
        />
        <Stack.Screen name="ejercicio-editor" options={{ ...stackScreenOptions, presentation: 'modal', headerShown: true, title: 'Ejercicio' }} />
        <Stack.Screen name="resumen-entreno/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="comida" options={{ ...stackScreenOptions, presentation: 'modal', headerShown: true, title: 'Comida' }} />
        <Stack.Screen name="discos" options={{ ...stackScreenOptions, presentation: 'modal', headerShown: true, title: 'Calculadora de discos' }} />
        <Stack.Screen name="editar-entreno/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="salud" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
