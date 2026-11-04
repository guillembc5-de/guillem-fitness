import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/design';
import { ExerciseBrowser } from '@/features/workout/ExerciseBrowser';

export default function ExerciseLibraryScreen() {
  return (
    <View style={styles.root}>
      <ExerciseBrowser
        onPressExercise={(e) => router.push({ pathname: '/entreno/ejercicios/[id]', params: { id: e.id } })}
        onCreate={(name) => router.push({ pathname: '/ejercicio-editor', params: { name } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xs },
});
