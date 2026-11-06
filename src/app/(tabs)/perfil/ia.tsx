import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LoadingState, Screen, SectionHeader, SegmentedControl, TextField, spacing } from '@/design';
import { portionRatio } from '@/domain/foodMemory';
import { formatNumber } from '@/domain/format';
import { AI_PROVIDERS, type AiProvider, type Profile } from '@/domain/types';
import { useClearFoodMemory, useFoodMemory } from '@/features/nutrition/queries';
import { getVisionProvider } from '@/features/nutrition/vision/provider';
import { VisionError, VISION_ERROR_TEXT } from '@/features/nutrition/vision/types';
import { AI_PROVIDER_LABELS } from '@/features/profile/labels';
import { DEFAULT_CLAUDE_MODEL, DEFAULT_GEMINI_MODEL } from '@/features/profile/profileForm';
import { useApiKeyStatus, useProfile, useSaveApiKey, useSaveProfile } from '@/features/profile/queries';

const PROVIDER_OPTIONS = AI_PROVIDERS.map((value) => ({ value, label: AI_PROVIDER_LABELS[value] }));

const HELP: Record<AiProvider, string> = {
  gemini:
    'Gratis. Crea la clave en aistudio.google.com con tu cuenta de Google (pasos en el README). En la capa gratuita Google puede usar tus fotos para mejorar sus modelos.',
  claude:
    'De pago por uso (con Haiku 5.5, unos céntimos al mes con tu volumen). Crea la clave en la consola de Anthropic. No se usa para entrenar modelos.',
};

export default function IaScreen() {
  const profile = useProfile();
  if (!profile.data) return <LoadingState />;
  return <IaForm profile={profile.data} />;
}

function IaForm({ profile }: { profile: Profile }) {
  const saveProfile = useSaveProfile();
  // El antiguo valor por defecto ya no sirve a claves nuevas: se muestra el actual.
  const [geminiModel, setGeminiModel] = useState(profile.geminiModel === 'gemini-flash-latest' ? DEFAULT_GEMINI_MODEL : profile.geminiModel);
  const [claudeModel, setClaudeModel] = useState(profile.claudeModel);

  const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...input } = profile;

  const setProvider = (aiProvider: AiProvider) => saveProfile.mutate({ ...input, aiProvider });
  const saveModels = () =>
    saveProfile.mutate({
      ...input,
      geminiModel: geminiModel.trim() || DEFAULT_GEMINI_MODEL,
      claudeModel: claudeModel.trim() || DEFAULT_CLAUDE_MODEL,
    });

  return (
    <Screen edges={[]}>
      <AppText variant="body" color="textSecondary">
        La IA estima los alimentos de tus fotos. Es una estimación: siempre revisas y corriges antes de que cuente en tu día.
      </AppText>

      <SectionHeader title="Proveedor" />
      <SegmentedControl accessibilityLabel="Proveedor de IA" options={PROVIDER_OPTIONS} value={profile.aiProvider} onChange={setProvider} />

      {AI_PROVIDERS.map((provider) => (
        <KeyCard key={provider} provider={provider} active={provider === profile.aiProvider} profile={profile} />
      ))}

      <SectionHeader title="Lo que ha aprendido" />
      <LearnedCard />

      <SectionHeader title="Modelos" />
      <TextField label="Modelo de Gemini" value={geminiModel} onChangeText={setGeminiModel} autoCapitalize="none" autoCorrect={false} />
      <TextField label="Modelo de Claude" value={claudeModel} onChangeText={setClaudeModel} autoCapitalize="none" autoCorrect={false} />
      <Button title="Guardar modelos" variant="secondary" onPress={saveModels} loading={saveProfile.isPending} />

      <AppText variant="caption" color="textTertiary">
        Las claves se guardan cifradas en el llavero del iPhone, nunca en la base de datos ni en el código.
      </AppText>
    </Screen>
  );
}

/** Cuántos alimentos ha aprendido la app de tus correcciones y cómo ajusta las raciones. */
function LearnedCard() {
  const memory = useFoodMemory();
  const clear = useClearFoodMemory();
  const list = memory.data ?? [];
  const { ratio, source } = portionRatio(null, list);
  const pct = Math.round((ratio - 1) * 100);

  const askClear = () =>
    Alert.alert('¿Olvidar lo aprendido?', 'Las próximas fotos volverán a usar solo la estimación de la IA. Tus comidas guardadas no cambian.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Olvidar', style: 'destructive', onPress: () => clear.mutate() },
    ]);

  return (
    <Card style={styles.learned}>
      <AppText variant="body">
        {list.length === 0
          ? 'Todavía nada. Cada vez que guardes una comida, la app recuerda tus alimentos y sus valores, y aprende si la IA suele quedarse corta o pasarse con las raciones.'
          : `Recuerda ${list.length} ${list.length === 1 ? 'alimento' : 'alimentos'} con tus valores. Cuando la IA los reconozca en una foto, usará los tuyos.`}
      </AppText>
      {source === 'global' && pct !== 0 ? (
        <AppText variant="caption" color="textSecondary">
          Con tus correcciones, la IA suele {pct > 0 ? 'quedarse corta' : 'pasarse'} un {formatNumber(Math.abs(pct))} % en las raciones: lo ajusta sola.
        </AppText>
      ) : null}
      {list.length > 0 ? <Button title="Olvidar lo aprendido" variant="danger" compact onPress={askClear} loading={clear.isPending} /> : null}
    </Card>
  );
}

type TestState = { status: 'idle' | 'testing' | 'ok' } | { status: 'error'; message: string };

function KeyCard({ provider, active, profile }: { provider: AiProvider; active: boolean; profile: Profile }) {
  const status = useApiKeyStatus(provider);
  const saveKey = useSaveApiKey(provider);
  const [value, setValue] = useState('');
  const [test, setTest] = useState<TestState>({ status: 'idle' });

  const runTest = async () => {
    setTest({ status: 'testing' });
    try {
      const client = await getVisionProvider(profile, provider);
      await client.testConnection();
      setTest({ status: 'ok' });
    } catch (e) {
      setTest({ status: 'error', message: e instanceof VisionError ? `${VISION_ERROR_TEXT[e.kind]} (${e.message})` : String(e) });
    }
  };

  const label = AI_PROVIDER_LABELS[provider];

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <AppText variant="headline">
          {label}
          {active ? ' · en uso' : ''}
        </AppText>
        <AppText variant="caption" color={status.data ? 'success' : 'textSecondary'}>
          {status.data ? `Clave ${status.data}` : 'Sin clave'}
        </AppText>
      </View>
      <AppText variant="caption" color="textSecondary">
        {HELP[provider]}
      </AppText>
      <TextField
        label={status.data ? 'Sustituir clave' : 'Pega aquí la clave'}
        value={value}
        onChangeText={setValue}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
      />
      <View style={styles.actions}>
        <Button
          title="Guardar clave"
          compact
          disabled={value.trim() === ''}
          loading={saveKey.isPending}
          onPress={() => saveKey.mutate(value, { onSuccess: () => setValue('') })}
          style={styles.flex}
        />
        {status.data ? (
          <Button title="Borrar" variant="danger" compact onPress={() => saveKey.mutate('')} style={styles.flex} />
        ) : null}
      </View>
      {saveKey.isError ? (
        <AppText variant="caption" color="accentText" accessibilityRole="alert">
          No se pudo guardar la clave: {saveKey.error.message}
        </AppText>
      ) : null}
      {status.data ? (
        <Button
          title="Probar conexión"
          icon="pulse-outline"
          variant="secondary"
          compact
          loading={test.status === 'testing'}
          onPress={() => void runTest()}
          accessibilityHint="Comprueba la clave y el modelo con una llamada ligera"
        />
      ) : null}
      {test.status === 'ok' ? (
        <AppText variant="caption" color="success" accessibilityLiveRegion="polite">
          Conexión correcta con {label} ({provider === 'gemini' ? profile.geminiModel : profile.claudeModel}).
        </AppText>
      ) : null}
      {test.status === 'error' ? (
        <AppText variant="caption" color="accentText" accessibilityRole="alert">
          {test.message}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  learned: { gap: spacing.sm },
  card: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
