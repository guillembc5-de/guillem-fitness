import type { NativeStackNavigationOptions } from 'expo-router';

import { colors } from './tokens';

/** Cabecera nativa oscura para las pantallas internas de cada pestaña. */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.bg },
};
