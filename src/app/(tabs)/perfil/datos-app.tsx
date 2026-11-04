import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, SectionHeader, Screen, spacing } from '@/design';
import { getRepositories } from '@/data/repositories';
import { formatNumber } from '@/domain/format';
import { exportToFile, importFromFile } from '@/features/profile/dataTransfer';

/** Exportar/importar todos los datos y datos de prueba. */
export default function AppDataScreen() {
  const client = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'accentText'; text: string } | null>(null);

  const demo = useQuery({ queryKey: ['demoCounts'], queryFn: () => getRepositories().data.countDemo() });
  const refreshAll = () => client.invalidateQueries();

  const exportMutation = useMutation({
    mutationFn: exportToFile,
    onError: (e) => setMessage({ tone: 'accentText', text: `No se pudo exportar: ${e.message}` }),
  });

  const importMutation = useMutation({
    mutationFn: importFromFile,
    onSuccess: (result) => {
      if (!result) return;
      void refreshAll();
      setMessage({
        tone: 'success',
        text: `Importado: ${formatNumber(result.inserted)} nuevos, ${formatNumber(result.updated)} actualizados, ${formatNumber(result.skipped)} ya estaban al día.`,
      });
    },
    onError: (e) => setMessage({ tone: 'accentText', text: `No se importó nada. ${e.message}` }),
  });

  const generate = useMutation({
    mutationFn: () => getRepositories().data.generateDemo(setProgress),
    onSuccess: (c) => {
      setProgress(null);
      void refreshAll();
      setMessage({
        tone: 'success',
        text: `Generados ${formatNumber(c.workouts)} entrenos, ${formatNumber(c.stepDays)} días de pasos y ${formatNumber(c.meals)} comidas.`,
      });
    },
    onError: (e) => {
      setProgress(null);
      setMessage({ tone: 'accentText', text: `No se pudieron generar: ${e.message}` });
    },
  });

  const clear = useMutation({
    mutationFn: () => getRepositories().data.clearDemo(),
    onSuccess: () => {
      void refreshAll();
      setMessage({ tone: 'success', text: 'Datos de prueba borrados. Tus datos reales siguen intactos.' });
    },
  });

  const counts = demo.data;
  const hasDemo = counts !== undefined && counts.workouts + counts.stepDays + counts.meals > 0;
  const busy = generate.isPending || clear.isPending || importMutation.isPending;

  return (
    <Screen edges={[]}>
      {message ? (
        <Card>
          <AppText variant="body" color={message.tone} accessibilityLiveRegion="polite">
            {message.text}
          </AppText>
        </Card>
      ) : null}

      <SectionHeader title="Copia de seguridad" />
      <Card style={styles.card}>
        <AppText variant="body" color="textSecondary">
          Guarda todos tus datos en un archivo JSON para no perderlos si cambias de móvil o si la app caduca. Las fotos de comida no se incluyen.
        </AppText>
        <Button title="Exportar copia (JSON)" icon="share-outline" onPress={() => exportMutation.mutate()} loading={exportMutation.isPending} disabled={busy} />
        <Button
          title="Importar copia"
          icon="download-outline"
          variant="secondary"
          onPress={() =>
            Alert.alert('¿Importar una copia?', 'Se fusiona con lo que tienes: si un dato está en los dos sitios, gana el cambio más reciente. No se borra nada.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Elegir archivo', onPress: () => importMutation.mutate() },
            ])
          }
          loading={importMutation.isPending}
          disabled={busy}
        />
      </Card>

      <SectionHeader title="Datos de prueba" />
      <Card style={styles.card}>
        <AppText variant="body" color="textSecondary">
          Genera 2 años de entrenos, pasos y comidas para ver cómo van las gráficas y listas con mucho historial. Se marcan como prueba y se borran
          de golpe sin tocar tus datos.
        </AppText>
        {hasDemo ? (
          <AppText variant="caption" color="textSecondary">
            Ahora hay {formatNumber(counts.workouts)} entrenos, {formatNumber(counts.stepDays)} días de pasos y {formatNumber(counts.meals)} comidas de
            prueba.
          </AppText>
        ) : null}
        {progress !== null ? (
          <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
            <AppText variant="caption" color="textSecondary">
              Generando… {Math.round(progress * 100)} %
            </AppText>
          </View>
        ) : null}
        <Button
          title="Generar datos de prueba"
          variant="secondary"
          onPress={() =>
            Alert.alert('¿Generar 2 años de datos de prueba?', 'Tardará unos segundos. Podrás borrarlos después sin tocar tus datos reales.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Generar', onPress: () => generate.mutate() },
            ])
          }
          loading={generate.isPending}
          disabled={busy || hasDemo}
        />
        <Button
          title="Borrar datos de prueba"
          variant="danger"
          onPress={() =>
            Alert.alert('¿Borrar los datos de prueba?', 'Solo se borran los datos generados como prueba.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Borrar', style: 'destructive', onPress: () => clear.mutate() },
            ])
          }
          loading={clear.isPending}
          disabled={busy || !hasDemo}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  progress: { paddingVertical: spacing.xs },
});
