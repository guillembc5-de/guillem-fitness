import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, SectionHeader, SegmentedControl, spacing } from '@/design';
import { formatLongDay } from '@/features/steps/labels';
import { getLastHealthLink } from '@/features/steps/prefs';

const URL_STEPS = 'guillemfitness://salud?pasos=';
const URL_FITNESS = '&energia=[Valor]&ejercicio=[Valor]';

type Lang = 'es' | 'ca';

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'es', label: 'Castellano' },
  { value: 'ca', label: 'Català' },
];

type Texts = {
  intro: string;
  status: string;
  none: string;
  lastPrefix: string;
  today: string;
  createTitle: string;
  create: string[];
  urlHint: string;
  open: string;
  fitnessTitle: string;
  fitnessIntro: string;
  fitness: string[];
  fitnessUrlHint: string;
  fitnessNote: string;
  autoTitle: string;
  auto: string[];
  troubleTitle: string;
  trouble: string[];
  footer: string;
  openButton: string;
};

/**
 * En catalán, la app Atajos se llama «Dreceres» y Salud, «Salut». Los nombres
 * de las acciones cambian con cada versión de iOS, así que se dice qué
 * palabra buscar en el buscador de acciones en vez del nombre exacto.
 */
const TEXTS: Record<Lang, Texts> = {
  es: {
    intro:
      'Con un Apple ID gratuito, Apple no deja que la app lea Salud directamente. Un Atajo del iPhone sí puede: lee tus pasos en Salud (y, si quieres, la energía activa y los minutos de ejercicio de Fitness) y se los pasa a la app. Cuentan también los del Apple Watch.',
    status: 'Estado',
    none: 'Aún no ha llegado nada desde Atajos.',
    lastPrefix: 'Últimos datos recibidos:',
    today: 'hoy',
    createTitle: '1 · Crear el atajo de pasos (4 acciones)',
    create: [
      'Abre la app Atajos → pestaña Atajos → «+». Llámalo «Pasos a GF».',
      'Toca «Añadir acción», escribe «salud» en el buscador y elige «Buscar muestras de Salud». Toca «Tipo» y elige Pasos. Pon la fecha de inicio en «es hoy» y, en «Agrupar por», elige «Día» (así no cuenta dos veces los pasos del iPhone y del reloj).',
      'Busca «detalles» y añade «Obtener detalles de muestras de Salud». Toca la palabra azul y elige «Valor».',
      'Busca «URL» y añade la acción «URL». Escribe el texto de abajo y, justo al final, toca «Valor» en la barra de variables encima del teclado:',
    ],
    urlHint: 'Debe quedar: guillemfitness://salud?pasos= seguido de la burbuja azul «Valor».',
    open: 'Busca «abrir URL» y añádela. Pulsa ▶︎ abajo: se abrirá la app y dirá cuántos pasos ha guardado.',
    fitnessTitle: '2 · Añadir Fitness (opcional, con Apple Watch)',
    fitnessIntro: 'Así llegan también los anillos Moverse y Ejercicio. Las nuevas acciones van ANTES de «URL»: arrástralas hasta allí si se añaden al final.',
    fitness: [
      'Añade otra vez «Buscar muestras de Salud». En «Tipo» busca «activa» y elige Energía activa. Fecha de inicio «es hoy», Agrupar por «Día».',
      'Añade otra vez «Obtener detalles de muestras de Salud» → «Valor».',
      'Repite los dos pasos anteriores con el tipo Minutos de ejercicio (busca «ejercicio» en la lista de tipos).',
      'En la acción «URL», al final, escribe el texto de abajo. Detrás de energia= toca «Seleccionar variable» y toca el «Valor» de la energía; detrás de ejercicio=, el «Valor» de los minutos.',
    ],
    fitnessUrlHint: 'Donde pone [Valor] no lo escribas: va la burbuja azul de la variable. Todo junto, sin espacios: …pasos=[Valor]&energia=[Valor]&ejercicio=[Valor]',
    fitnessNote:
      'En Calorías, si el reloj mide más que la estimación de la app (pasos + entrenos), se usa la cifra del reloj, que ya lo incluye todo: nunca se suman. Con el Watch, pon el nivel de actividad más bajo en Perfil → Datos y objetivos: el reloj ya mide tu movimiento del día.',
    autoTitle: '3 · Que se haga solo',
    auto: [
      'En Atajos → pestaña Automatización → «+» (o «Nueva automatización») → App.',
      'Elige Guillem Fitness, marca «Se abre» y «Ejecutar inmediatamente». Toca Siguiente.',
      'Elige el atajo «Pasos a GF». Desde ahora, cada vez que abras la app, traerá tus datos de hoy.',
    ],
    troubleTitle: 'Si no funciona',
    trouble: [
      'La primera vez, Atajos pide permiso para leer Salud: toca «Permitir». Si dijiste que no: Ajustes → Salud → Acceso a datos y dispositivos → Atajos → actívalo todo.',
      'Si pone «… no es válido», revisa que en cada «Obtener detalles» elegiste «Valor».',
      'Si la app no se abre, revisa que el texto de la URL empieza exactamente por guillemfitness://',
      'Los entrenos del Watch (correr, caminar…) no llegan por el Atajo, pero sus calorías ya van dentro de la energía activa.',
    ],
    footer:
      'Si un día no abres la app, esos pasos los recupera el sensor del iPhone (guarda 7 días). Si Salud y el sensor tienen cifras distintas, se queda la mayor; nunca se suman.',
    openButton: 'Abrir Atajos',
  },
  ca: {
    intro:
      "Amb un Apple ID gratuït, Apple no deixa que l'app llegeixi Salut directament. Una drecera de l'iPhone sí que pot: llegeix els teus passos a Salut (i, si vols, l'energia activa i els minuts d'exercici de Fitness) i els passa a l'app. També compten els de l'Apple Watch.",
    status: 'Estat',
    none: 'Encara no ha arribat res des de Dreceres.',
    lastPrefix: 'Últimes dades rebudes:',
    today: 'avui',
    createTitle: '1 · Crear la drecera de passos (4 accions)',
    create: [
      "Obre l'app Dreceres → pestanya Dreceres → «+». Posa-li de nom «Passos a GF».",
      "Toca «Afegir una acció», escriu «salut» al cercador i tria l'acció de buscar mostres de Salut. Toca «Tipus» i tria Passos. Posa la data d'inici a «és avui» i, a «Agrupar per», tria «Dia» (així no compta dues vegades els passos de l'iPhone i del rellotge).",
      "Escriu «detalls» al cercador i afegeix l'acció d'obtenir detalls de mostres de Salut. Toca la paraula blava i tria «Valor».",
      "Escriu «URL» al cercador i afegeix l'acció «URL». Escriu el text de sota i, just al final, toca «Valor» a la barra de variables que surt sobre el teclat:",
    ],
    urlHint: 'Ha de quedar: guillemfitness://salud?pasos= i, darrere, la bombolla blava «Valor».',
    open: "Escriu «obrir» al cercador i afegeix l'acció d'obrir URL. Prem ▶︎ a baix: s'obrirà l'app i dirà quants passos ha desat.",
    fitnessTitle: '2 · Afegir Fitness (opcional, amb Apple Watch)',
    fitnessIntro: "Així arriben també els anells Moure't i Exercici. Les accions noves van ABANS de «URL»: arrossega-les fins allà si s'afegeixen al final.",
    fitness: [
      "Torna a afegir l'acció de buscar mostres de Salut. A «Tipus» busca «activa» i tria Energia activa. Data d'inici «és avui», Agrupar per «Dia».",
      "Torna a afegir l'acció d'obtenir detalls de mostres de Salut → «Valor».",
      "Repeteix els dos passos anteriors amb el tipus Minuts d'exercici (busca «exercici» a la llista de tipus).",
      "A l'acció «URL», al final, escriu el text de sota. Darrere d'energia= toca «Seleccionar variable» i toca el «Valor» de l'energia; darrere d'ejercicio=, el «Valor» dels minuts.",
    ],
    fitnessUrlHint: 'On posa [Valor] no ho escriguis: hi va la bombolla blava de la variable. Tot junt, sense espais: …pasos=[Valor]&energia=[Valor]&ejercicio=[Valor]',
    fitnessNote:
      "A Calories, si el rellotge mesura més que l'estimació de l'app (passos + entrenaments), es fa servir la xifra del rellotge, que ja ho inclou tot: mai no se sumen. Amb el Watch, posa el nivell d'activitat més baix a Perfil → Datos y objetivos: el rellotge ja mesura el teu moviment del dia.",
    autoTitle: '3 · Que es faci sol',
    auto: [
      'A Dreceres → pestanya Automatització → «+» (o «Nova automatització») → App.',
      "Tria Guillem Fitness, marca «S'obre» i «Executar immediatament». Toca Següent.",
      "Tria la drecera «Passos a GF». A partir d'ara, cada cop que obris l'app, portarà les teves dades d'avui.",
    ],
    troubleTitle: 'Si no funciona',
    trouble: [
      'La primera vegada, Dreceres demana permís per llegir Salut: toca «Permetre». Si vas dir que no: Configuració → Salut → Accés a dades i dispositius → Dreceres → activa-ho tot.',
      'Si diu «… no es válido», revisa que a cada acció d\'obtenir detalls vas triar «Valor».',
      "Si l'app no s'obre, revisa que el text de la URL comença exactament per guillemfitness://",
      'Els entrenaments del Watch (córrer, caminar…) no arriben per la drecera, però les seves calories ja van dins de l\'energia activa.',
    ],
    footer:
      "Si un dia no obres l'app, aquests passos els recupera el sensor de l'iPhone (guarda 7 dies). Si Salut i el sensor tenen xifres diferents, es queda la més alta; mai no se sumen.",
    openButton: 'Obrir Dreceres',
  },
};

function deviceLang(): Lang {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('ca') ? 'ca' : 'es';
  } catch {
    return 'es';
  }
}

/**
 * Instrucciones para traer los pasos (y los anillos de Fitness) de la app
 * Salud con un Atajo. Funciona aunque la instalación gratuita no tenga el
 * permiso de HealthKit.
 */
export default function HealthShortcutScreen() {
  const [last] = useState(getLastHealthLink);
  const [lang, setLang] = useState<Lang>(deviceLang);
  const t = TEXTS[lang];

  return (
    <Screen edges={[]}>
      <SegmentedControl accessibilityLabel="Idioma de las instrucciones" options={LANG_OPTIONS} value={lang} onChange={setLang} />
      <AppText variant="body" color="textSecondary">
        {t.intro}
      </AppText>

      <Card style={styles.card}>
        <AppText variant="overline" color="textSecondary">
          {t.status}
        </AppText>
        <AppText variant="bodyStrong">
          {last
            ? `${t.lastPrefix} ${last.lastDate ? formatLongDay(last.lastDate) : t.today} (${new Date(last.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`
            : t.none}
        </AppText>
      </Card>

      <SectionHeader title={t.createTitle} />
      <Card style={styles.card}>
        {t.create.map((text, i) => (
          <Step key={text} n={i + 1}>
            {text}
          </Step>
        ))}
        <Code>{URL_STEPS}</Code>
        <AppText variant="caption" color="textSecondary">
          {t.urlHint}
        </AppText>
        <Step n={t.create.length + 1}>{t.open}</Step>
      </Card>

      <SectionHeader title={t.fitnessTitle} />
      <Card style={styles.card}>
        <AppText variant="body" color="textSecondary">
          {t.fitnessIntro}
        </AppText>
        {t.fitness.map((text, i) => (
          <Step key={text} n={i + 1}>
            {text}
          </Step>
        ))}
        <Code>{URL_FITNESS}</Code>
        <AppText variant="caption" color="textSecondary">
          {t.fitnessUrlHint}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {t.fitnessNote}
        </AppText>
      </Card>

      <SectionHeader title={t.autoTitle} />
      <Card style={styles.card}>
        {t.auto.map((text, i) => (
          <Step key={text} n={i + 1}>
            {text}
          </Step>
        ))}
      </Card>

      <SectionHeader title={t.troubleTitle} />
      <Card style={styles.card}>
        {t.trouble.map((text) => (
          <AppText key={text} variant="body">
            • {text}
          </AppText>
        ))}
      </Card>

      <AppText variant="caption" color="textTertiary">
        {t.footer}
      </AppText>
      <View style={styles.row}>
        <Button title={t.openButton} variant="secondary" onPress={() => void Linking.openURL('shortcuts://')} style={styles.flex} />
      </View>
    </Screen>
  );
}

function Code({ children }: { children: string }) {
  return (
    <AppText variant="bodyStrong" color="text" selectable style={styles.code}>
      {children}
    </AppText>
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
