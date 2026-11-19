import { SET_TYPES, type SetType } from '../enums';
import { normalizeSearch } from '../text';
import type { HevyExercise, HevyParseResult, HevySet, HevyWorkout } from './hevyTypes';

/**
 * Lee el archivo que exporta Hevy (Perfil → Ajustes → Exportar e importar
 * datos → Exportar entrenos). Una fila por serie:
 *
 *   title,start_time,end_time,description,exercise_title,superset_id,
 *   exercise_notes,set_index,set_type,weight_kg|weight_lbs,reps,
 *   distance_km|distance_miles,duration_seconds,rpe
 *
 * Detalles de Hevy que hay que respetar:
 * - Las fechas van en hora local sin zona y con el mes en el idioma de la app
 *   («18 nov 2026, 16:24»); desde la web, al estilo del navegador.
 * - Un 0 sale vacío (0 kg × 10 → peso vacío).
 * - Los saltos de línea de las notas salen como los caracteres «\n».
 * - El mismo ejercicio dos veces en un entreno reinicia set_index en 0.
 */

/** CSV con comillas, comillas dobles escapadas y finales de línea CRLF o LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** Meses en los idiomas de Hevy más probables (sin tildes ni puntos). */
const MONTHS: Record<string, number> = {};
const MONTH_WORDS: string[][] = [
  ['jan', 'january', 'ene', 'enero', 'gen', 'gener', 'janv', 'janvier', 'jan.', 'januar', 'jaen', 'genn', 'gennaio'],
  ['feb', 'february', 'febrero', 'febr', 'febrer', 'fev', 'fevr', 'fevrier', 'februar', 'febbraio'],
  ['mar', 'march', 'marzo', 'marc', 'mars', 'marz', 'maerz'],
  ['apr', 'april', 'abr', 'abril', 'avr', 'avril', 'aprile'],
  ['may', 'mayo', 'maig', 'mai', 'mag', 'maggio'],
  ['jun', 'june', 'junio', 'juny', 'juin', 'juni', 'giu', 'giugno'],
  ['jul', 'july', 'julio', 'juliol', 'juil', 'juillet', 'juli', 'lug', 'luglio'],
  ['aug', 'august', 'ago', 'agosto', 'ag', 'agost', 'aout', 'aou'],
  ['sep', 'sept', 'september', 'septiembre', 'set', 'setembre', 'settembre'],
  ['oct', 'october', 'octubre', 'okt', 'oktober', 'ott', 'ottobre'],
  ['nov', 'november', 'noviembre', 'novembre'],
  ['dec', 'december', 'dic', 'diciembre', 'des', 'desembre', 'dez', 'dezember', 'dicembre'],
];
MONTH_WORDS.forEach((words, i) => words.forEach((w) => (MONTHS[w.replace(/\./g, '')] = i + 1)));

function monthFromToken(token: string): number | null {
  const key = normalizeSearch(token).replace(/[.\s]/g, '');
  return MONTHS[key] ?? MONTHS[key.slice(0, 4)] ?? MONTHS[key.slice(0, 3)] ?? null;
}

function localMs(year: number, month: number, day: number, hour: number, minute: number): number | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const d = new Date(year, month - 1, day, hour, minute);
  return d.getMonth() === month - 1 ? d.getTime() : null;
}

/** Fecha de Hevy en cualquiera de sus formatos → epoch ms (hora local del móvil). */
export function parseHevyDate(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const ms = Date.parse(text);
    return Number.isFinite(ms) ? ms : null;
  }
  // App: «18 nov 2026, 16:24», «1 Sept. 2026, 07:30», «5 de sept. de 2026, 6:10»
  let m = /^(\d{1,2})\s+(?:de\s+)?([^\s,\d]+)\s+(?:de\s+)?(\d{4}),?\s+(\d{1,2}):(\d{2})/i.exec(text);
  if (m) {
    const month = monthFromToken(m[2] ?? '');
    return month ? localMs(Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5])) : null;
  }
  // Web en inglés: «Sep 5, 2026, 6:10 AM»
  m = /^([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4}),?\s+(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(text);
  if (m) {
    const month = monthFromToken(m[1] ?? '');
    let hour = Number(m[4]);
    const ampm = (m[6] ?? '').toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return month ? localMs(Number(m[3]), month, Number(m[2]), hour, Number(m[5])) : null;
  }
  // Numérico con el día delante: «05.09.2026, 06:10» o «05/09/2026 06:10»
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4}),?\s+(\d{1,2}):(\d{2})/.exec(text);
  if (m) return localMs(Number(m[3]), Number(m[2]), Number(m[1]), Number(m[4]), Number(m[5]));
  return null;
}

function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const text = raw.trim();
  if (text === '') return null;
  const value = Number(text.includes('.') ? text : text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function text(raw: string | undefined): string | null {
  const value = (raw ?? '').replace(/\\n/g, '\n').trim();
  return value === '' ? null : value;
}

function setType(raw: string | undefined): SetType {
  const value = (raw ?? '').trim().toLowerCase();
  return (SET_TYPES as readonly string[]).includes(value) ? (value as SetType) : 'normal';
}

const LB_PER_KG = 2.20462;
const M_PER_MILE = 1609.344;

/** Lee el CSV de Hevy. Lanza un error con un mensaje claro si no es un archivo de Hevy. */
export function parseHevyCsv(csv: string): HevyParseResult {
  const rows = parseCsv(csv);
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const need = ['title', 'start_time', 'exercise_title', 'set_type'];
  if (need.some((n) => col(n) < 0)) {
    throw new Error('No es un archivo de entrenos de Hevy. En Hevy: Perfil → Ajustes → Exportar e importar datos → Exportar entrenos.');
  }
  const idx = {
    title: col('title'),
    start: col('start_time'),
    end: col('end_time'),
    description: col('description'),
    exercise: col('exercise_title'),
    superset: col('superset_id'),
    notes: col('exercise_notes'),
    setIndex: col('set_index'),
    setType: col('set_type'),
    weightKg: col('weight_kg'),
    weightLbs: col('weight_lbs'),
    reps: col('reps'),
    distanceKm: col('distance_km'),
    distanceMi: col('distance_miles'),
    duration: col('duration_seconds'),
    rpe: col('rpe'),
  };
  const at = (row: string[], i: number) => (i >= 0 ? row[i] : undefined);

  type Building = HevyWorkout & { rowKey: string };
  const workouts: Building[] = [];
  let skippedRows = 0;
  let current: Building | null = null;
  let exercise: HevyExercise | null = null;
  let lastSetIndex = -1;

  for (const row of rows.slice(1)) {
    const title = (at(row, idx.title) ?? '').trim() || 'Entreno';
    const startRaw = at(row, idx.start) ?? '';
    const endRaw = at(row, idx.end) ?? '';
    const startedAt = parseHevyDate(startRaw);
    if (startedAt === null) {
      skippedRows += 1;
      continue;
    }
    const endedAt = Math.max(startedAt, parseHevyDate(endRaw) ?? startedAt);
    // Las filas de un entreno van seguidas: cambia el título o la hora → otro entreno.
    const rowKey = `${title}\u0000${startRaw}\u0000${endRaw}`;
    if (!current || current.rowKey !== rowKey) {
      current = { title, startedAt, endedAt, description: text(at(row, idx.description)), exercises: [], rowKey };
      workouts.push(current);
      exercise = null;
      lastSetIndex = -1;
    }

    const exerciseTitle = (at(row, idx.exercise) ?? '').replace(/\s+/g, ' ').trim();
    if (exerciseTitle === '') {
      skippedRows += 1;
      continue;
    }
    const setIndex = num(at(row, idx.setIndex)) ?? lastSetIndex + 1;
    if (!exercise || exercise.title !== exerciseTitle || setIndex <= lastSetIndex) {
      const superset = (at(row, idx.superset) ?? '').trim();
      exercise = {
        title: exerciseTitle,
        templateId: null,
        notes: text(at(row, idx.notes)),
        supersetKey: superset === '' ? null : `${workouts.length}-${superset}`,
        sets: [],
      };
      current.exercises.push(exercise);
    }
    lastSetIndex = setIndex;

    const lbs = num(at(row, idx.weightLbs));
    const kg = num(at(row, idx.weightKg)) ?? (lbs !== null ? lbs / LB_PER_KG : null);
    const miles = num(at(row, idx.distanceMi));
    const km = num(at(row, idx.distanceKm));
    const duration = num(at(row, idx.duration));
    const set: HevySet = {
      type: setType(at(row, idx.setType)),
      weightKg: kg !== null ? Math.round(kg * 100) / 100 : null,
      reps: num(at(row, idx.reps)),
      distanceM: km !== null ? Math.round(km * 1000) : miles !== null ? Math.round(miles * M_PER_MILE) : null,
      durationS: duration !== null && duration > 0 ? Math.round(duration) : null,
      rpe: num(at(row, idx.rpe)),
    };
    if (set.reps === null && set.durationS === null && set.distanceM === null && set.weightKg === null) {
      skippedRows += 1;
      continue;
    }
    exercise.sets.push(set);
  }

  return {
    workouts: workouts.filter((w) => w.exercises.some((e) => e.sets.length > 0)).map(({ rowKey: _k, ...w }) => w),
    skippedRows,
  };
}
