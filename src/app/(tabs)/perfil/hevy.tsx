import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, Card, Icon, Screen, SectionHeader, TextField, colors, spacing } from '@/design';
import { formatNumber } from '@/domain/format';
import type { HevyImportResult, HevyPreview } from '@/features/workout/hevyImport';
import { getLastSync, getUpdateRoutines, importHevyPreview, pickHevyFile, setUpdateRoutines, syncHevyApi } from '@/features/workout/hevySync';
import { getHevyKey, maskKey, setHevyKey } from '@/lib/secrets';

const day = (ms: number) => format(ms, 'd MMM yyyy', { locale: es });
const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/**
 * Traer los entrenos de Hevy a la app, igual que están allí: series, kilos,
 * repeticiones, tipo de serie, RPE, notas, superseries y cardio. Cuentan en
 * Calorías, en el historial y en los récords.
 */
export default function HevyScreen() {
  const client = useQueryClient();
  const [preview, setPreview] = useState<HevyPreview | null>(null);
  const [result, setResult] = useState<HevyImportResult | null>(null);
  const [updateRoutines, setUpdate] = useState(getUpdateRoutines);
  const [last, setLast] = useState(getLastSync);

  const done = (r: HevyImportResult) => {
    setResult(r);
    setPreview(null);
    setLast(getLastSync());
    void client.invalidateQueries();
  };

  const pick = useMutation({
    mutationFn: pickHevyFile,
    onMutate: () => setResult(null),
    onSuccess: (p) => p && setPreview(p),
  });
  const run = useMutation({ mutationFn: (p: HevyPreview) => importHevyPreview(p, 'file'), onSuccess: done });

  const toImport = preview ? preview.counts.new + preview.counts.updated : 0;

  return (
    <Screen edges={[]}>
      <AppText variant="body" color="textSecondary">
        Tus entrenos de Hevy, en tu app y tal cual: series, kilos, repeticiones, calentamientos, drop sets, RPE, notas, superseries y cardio con km y
        tiempo. Cuentan en Calorías (las kcal del día), en el historial y en los récords.
      </AppText>

      <SectionHeader title="Con un archivo (gratis)" />
      <Card style={styles.card}>
        <Step n={1}>En Hevy: Perfil → ⚙️ Ajustes → Exportar e importar datos → Exportar entrenos.</Step>
        <Step n={2}>Guárdalo con «Guardar en Archivos». Si te llega en un .zip, tócalo en Archivos para descomprimirlo.</Step>
        <Step n={3}>Aquí, pulsa «Elegir archivo de Hevy». Verás qué va a entrar antes de guardar nada.</Step>
        <Button title="Elegir archivo de Hevy" icon="document-outline" onPress={() => pick.mutate()} loading={pick.isPending} />
        {pick.isError ? (
          <AppText variant="caption" color="accentText" accessibilityRole="alert">
            {pick.error.message}
          </AppText>
        ) : null}
        <AppText variant="caption" color="textTertiary">
          Hazlo cuando quieras (por ejemplo, después de entrenar): lo que ya estaba no se duplica, lo que cambiaste en Hevy se actualiza y lo que borraste
          aquí no vuelve.
        </AppText>
      </Card>

      {preview ? (
        <Card style={styles.card} accessibilityLiveRegion="polite">
          <AppText variant="headline">
            {plural(preview.items.length, 'entreno', 'entrenos')}
            {preview.from !== null && preview.to !== null ? ` · ${day(preview.from)} – ${day(preview.to)}` : ''}
          </AppText>
          <Count icon="add-circle-outline" color="success" text={plural(preview.counts.new, 'nuevo', 'nuevos')} />
          <Count icon="sync-outline" color="info" text={plural(preview.counts.updated, 'cambiado en Hevy (se actualiza)', 'cambiados en Hevy (se actualizan)')} />
          <Count icon="checkmark-circle-outline" color="textSecondary" text={plural(preview.counts.same, 'ya estaba', 'ya estaban')} />
          {preview.counts.deleted > 0 ? (
            <Count icon="trash-outline" color="textSecondary" text={plural(preview.counts.deleted, 'borrado por ti (no vuelve)', 'borrados por ti (no vuelven)')} />
          ) : null}
          {preview.newExercises.length > 0 ? (
            <AppText variant="caption" color="textSecondary">
              Ejercicios que no tenía la app y se crearán con su nombre de Hevy: {preview.newExercises.join(', ')}.
            </AppText>
          ) : null}
          {preview.skippedRows > 0 ? (
            <AppText variant="caption" color="textTertiary">
              {plural(preview.skippedRows, 'fila no se pudo leer', 'filas no se pudieron leer')} y se ignora{preview.skippedRows === 1 ? '' : 'n'}.
            </AppText>
          ) : null}
          <View style={styles.toggle}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Actualizar mis rutinas</AppText>
              <AppText variant="caption" color="textSecondary">
                Como en Hevy: cada rutina queda como tu último entreno con ella (ejercicios, series y kilos).
              </AppText>
            </View>
            <Switch
              accessibilityLabel="Actualizar mis rutinas con el último entreno de Hevy"
              value={updateRoutines}
              onValueChange={(v) => {
                setUpdate(v);
                setUpdateRoutines(v);
              }}
              trackColor={{ true: colors.success, false: colors.surfaceRaised }}
              thumbColor={colors.text}
            />
          </View>
          <Button
            title={toImport > 0 ? `Importar ${plural(toImport, 'entreno', 'entrenos')}` : 'No hay nada nuevo'}
            disabled={toImport === 0}
            onPress={() => run.mutate(preview)}
            loading={run.isPending}
          />
          {run.isError ? (
            <AppText variant="caption" color="accentText" accessibilityRole="alert">
              No se pudo importar: {run.error.message}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      {result ? <ResultCard result={result} /> : null}

      <SectionHeader title="Automático (Hevy Pro, de pago)" />
      <ApiCard onSynced={done} />

      {last ? (
        <AppText variant="caption" color="textTertiary">
          Última importación: {format(last.at, "d MMM yyyy 'a las' HH:mm", { locale: es })} ({last.source === 'api' ? 'automática' : 'archivo'}),{' '}
          {plural(last.inserted, 'nuevo', 'nuevos')} y {plural(last.updated, 'actualizado', 'actualizados')}.
        </AppText>
      ) : null}
    </Screen>
  );
}

function ResultCard({ result }: { result: HevyImportResult }) {
  return (
    <Card style={[styles.card, styles.success]} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Icon name="checkmark-circle" color="success" />
        <AppText variant="headline" style={styles.flex}>
          Importado
        </AppText>
      </View>
      <AppText variant="body">
        {plural(result.inserted, 'entreno nuevo', 'entrenos nuevos')} y {plural(result.updated, 'actualizado', 'actualizados')}. Ya cuentan en
        Calorías y en tu historial.
      </AppText>
      {result.createdExercises.length > 0 ? (
        <AppText variant="caption" color="textSecondary">
          Ejercicios creados: {result.createdExercises.join(', ')}. Puedes cambiarles el músculo en Entreno → Ejercicios.
        </AppText>
      ) : null}
      {result.routinesUpdated.length > 0 ? (
        <AppText variant="caption" color="textSecondary">
          Rutinas actualizadas: {result.routinesUpdated.join(', ')}.
        </AppText>
      ) : null}
    </Card>
  );
}

/** Clave de la API de Hevy: solo sirve con Hevy Pro. Se guarda en el llavero del iPhone. */
function ApiCard({ onSynced }: { onSynced: (r: HevyImportResult) => void }) {
  const client = useQueryClient();
  const key = useQuery({ queryKey: ['hevyKey'], queryFn: async () => ((await getHevyKey()) ?? null) });
  const [value, setValue] = useState('');
  const save = useMutation({
    mutationFn: (k: string) => setHevyKey(k),
    onSuccess: () => {
      setValue('');
      void client.invalidateQueries({ queryKey: ['hevyKey'] });
    },
  });
  const sync = useMutation({ mutationFn: () => syncHevyApi(true), onSuccess: (r) => r && onSynced(r) });

  return (
    <Card style={styles.card}>
      <AppText variant="body" color="textSecondary">
        Hevy solo deja que otras apps lean tus entrenos solas (su API) si pagas Hevy Pro: unos 2,99 $ al mes o 23,99 $ al año. Tu cuenta es gratuita,
        así que usa el archivo de arriba. Si algún día te haces Pro, pega aquí tu clave y la app se sincronizará sola cada vez que abras Entreno.
      </AppText>
      <Button
        title="Dónde está la clave (hevy.com)"
        variant="ghost"
        compact
        icon="open-outline"
        onPress={() => void Linking.openURL('https://hevy.com/settings?developer')}
      />
      <TextField
        label={key.data ? `Sustituir clave (${maskKey(key.data)})` : 'Clave de la API de Hevy'}
        value={value}
        onChangeText={setValue}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.row}>
        <Button title="Guardar clave" compact disabled={value.trim() === ''} onPress={() => save.mutate(value)} loading={save.isPending} style={styles.flex} />
        {key.data ? <Button title="Borrar" variant="danger" compact onPress={() => save.mutate('')} style={styles.flex} /> : null}
      </View>
      {key.data ? <Button title="Sincronizar ahora" icon="sync-outline" variant="secondary" onPress={() => sync.mutate()} loading={sync.isPending} /> : null}
      {sync.isError ? (
        <AppText variant="caption" color="accentText" accessibilityRole="alert">
          {sync.error.message}
        </AppText>
      ) : null}
    </Card>
  );
}

function Count({ icon, color, text }: { icon: 'add-circle-outline' | 'sync-outline' | 'checkmark-circle-outline' | 'trash-outline'; color: 'success' | 'info' | 'textSecondary'; text: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={20} color={color} />
      <AppText variant="body" style={styles.flex}>
        {text}
      </AppText>
    </View>
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
  success: { borderWidth: 1, borderColor: colors.success },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  step: { flexDirection: 'row', gap: spacing.xs },
  n: { width: 22 },
});
