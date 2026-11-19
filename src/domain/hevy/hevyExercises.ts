import type { CardioKind, Equipment, MuscleGroup, TrackingType } from '../enums';
import { normalizeSearch } from '../text';
import type { HevySet } from './hevyTypes';

/**
 * Ejercicios de Hevy → ejercicio de la biblioteca de la app (por su slug).
 * Hevy cambia los nombres según el idioma y con el tiempo («Tríceps con
 * Polea» pasó a «Jalón de Tríceps en Polea»), así que cada uno lleva su id de
 * plantilla (la API lo trae) y todos los nombres con que ha salido en tu Hevy.
 * El nombre actual en castellano es el de la biblioteca y no hace falta aquí.
 */
const HEVY_LIBRARY: readonly { slug: string; ids: string[]; names: string[] }[] = [
  { slug: 'contractor-pecho', ids: ['9DCE2D64'], names: ['Butterfly (Pec Deck)', 'Contractor de pecho (máquina)'] },
  { slug: 'jalon-pecho-polea', ids: ['6A6C31A5'], names: ['Lat Pulldown (Cable)', 'Jalón al pecho (polea)'] },
  { slug: 'press-pecho-inclinado-maquina', ids: ['FBF92739'], names: ['Incline Chest Press (Machine)'] },
  { slug: 'jalon-agarre-estrecho', ids: ['4E5257DE'], names: ['Lat Pulldown - Close Grip (Cable)', 'Jalón agarre estrecho (polea)'] },
  { slug: 'press-hombros-discos', ids: ['059E835D'], names: ['Shoulder Press (Machine Plates)'] },
  { slug: 'elevacion-lateral-un-brazo-polea', ids: ['DE68C825'], names: ['Single Arm Lateral Raise (Cable)'] },
  { slug: 'jalon-triceps-polea', ids: ['93A552C6'], names: ['Triceps Pushdown', 'Tríceps con Polea'] },
  { slug: 'curl-polea', ids: ['ADA8623C'], names: ['Bicep Curl (Cable)', 'Curl de bíceps (polea)'] },
  { slug: 'cinta', ids: ['243710DE'], names: ['Treadmill', 'Cinta de correr'] },
  { slug: 'press-banca-barra', ids: ['79D0BB3A'], names: ['Bench Press (Barbell)'] },
  { slug: 'remo-sentado-agarre-abierto', ids: ['C3BCABB3'], names: ['Seated Cable Row - Bar Wide Grip'] },
  { slug: 'elevacion-lateral-mancuernas', ids: ['422B08F1'], names: ['Lateral Raise (Dumbbell)', 'Elevacion Laterales (Mancuerna)', 'Elevación lateral (mancuernas)'] },
  { slug: 'contractor-inverso', ids: ['D8281C62'], names: ['Rear Delt Reverse Fly (Machine)', 'Contractor inverso (máquina)'] },
  { slug: 'extensiones-una-pierna', ids: ['629AE73D'], names: ['Single Leg Extensions'] },
  { slug: 'curl-pierna-pie', ids: ['6120CAAB'], names: ['Standing Leg Curls', 'Curl de pierna de pie (máquina)'] },
  { slug: 'sentadilla-pendulo', ids: ['30E293E3'], names: ['Pendulum Squat (Machine)'] },
  { slug: 'gemelos-pie-maquina', ids: ['E05C2C38'], names: ['Standing Calf Raise (Machine)'] },
  { slug: 'press-inclinado-multipower', ids: ['3A6FA3D1'], names: ['Incline Bench Press (Smith Machine)', 'Press inclinado (multipower)'] },
  { slug: 'press-banca-mancuernas', ids: ['3601968B'], names: ['Bench Press (Dumbbell)', 'Press de banca (mancuernas)'] },
  { slug: 'remo-t', ids: ['08A2974E'], names: ['T Bar Row', 'Remo en Punta', 'Remo en T (barra)'] },
  { slug: 'vuelos-posteriores-un-brazo-polea', ids: ['9264ADA1'], names: ['Single Arm Rear Delt Fly (Cable)'] },
  { slug: 'curl-pierna-sentado', ids: ['11A123F3'], names: ['Seated Leg Curl (Machine)', 'Curl de pierna sentado (máquina)'] },
  { slug: 'sentadilla-hack-maquina', ids: ['1E42FD5F'], names: ['Hack Squat (Machine)'] },
  { slug: 'peso-muerto-rumano-barra', ids: ['2B4B7310'], names: ['Romanian Deadlift (Barbell)'] },
  { slug: 'bicicleta-estatica', ids: ['D8F7F851'], names: ['Cycling', 'Bicicleta estática'] },
  { slug: 'curl-martillo', ids: ['7E3BC8B6'], names: ['Hammer Curl (Dumbbell)', 'Curl martillo (mancuernas)'] },
  { slug: 'press-banca-multipower', ids: ['0FBF7195'], names: ['Bench Press (Smith Machine)', 'Press de banca (multipower)'] },
  { slug: 'curl-predicador-maquina', ids: ['1E9A6B8E'], names: ['Preacher Curl (Machine)'] },
  { slug: 'prensa-piernas', ids: ['C7973E0E'], names: ['Leg Press (Machine)', 'Prensa de piernas (máquina)'] },
  { slug: 'aduccion-cadera-maquina', ids: ['8BEBFED6'], names: ['Hip Adduction (Machine)', 'Aducción de Caderas'] },
  { slug: 'abduccion-cadera-maquina', ids: ['F4B4C6EE'], names: ['Hip Abduction (Machine)', 'Abducción de Caderas'] },
  { slug: 'hiperextension-peso', ids: ['091737FA'], names: ['Back Extension (Weighted Hyperextension)'] },
  { slug: 'press-pecho-isolateral', ids: ['24706DCD'], names: ['Iso-Lateral Chest Press (Machine)'] },
  { slug: 'remo-barra', ids: ['55E6546F'], names: ['Bent Over Row (Barbell)', 'Remo con barra'] },
  { slug: 'pajaros-mancuernas', ids: ['E5988A0A'], names: ['Rear Delt Reverse Fly (Dumbbell)', 'Pájaros (mancuernas)'] },
  { slug: 'press-pecho-maquina', ids: ['7EB3F7C3'], names: ['Chest Press (Machine)'] },
  { slug: 'sentadilla-barra', ids: ['D04AC939'], names: ['Squat (Barbell)'] },
  { slug: 'press-hombros-mancuernas', ids: ['878CD1D0'], names: ['Shoulder Press (Dumbbell)', 'Press de hombros (mancuernas)'] },
  { slug: 'cruce-poleas', ids: ['651F844C'], names: ['Cable Crossover', 'Cruce de poleas (polea)'] },
  { slug: 'curl-mancuernas', ids: ['37FCC2BB'], names: ['Bicep Curl (Dumbbell)', 'Curl de bíceps (mancuernas)'] },
  { slug: 'crunch', ids: ['DCF3B31B'], names: ['Crunch'] },
  { slug: 'correr', ids: ['AC1BB830'], names: ['Running'] },
  { slug: 'hip-thrust-barra', ids: ['D57C2EC7'], names: ['Hip Thrust (Barbell)'] },
  { slug: 'curl-martillo-cuerda', ids: ['36E8F14E'], names: ['Hammer Curl (Cable)'] },
  { slug: 'press-hombros-sentado-barra', ids: ['91AF29E0'], names: ['Seated Overhead Press (Barbell)'] },
  { slug: 'sentadilla-bulgara', ids: ['B5D3A742'], names: ['Bulgarian Split Squat'] },
  { slug: 'extension-pantorrilla-maquina', ids: ['47B9DF13'], names: ['Calf Extension (Machine)'] },
  { slug: 'prensa-horizontal', ids: ['0EB695C9'], names: ['Leg Press Horizontal (Machine)', 'Prensa horizontal (máquina)'] },
  { slug: 'remo-sentado-polea', ids: ['F1D60854'], names: ['Seated Cable Row - V Grip (Cable)', 'Seated Cable Row'] },
  { slug: 'face-pull', ids: ['BE640BA0'], names: ['Face Pull'] },
  { slug: 'extension-piernas', ids: ['75A4F6C4'], names: ['Leg Extension (Machine)'] },
  { slug: 'curl-barra', ids: ['A5AC6449'], names: ['Bicep Curl (Barbell)'] },
  { slug: 'hip-thrust-maquina', ids: [], names: ['Hip Thrust (Machine)'] },
];

const BY_ID = new Map<string, string>();
const BY_NAME = new Map<string, string>();
for (const e of HEVY_LIBRARY) {
  for (const id of e.ids) BY_ID.set(id.toUpperCase(), e.slug);
  for (const name of e.names) BY_NAME.set(normalizeSearch(name), e.slug);
}

/** Slug de la biblioteca para un ejercicio de Hevy, o null si no está en la tabla. */
export function hevyLibrarySlug(title: string, templateId: string | null): string | null {
  if (templateId) {
    const byId = BY_ID.get(templateId.toUpperCase());
    if (byId) return byId;
  }
  return BY_NAME.get(normalizeSearch(title)) ?? null;
}

export type GuessedExercise = {
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  trackingType: TrackingType;
  cardioKind: CardioKind | null;
};

const has = (text: string, words: RegExp) => words.test(text);

/**
 * Para un ejercicio de Hevy que la app no conoce: se crea como ejercicio
 * propio con su mismo nombre, adivinando músculo, material y tipo por el
 * nombre y por cómo son sus series.
 */
export function guessExercise(title: string, sets: readonly HevySet[]): GuessedExercise {
  const t = normalizeSearch(title);
  const anyDistance = sets.some((s) => s.distanceM !== null && s.distanceM > 0);
  const anyWeight = sets.some((s) => s.weightKg !== null && s.weightKg > 0);
  const anyReps = sets.some((s) => s.reps !== null);
  const anyDuration = sets.some((s) => s.durationS !== null);

  const stepsCardio = has(t, /\b(cinta|correr|carrera|caminar|andar|senderismo|treadmill|run|running|walk|walking|hiking|escaleras|stair|comba|jump rope)\b/);
  const machineCardio = has(t, /\b(bici|bicicleta|cycling|bike|eliptica|elliptical|remo ergometro|rowing machine|rower|spinning|natacion|swim)\b/);
  const cardio = stepsCardio || machineCardio || (anyDistance && !anyReps);

  let muscleGroup: MuscleGroup = 'full_body';
  if (cardio) muscleGroup = 'cardio';
  else if (has(t, /aduccion|adduction/)) muscleGroup = 'adductors';
  else if (has(t, /abduccion|abduction/)) muscleGroup = 'abductors';
  else if (has(t, /gemelo|pantorrilla|calf/)) muscleGroup = 'calves';
  else if (has(t, /curl.*pierna|femoral|leg curl|nordic|nordico|rumano|romanian|piernas rigidas/)) muscleGroup = 'hamstrings';
  else if (has(t, /gluteo|glute|hip thrust|empuje de cadera|puente/)) muscleGroup = 'glutes';
  else if (has(t, /sentadilla|squat|prensa|press de piernas|leg press|extension.*pierna|leg extension|zancada|lunge|step up/)) muscleGroup = 'quads';
  else if (has(t, /abdominal|crunch|plancha|plank|core|oblicuo|elevacion de piernas|leg raise/)) muscleGroup = 'abs';
  else if (has(t, /triceps|fondos|dips|press frances|skull/)) muscleGroup = 'triceps';
  else if (has(t, /biceps|bicep|curl/)) muscleGroup = 'biceps';
  else if (has(t, /hombro|shoulder|lateral|militar|overhead|vuelos|delt|face pull|tiron a la cara|arnold/)) muscleGroup = 'shoulders';
  else if (has(t, /pecho|chest|banca|bench|aperturas|fly|cruzados|crossover|mariposa|pec deck|flexiones|push up/)) muscleGroup = 'chest';
  else if (has(t, /jalon|remo|row|dominada|pull up|chin up|pulldown|lat /)) muscleGroup = 'back';
  else if (has(t, /espalda baja|hiperextension|back extension|lumbar|buenos dias|good morning/)) muscleGroup = 'lower_back';
  else if (has(t, /encogimiento|shrug|trapecio/)) muscleGroup = 'traps';
  else if (has(t, /muneca|wrist|antebrazo|forearm/)) muscleGroup = 'forearms';

  let equipment: Equipment = anyWeight ? 'other' : 'bodyweight';
  if (has(t, /smith|multipower/)) equipment = 'smith';
  else if (has(t, /barra|barbell/)) equipment = 'barbell';
  else if (has(t, /mancuerna|dumbbell/)) equipment = 'dumbbell';
  else if (has(t, /cable|polea/)) equipment = 'cable';
  else if (has(t, /discos|plates|plate loaded/)) equipment = 'plate_machine';
  else if (has(t, /maquina|machine|cinta|treadmill|bici|cycling|eliptica|elliptical/)) equipment = 'machine';
  else if (has(t, /kettlebell|pesa rusa/)) equipment = 'kettlebell';
  else if (has(t, /banda|band/)) equipment = 'band';

  let trackingType: TrackingType = 'weight_reps';
  if (cardio || anyDistance) trackingType = 'distance_duration';
  else if (anyDuration && !anyReps) trackingType = 'duration';
  else if (!anyWeight && anyReps) trackingType = 'reps_only';

  return {
    muscleGroup,
    equipment,
    trackingType,
    cardioKind: cardio ? (machineCardio && !stepsCardio ? 'machine' : 'steps') : null,
  };
}
