import { count, eq } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { exercise, routine, routineExercise, routineSet } from '@/data/db/schema';
import { normalizeSearch } from '@/domain/text';
import { now } from '@/lib/ids';

import { SEED_EXERCISES, seedExerciseId } from './exercises';
import { SEED_ROUTINES } from './routines';

/**
 * Carga la biblioteca de ejercicios y las rutinas de partida.
 * - Ejercicios: se insertan los que falten (id fijos, sin duplicar). Una
 *   consulta de recuento por arranque; solo escribe si hay novedades.
 * - Rutinas: solo si la tabla está vacía (si borras una, no vuelve).
 */
export function seedDatabase(db: Db): void {
  const timestamp = now();

  const libraryCount = db.select({ n: count() }).from(exercise).where(eq(exercise.isCustom, false)).get()?.n ?? 0;
  if (libraryCount < SEED_EXERCISES.length) {
    db.transaction((tx) => {
      for (const e of SEED_EXERCISES) {
        tx.insert(exercise)
          .values({
            id: e.id,
            createdAt: timestamp,
            updatedAt: timestamp,
            deletedAt: null,
            name: e.name,
            searchName: normalizeSearch(e.name),
            muscleGroup: e.muscleGroup,
            secondaryMuscles: '[]',
            equipment: e.equipment,
            trackingType: e.trackingType,
            defaultRestSeconds: null,
            isCustom: false,
            notes: null,
          })
          .onConflictDoNothing()
          .run();
      }
    });
  }

  const routineCount = db.select({ n: count() }).from(routine).get()?.n ?? 0;
  if (routineCount === 0) {
    db.transaction((tx) => {
      for (const r of SEED_ROUTINES) {
        tx.insert(routine)
          .values({ id: r.id, createdAt: timestamp, updatedAt: timestamp, deletedAt: null, name: r.name, position: r.position, notes: null })
          .run();
        for (const re of r.exercises) {
          tx.insert(routineExercise)
            .values({
              id: re.id,
              createdAt: timestamp,
              updatedAt: timestamp,
              deletedAt: null,
              routineId: r.id,
              exerciseId: seedExerciseId(re.exerciseSlug),
              position: re.position,
              restSeconds: re.restSeconds,
              notes: null,
            })
            .run();
          for (const s of re.sets) {
            tx.insert(routineSet)
              .values({
                id: s.id,
                createdAt: timestamp,
                updatedAt: timestamp,
                deletedAt: null,
                routineExerciseId: re.id,
                position: s.position,
                setType: s.setType,
                targetWeightKg: s.targetWeightKg,
                targetReps: s.targetReps,
                targetDurationS: null,
              })
              .run();
          }
        }
      }
    });
  }
}
