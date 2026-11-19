/**
 * @jest-environment node
 */
import { SqliteExerciseRepository } from '@/data/repositories/sqlite/exerciseRepository';
import { SqliteProfileRepository } from '@/data/repositories/sqlite/profileRepository';
import { SqliteRoutineRepository } from '@/data/repositories/sqlite/routineRepository';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite/workoutRepository';
import { seedExerciseId } from '@/data/seed/exercises';
import { seedDatabase } from '@/data/seed/seed';
import { workoutsKcal } from '@/domain/exerciseKcal';
import { parseHevyCsv } from '@/domain/hevy/hevyCsv';
import { createTestDb } from '@/test/testDb';

import { previewHevyImport, runHevyImport } from './hevyImport';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove: () => undefined }) }));

const HEADER = 'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe';
const U2 = '"upper 2","18 nov 2026, 16:24","18 nov 2026, 18:35",""';
const L2 = '"cintaa","15 nov 2026, 18:54","15 nov 2026, 20:05",""';
const U1 = '"upper 1","16 nov 2026, 17:18","16 nov 2026, 19:02",""';

/** Tres entrenos reales de tu Hevy (recortados). */
const rows = [
  HEADER,
  `${U2},"Mariposa (Pec Deck)",,"",0,"normal",15,15,,0,`,
  `${U2},"Mariposa (Pec Deck)",,"",1,"normal",20,7,,0,`,
  `${U2},"Jalón al Pecho (Cable)",,"",0,"normal",70,7,,0,`,
  `${U2},"Jalón de Tríceps en Polea",,"",0,"normal",22.5,7,,0,8.5`,
  `${U2},"Cinta",,"",0,"normal",,,3.16,1200,`,
  `${L2},"Cinta",,"",0,"normal",,,10.05,4256,`,
  `${U1},"Press de Banca (Barra)",,"",0,"normal",40,12,,0,`,
  `${U1},"Remo en Punta",,"",0,"normal",50,8,,0,`,
  `${U1},"Press Arnold (Mancuerna)",,"",0,"normal",14,10,,0,`,
];
const CSV = rows.join('\n');

async function setup() {
  const db = await createTestDb();
  seedDatabase(db);
  const repos = {
    exercises: new SqliteExerciseRepository(db),
    routines: new SqliteRoutineRepository(db),
    workouts: new SqliteWorkoutRepository(db),
    profile: new SqliteProfileRepository(db),
  };
  return repos;
}

describe('importar entrenos de Hevy', () => {
  it('la vista previa dice qué es nuevo y qué ejercicios se crearán', async () => {
    const repos = await setup();
    const preview = await previewHevyImport(parseHevyCsv(CSV), repos);
    expect(preview.counts).toEqual({ new: 3, updated: 0, same: 0, deleted: 0 });
    expect(preview.newExercises).toEqual(['Press Arnold (Mancuerna)']);
    expect(preview.from).toBe(new Date(2026, 10, 15, 18, 54).getTime());
    expect(preview.to).toBe(new Date(2026, 10, 18, 16, 24).getTime());
  });

  it('guarda los entrenos tal cual: series, kilos, RPE, cardio y nombres de Hevy', async () => {
    const repos = await setup();
    const result = await runHevyImport(await previewHevyImport(parseHevyCsv(CSV), repos), { updateRoutines: false }, repos);
    expect(result).toMatchObject({ inserted: 3, updated: 0, skipped: 0, createdExercises: ['Press Arnold (Mancuerna)'] });

    const list = await repos.workouts.list();
    expect(list.map((w) => w.name)).toEqual(['upper 2', 'upper 1', 'cintaa']);
    const upper2 = await repos.workouts.get(list[0]?.id ?? '');
    expect(upper2?.localDate).toBe('2026-11-18');
    expect(upper2?.exercises.map((e) => e.exerciseNameSnapshot)).toEqual(['Mariposa (Pec Deck)', 'Jalón al Pecho (Cable)', 'Jalón de Tríceps en Polea', 'Cinta']);
    expect(upper2?.exercises[0]?.exerciseId).toBe(seedExerciseId('contractor-pecho'));
    expect(upper2?.exercises[2]?.sets[0]).toMatchObject({ weightKg: 22.5, reps: 7, rpe: 8.5 });
    expect(upper2?.exercises[3]?.sets[0]).toMatchObject({ distanceM: 3160, durationS: 1200 });
    // «Remo en Punta» (nombre antiguo de Hevy) va al mismo ejercicio que «Remo en T».
    const upper1 = await repos.workouts.get(list[1]?.id ?? '');
    expect(upper1?.exercises[1]?.exerciseId).toBe(seedExerciseId('remo-t'));
    // Ya cuentan en la historia del ejercicio.
    expect((await repos.exercises.history(seedExerciseId('press-banca-barra'))).map((s) => s.weightKg)).toEqual([40]);
  });

  it('kcal: la cinta no suma (ya está en los pasos), las pesas sí', async () => {
    const repos = await setup();
    await runHevyImport(await previewHevyImport(parseHevyCsv(CSV), repos), { updateRoutines: false }, repos);
    const list = await repos.workouts.list();
    const cintaa = list.find((w) => w.name === 'cintaa');
    const upper2 = list.find((w) => w.name === 'upper 2');
    expect(cintaa?.cardioStepsS).toBe(4256);
    expect(workoutsKcal(cintaa ? [cintaa] : [], 80)).toBe(0);
    // upper 2: 131 min, 20 de cinta → 111 min de pesas = 3 × 80 × 1,85 h.
    expect(workoutsKcal(upper2 ? [upper2] : [], 80)).toBe(Math.round(3 * 80 * (111 / 60)));
  });

  it('importar el mismo archivo otra vez no duplica nada', async () => {
    const repos = await setup();
    await runHevyImport(await previewHevyImport(parseHevyCsv(CSV), repos), { updateRoutines: false }, repos);
    const again = await previewHevyImport(parseHevyCsv(CSV), repos);
    expect(again.counts).toEqual({ new: 0, updated: 0, same: 3, deleted: 0 });
    expect(again.newExercises).toEqual([]);
    const result = await runHevyImport(again, { updateRoutines: false }, repos);
    expect(result).toMatchObject({ inserted: 0, updated: 0, createdExercises: [] });
    expect(await repos.workouts.list()).toHaveLength(3);
  });

  it('si cambias un entreno en Hevy, se actualiza; si lo borras en la app, no vuelve', async () => {
    const repos = await setup();
    await runHevyImport(await previewHevyImport(parseHevyCsv(CSV), repos), { updateRoutines: false }, repos);
    const cintaa = (await repos.workouts.list()).find((w) => w.name === 'cintaa');
    await repos.workouts.softDelete(cintaa?.id ?? '');

    const edited = CSV.replace(`${U1},"Press de Banca (Barra)",,"",0,"normal",40,12`, `${U1},"Press de Banca (Barra)",,"",0,"normal",45,12`);
    const preview = await previewHevyImport(parseHevyCsv(edited), repos);
    expect(preview.counts).toEqual({ new: 0, updated: 1, same: 1, deleted: 1 });
    await runHevyImport(preview, { updateRoutines: false }, repos);

    const list = await repos.workouts.list();
    expect(list.map((w) => w.name)).toEqual(['upper 2', 'upper 1']);
    const upper1 = await repos.workouts.get(list[1]?.id ?? '');
    expect(upper1?.exercises[0]?.sets.map((s) => s.weightKg)).toEqual([45]);
    expect(upper1?.exercises).toHaveLength(3);
  });

  it('enlaza cada entreno con tu rutina del mismo nombre y, si quieres, la deja como tu último entreno', async () => {
    const repos = await setup();
    const result = await runHevyImport(await previewHevyImport(parseHevyCsv(CSV), repos), { updateRoutines: true }, repos);
    expect(result.routinesUpdated.sort()).toEqual(['upper 1', 'upper 2']);
    const upper2Routine = (await repos.routines.list()).find((r) => r.name === 'upper 2');
    const detail = await repos.routines.get(upper2Routine?.id ?? '');
    expect(detail?.exercises.map((e) => e.exercise.name)).toEqual(['Mariposa (Pec Deck)', 'Jalón al Pecho (Cable)', 'Jalón de Tríceps en Polea', 'Cinta']);
    expect(detail?.exercises[3]?.sets[0]).toMatchObject({ targetDistanceM: 3160, targetDurationS: 1200 });
    const workout = (await repos.workouts.list()).find((w) => w.name === 'upper 2');
    expect(workout?.routineId).toBe(upper2Routine?.id);
    // Una segunda importación sin entrenos nuevos no vuelve a tocar las rutinas.
    const again = await runHevyImport(await previewHevyImport(parseHevyCsv(CSV), repos), { updateRoutines: true }, repos);
    expect(again.routinesUpdated).toEqual([]);
  });
});
