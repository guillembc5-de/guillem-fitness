import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, SectionHeader, spacing } from '@/design';
import { formatLongDay } from '@/features/steps/labels';
import { getLastHealthLink } from '@/features/steps/prefs';

const URL_TEXT = 'guillemfitness://salud?fecha=[Fecha formateada]&pasos=[Valor]';

/**
 * Instrucciones para traer los pasos de la app Salud con un Atajo. Funciona
 * aunque la instalación gratuita no tenga el permiso de HealthKit.
 */
export default function HealthShortcutScreen() {
  const [last] = useState(getLastHealthLink);

  return (
    <Screen edges={[]}>
      <AppText variant="body" color="textSecondary">
        Con un Apple ID gratuito, Apple a veces no deja que la app lea Salud directamente. Un Atajo del iPhone sí puede: lee tus pasos en Salud
        y se los pasa a la app. Cuentan también los del Apple Watch.
      </AppText>

      <Card style={styles.card}>
        <AppText variant="overline" color="textSecondary">
          Estado
        </AppText>
        <AppText variant="bodyStrong">
          {last
            ? `Últimos pasos recibidos: ${last.lastDate ? formatLongDay(last.lastDate) : 'hoy'} (${new Date(last.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`
            : 'Aún no ha llegado nada desde Atajos.'}
        </AppText>
      </Card>

      <SectionHeader title="1 · Crear el atajo" />
      <Card style={styles.card}>
        <Step n={1}>Abre la app Atajos → pestaña Atajos → «+». Llámalo «Pasos a GF».</Step>
        <Step n={2}>
          Añade la acción «Buscar muestras de Salud»: tipo Pasos, fecha de inicio «es hoy», y en Agrupar por elige «Día». (Así Salud no cuenta dos
          veces los pasos del iPhone y del reloj).
        </Step>
        <Step n={3}>Añade «Obtener detalles de muestras de Salud» y elige «Valor».</Step>
        <Step n={4}>Añade «Fecha actual» y después «Dar formato a la fecha»: formato Personalizado, escribe yyyy-MM-dd.</Step>
        <Step n={5}>Añade la acción «URL» y escribe (las variables, tocando sobre ellas):</Step>
        <AppText variant="caption" color="text" selectable style={styles.code}>
          {URL_TEXT}
        </AppText>
        <Step n={6}>Añade «Abrir URL». Pruébalo con ▶︎: se abrirá la app y dirá cuántos pasos ha guardado.</Step>
      </Card>

      <SectionHeader title="2 · Que se haga solo" />
      <Card style={styles.card}>
        <Step n={1}>En Atajos → pestaña Automatización → «+» → App.</Step>
        <Step n={2}>Elige Guillem Fitness, marca «Se abre» y «Ejecutar inmediatamente».</Step>
        <Step n={3}>Elige el atajo «Pasos a GF». Desde ahora, cada vez que abras la app, traerá tus pasos de hoy de Salud.</Step>
      </Card>

      <AppText variant="caption" color="textTertiary">
        Si un día no abres la app, esos pasos los recupera el sensor del iPhone (guarda 7 días). Si Salud y el sensor tienen cifras distintas, se queda la
        mayor; nunca se suman.
      </AppText>
      <View style={styles.row}>
        <Button title="Abrir Atajos" variant="secondary" onPress={() => void Linking.openURL('shortcuts://')} style={styles.flex} />
      </View>
    </Screen>
  );
}

function Step({ n, children }: { n: number; children: string }) {
  return (
    <View style={styles.step}>
      <AppText variant="bodyStrong" style={styles.n}>
        {n}.
      </AppText>
      <AppText variant="body" style={styles.flex}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.xs },
  n: { width: 22 },
  code: { fontFamily: 'Menlo', padding: spacing.sm },
  row: { flexDirection: 'row' },
});
