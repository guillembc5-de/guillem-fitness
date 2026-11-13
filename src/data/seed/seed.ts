import { count, eq, isNull, max } from 'drizzle-orm';

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
 * - Rutinas: se insertan las que aún no existan por su id. Las borradas
 *   siguen en la tabla (marcadas), así que no vuelven. Si ya tienes
 *   rutinas, las nuevas van al final de la lista.
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

  const known = new Set(db.select({ id: routine.id }).from(routine).all().map((r) => r.id));
  const missing = SEED_ROUTINES.filter((r) => !known.has(r.id));
  if (missing.length > 0) {
    const lastPosition = known.size === 0 ? null : (db.select({ p: max(routine.position) }).from(routine).where(isNull(routine.deletedAt)).get()?.p ?? -1);
    db.transaction((tx) => {
      missing.forEach((r, i) => {
        const position = lastPosition === null ? r.position : lastPosition + 1 + i;
        tx.insert(routine)
          .values({ id: r.id, createdAt: timestamp, updatedAt: timestamp, deletedAt: null, name: r.name, position, notes: r.notes ?? null })
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
              notes: re.notes ?? null,
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
                targetDurationS: s.targetDurationS ?? null,
              })
              .run();
          }
        }
      });
    });
  }
}
