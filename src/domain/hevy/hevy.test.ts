import { SEED_EXERCISES } from '@/data/seed/exercises';

import { normalizeSearch } from '../text';
import { parseHevyApiPage } from './hevyApi';
import { parseCsv, parseHevyCsv, parseHevyDate } from './hevyCsv';
import { guessExercise, hevyLibrarySlug } from './hevyExercises';
import { hevyExternalIds, hevySignature } from './hevyKey';

// TZ=Europe/Madrid (jest.config).

/** Tu upper 2 del 18/11/2026 y tu lower 1 del 19/10/2026, como los exporta la app de Hevy en castellano. */
const CSV = [
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"upper 2","18 nov 2026, 16:24","18 nov 2026, 18:35","","Mariposa (Pec Deck)",,"",0,"normal",15,15,,0,',
  '"upper 2","18 nov 2026, 16:24","18 nov 2026, 18:35","","Mariposa (Pec Deck)",,"",1,"normal",20,7,,0,',
  '"upper 2","18 nov 2026, 16:24","18 nov 2026, 18:35","","Mariposa (Pec Deck)",,"",2,"normal",20,6,,0,',
  '"upper 2","18 nov 2026, 16:24","18 nov 2026, 18:35","","Jalón de Tríceps en Polea",,"",0,"normal",20,10,,0,',
  '"upper 2","18 nov 2026, 16:24","18 nov 2026, 18:35","","Jalón de Tríceps en Polea",,"",1,"normal",22.5,7,,0,8.5',
  '"upper 2","18 nov 2026, 16:24","18 nov 2026, 18:35","","Cinta",,"",0,"normal",,,3.16,30,',
  '"lower 1","19 oct 2026, 19:23","19 oct 2026, 21:06","","Extensión de Espalda (Hiperextensión con peso)",,"lento\\ny controlado",0,"warmup",,10,,0,',
  '"lower 1","19 oct 2026, 19:23","19 oct 2026, 21:06","","Extensión de Espalda (Hiperextensión con peso)",,"lento\\ny controlado",1,"warmup",10,10,,0,',
  '"lower 1","19 oct 2026, 19:23","19 oct 2026, 21:06","","Peso Muerto Rumano (Barra)",1,"",0,"normal",90,10,,0,',
  '"lower 1","19 oct 2026, 19:23","19 oct 2026, 21:06","","Aducción de Cadera (Máquina)",1,"",0,"dropset",70,8,,0,',
].join('\r\n');

describe('fechas de Hevy', () => {
  it('formato de la app en castellano, catalán e inglés', () => {
    expect(parseHevyDate('18 nov 2026, 16:24')).toBe(new Date(2026, 10, 18, 16, 24).getTime());
    expect(parseHevyDate('1 set. 2026, 07:30')).toBe(new Date(2026, 8, 1, 7, 30).getTime());
    expect(parseHevyDate('1 Sept. 2026, 07:30')).toBe(new Date(2026, 8, 1, 7, 30).getTime());
    expect(parseHevyDate('5 de des. de 2026, 6:10')).toBe(new Date(2026, 11, 5, 6, 10).getTime());
  });

  it('formatos de la web e ISO', () => {
    expect(parseHevyDate('Sep 5, 2026, 6:10 PM')).toBe(new Date(2026, 8, 5, 18, 10).getTime());
    expect(parseHevyDate('05.09.2026, 06:10')).toBe(new Date(2026, 8, 5, 6, 10).getTime());
    expect(parseHevyDate('2026-11-18T15:24:15+00:00')).toBe(Date.UTC(2026, 10, 18, 15, 24, 15));
  });

  it('rechaza lo que no es una fecha', () => {
    expect(parseHevyDate('ayer por la tarde')).toBeNull();
    expect(parseHevyDate('31 feb 2026, 10:00')).toBeNull();
  });
});

describe('archivo CSV de Hevy', () => {
  it('respeta comillas, comas y saltos de línea dentro de un campo', () => {
    expect(parseCsv('a,"b, c","d ""e"""\n"f\ng",h\r\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['f\ng', 'h'],
    ]);
  });

  it('agrupa filas en entrenos, ejercicios y series', () => {
    const { workouts, skippedRows } = parseHevyCsv(CSV);
    expect(skippedRows).toBe(0);
    expect(workouts.map((w) => w.title)).toEqual(['upper 2', 'lower 1']);
    const [upper, lower] = workouts;
    expect(upper?.startedAt).toBe(new Date(2026, 10, 18, 16, 24).getTime());
    expect(upper?.endedAt).toBe(new Date(2026, 10, 18, 18, 35).getTime());
    expect(upper?.exercises.map((e) => [e.title, e.sets.length])).toEqual([
      ['Mariposa (Pec Deck)', 3],
      ['Jalón de Tríceps en Polea', 2],
      ['Cinta', 1],
    ]);
    expect(upper?.exercises[1]?.sets[1]).toEqual({ type: 'normal', weightKg: 22.5, reps: 7, distanceM: null, durationS: null, rpe: 8.5 });
    expect(upper?.exercises[2]?.sets[0]).toMatchObject({ distanceM: 3160, durationS: 30, weightKg: null, reps: null });
    // Calentamiento a peso corporal: el 0 sale vacío. Notas con «\n» de la app.
    expect(lower?.exercises[0]?.sets.map((s) => [s.type, s.weightKg, s.reps])).toEqual([
      ['warmup', null, 10],
      ['warmup', 10, 10],
    ]);
    expect(lower?.exercises[0]?.notes).toBe('lento\ny controlado');
    expect(lower?.exercises[2]?.sets[0]?.type).toBe('dropset');
    // Superserie: mismo superset_id → misma clave.
    expect(lower?.exercises[1]?.supersetKey).toBe(lower?.exercises[2]?.supersetKey);
    expect(lower?.exercises[1]?.supersetKey).not.toBeNull();
  });

  it('el mismo ejercicio dos veces seguidas son dos bloques (set_index vuelve a 0)', () => {
    const csv = [
      'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe',
      'A,"1 nov 2026, 10:00","1 nov 2026, 11:00",,Remo en T,,,0,normal,40,10,,,',
      'A,"1 nov 2026, 10:00","1 nov 2026, 11:00",,Remo en T,,,1,normal,40,8,,,',
      'A,"1 nov 2026, 10:00","1 nov 2026, 11:00",,Remo en T,,,0,normal,30,12,,,',
    ].join('\n');
    expect(parseHevyCsv(csv).workouts[0]?.exercises.map((e) => e.sets.length)).toEqual([2, 1]);
  });

  it('cuenta en libras y millas → kg y metros', () => {
    const csv = [
      'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_lbs,reps,distance_miles,duration_seconds,rpe',
      'A,"1 nov 2026, 10:00","1 nov 2026, 11:00",,Press de Banca (Barra),,,0,normal,220.46,5,,,',
      'A,"1 nov 2026, 10:00","1 nov 2026, 11:00",,Cinta,,,0,normal,,,1,600,',
    ].join('\n');
    const sets = parseHevyCsv(csv).workouts[0]?.exercises.map((e) => e.sets[0]);
    expect(sets?.[0]?.weightKg).toBe(100);
    expect(sets?.[1]?.distanceM).toBe(1609);
  });

  it('un archivo que no es de Hevy da un error claro', () => {
    expect(() => parseHevyCsv('nombre,calorías\nArroz,130')).toThrow('No es un archivo de entrenos de Hevy');
  });
});

describe('API de Hevy (Hevy Pro)', () => {
  // Respuesta real (recortada) de tu upper 2 del 18/11/2026.
  const page = {
    page: 1,
    page_count: 8,
    workouts: [
      {
        id: '0d790de5-66b4-45fa-829e-22dc2987e9d6',
        title: 'upper 2',
        description: '',
        start_time: '2026-11-18T15:24:15+00:00',
        end_time: '2026-11-18T17:35:58+00:00',
        updated_at: '2026-11-18T17:36:01.627Z',
        exercises: [
          {
            index: 0,
            title: 'Mariposa (Pec Deck)',
            notes: null,
            exercise_template_id: '9DCE2D64',
            superset_id: null,
            sets: [
              { index: 0, type: 'normal', weight_kg: 15, reps: 15, distance_meters: null, duration_seconds: null, rpe: null },
              { index: 1, type: 'normal', weight_kg: 20, reps: 7, distance_meters: null, duration_seconds: null, rpe: null },
              { index: 2, type: 'normal', weight_kg: 20, reps: 6, distance_meters: null, duration_seconds: null, rpe: null },
            ],
          },
          {
            index: 1,
            title: 'Jalón de Tríceps en Polea',
            notes: null,
            exercise_template_id: '93A552C6',
            superset_id: null,
            sets: [
              { index: 0, type: 'normal', weight_kg: 20, reps: 10, distance_meters: null, duration_seconds: null, rpe: null },
              { index: 1, type: 'normal', weight_kg: 22.5, reps: 7, distance_meters: null, duration_seconds: null, rpe: 8.5 },
            ],
          },
          {
            index: 2,
            title: 'Cinta',
            notes: null,
            exercise_template_id: '243710DE',
            superset_id: null,
            sets: [{ index: 0, type: 'normal', weight_kg: null, reps: null, distance_meters: 3160, duration_seconds: 30, rpe: null }],
          },
        ],
      },
      { id: 'roto', title: 'sin fecha', exercises: [] },
    ],
  };

  it('lee los entrenos y descarta los que no encajan', () => {
    const parsed = parseHevyApiPage(page);
    expect(parsed.pageCount).toBe(8);
    expect(parsed.workouts).toHaveLength(1);
    expect(parsed.workouts[0]?.exercises.map((e) => e.templateId)).toEqual(['9DCE2D64', '93A552C6', '243710DE']);
  });

  it('el mismo entreno por archivo o por API tiene el mismo id y la misma huella', () => {
    const fromApi = parseHevyApiPage(page).workouts[0];
    const fromCsv = parseHevyCsv(CSV).workouts[0];
    if (!fromApi || !fromCsv) throw new Error('faltan entrenos');
    expect(hevyExternalIds([fromApi])).toEqual(hevyExternalIds([fromCsv]));
    expect(hevySignature(fromApi)).toBe(hevySignature(fromCsv));
  });
});

describe('identificadores', () => {
  it('dos entrenos con el mismo nombre en el mismo minuto no se pisan', () => {
    const w = { title: 'upper 1', startedAt: 1_000_000, endedAt: 2_000_000, description: null, exercises: [] };
    const ids = hevyExternalIds([w, { ...w }, { ...w, startedAt: 9_000_000 }]);
    expect(new Set(ids).size).toBe(3);
    expect(ids[1]).toBe(`${ids[0]}#2`);
  });

  it('si cambia una serie, cambia la huella', () => {
    const [w] = parseHevyCsv(CSV).workouts;
    if (!w) throw new Error('falta');
    const edited = { ...w, exercises: w.exercises.map((e, i) => (i === 0 ? { ...e, sets: e.sets.map((s) => ({ ...s, reps: 99 })) } : e)) };
    expect(hevySignature(edited)).not.toBe(hevySignature(w));
  });
});

describe('ejercicios de tu Hevy → biblioteca de la app', () => {
  const library = new Map(SEED_EXERCISES.map((e) => [normalizeSearch(e.name), e.slug]));
  const slugs = new Set(SEED_EXERCISES.map((e) => e.slug));
  const resolve = (title: string) => hevyLibrarySlug(title, null) ?? library.get(normalizeSearch(title)) ?? null;

  // Todos los nombres con que han salido tus ejercicios en Hevy (marzo–noviembre 2026).
  const YOURS = [
    'Mariposa (Pec Deck)', 'Jalón al Pecho (Cable)', 'Press de Pecho Inclinado (Máquina)', 'Jalón al Pecho - Agarre Cerrado (Cable)',
    'Press de Hombros (Máquina de Discos)', 'Elevación Lateral a un Brazo (Cable)', 'Jalón de Tríceps en Polea', 'Curl de Bíceps (Cable)',
    'Cinta', 'Press de Banca (Barra)', 'Remo Sentado con Cable - Agarre Abierto', 'Elevación Lateral (Mancuerna)', 'Vuelos Posteriores (Máquina)',
    'Extensiones a Una Pierna', 'Curls de Piernas de Pie', 'Sentadilla Péndulo (Máquina)', 'Elevación de Gemelos de Pie (Máquina)',
    'Press de Banca Inclinado (Máquina Smith)', 'Press de Banca (Mancuerna)', 'Remo en T', 'Vuelos Posteriores a Un Brazo (Cable)',
    'Curl de Pierna Sentado', 'Sentadilla Hack (Máquina)', 'Peso Muerto Rumano (Barra)', 'Bicicleta', 'Curl Martillo (Mancuerna)',
    'Press de Banca (Máquina Smith)', 'Curl predicador (máquina)', 'Press de Piernas', 'Aducción de Cadera (Máquina)', 'Abducción de Cadera (Máquina)',
    'Extensión de Espalda (Hiperextensión con peso)', 'Press de Pecho Iso-Lateral (Máquina)', 'Remo Inclinado (Barra)', 'Vuelos Posteriores (Mancuerna)',
    'Press de Pecho (Máquina)', 'Sentadilla (Barra)', 'Press de Hombros  (Mancuerna)', 'Elevacion Laterales (Mancuerna)', 'Tríceps con Polea',
    'Cables Cruzados', 'Remo en Punta', 'Curl de Bíceps (Mancuerna)', 'Abdominal Corto', 'Aducción de Caderas', 'Abducción de Caderas', 'Correr',
    'Empuje de Caderas (Barra)', 'Curl Martillo (Cable)', 'Press de Hombros Sentado (Barra)', 'Sentadilla Búlgara', 'Extension de Pantorrilla (Máquina)',
    'Press de Piernas Sentado', 'Remo Sentado con Cable', 'Tirón a la Cara', 'Curl de Bíceps (Barra)',
    'Single Leg Extensions', 'Standing Leg Curls', 'Leg Press Horizontal (Machine)', 'Romanian Deadlift (Barbell)', 'Hip Adduction (Machine)',
    'Hip Abduction (Machine)', 'Hip Thrust (Barbell)', 'Cycling', 'Incline Chest Press (Machine)', 'T Bar Row', 'Lat Pulldown (Cable)',
    'Chest Press (Machine)', 'Shoulder Press (Machine Plates)', 'Single Arm Lateral Raise (Cable)', 'Face Pull', 'Triceps Pushdown',
    'Bicep Curl (Cable)', 'Leg Extension (Machine)', 'Seated Leg Curl (Machine)',
  ];

  it.each(YOURS)('«%s» va a un ejercicio de la biblioteca', (title) => {
    const slug = resolve(title);
    expect(slug).not.toBeNull();
    expect(slugs.has(slug ?? '')).toBe(true);
  });

  it('el mismo ejercicio con su nombre antiguo, nuevo o en inglés va al mismo sitio', () => {
    expect(resolve('Tríceps con Polea')).toBe(resolve('Jalón de Tríceps en Polea'));
    expect(resolve('Triceps Pushdown')).toBe(resolve('Jalón de Tríceps en Polea'));
    expect(resolve('Remo en Punta')).toBe(resolve('Remo en T'));
    expect(hevyLibrarySlug('Nombre cualquiera', '93A552C6')).toBe('jalon-triceps-polea');
  });

  it('adivina un ejercicio que la app no conoce', () => {
    expect(guessExercise('Press Arnold (Mancuerna)', [{ type: 'normal', weightKg: 14, reps: 10, distanceM: null, durationS: null, rpe: null }])).toEqual({
      muscleGroup: 'shoulders',
      equipment: 'dumbbell',
      trackingType: 'weight_reps',
      cardioKind: null,
    });
    expect(guessExercise('Caminar en Pendiente', [{ type: 'normal', weightKg: null, reps: null, distanceM: 2000, durationS: 1200, rpe: null }])).toMatchObject({
      muscleGroup: 'cardio',
      trackingType: 'distance_duration',
      cardioKind: 'steps',
    });
    expect(guessExercise('Bici de Spinning', [{ type: 'normal', weightKg: null, reps: null, distanceM: null, durationS: 1800, rpe: null }])).toMatchObject({
      cardioKind: 'machine',
    });
  });
});
