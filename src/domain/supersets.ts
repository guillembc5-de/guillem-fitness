/** Lo mínimo de un ejercicio para la lógica de superseries. */
export type SupersetMember = { id: string; supersetId: string | null };

/**
 * Letra de cada superserie (A, B, C…) por orden de aparición, para
 * distinguirlas en pantalla. Los ejercicios sueltos no llevan letra.
 * Una superserie de un solo ejercicio no cuenta.
 */
export function supersetLetters(exercises: readonly SupersetMember[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const e of exercises) if (e.supersetId) counts.set(e.supersetId, (counts.get(e.supersetId) ?? 0) + 1);
  const letters = new Map<string, string>();
  for (const e of exercises) {
    if (!e.supersetId || (counts.get(e.supersetId) ?? 0) < 2 || letters.has(e.supersetId)) continue;
    letters.set(e.supersetId, String.fromCharCode(65 + letters.size));
  }
  return letters;
}

/**
 * Descanso al terminar una serie. En una superserie solo se descansa después
 * del último ejercicio del grupo; entre los demás se pasa directo al siguiente.
 * Devuelve null si no toca descansar.
 */
export function restAfterSet(exerciseId: string, exercises: readonly (SupersetMember & { restSeconds: number })[]): number | null {
  const current = exercises.find((e) => e.id === exerciseId);
  if (!current) return null;
  if (!current.supersetId) return current.restSeconds;
  const group = exercises.filter((e) => e.supersetId === current.supersetId);
  if (group.length < 2) return current.restSeconds;
  const last = group[group.length - 1];
  return last?.id === exerciseId ? current.restSeconds : null;
}

/** El siguiente ejercicio de la superserie (para avisar «ahora: …»), o null. */
export function nextInSuperset<T extends SupersetMember>(exerciseId: string, exercises: readonly T[]): T | null {
  const current = exercises.find((e) => e.id === exerciseId);
  if (!current?.supersetId) return null;
  const group = exercises.filter((e) => e.supersetId === current.supersetId);
  const i = group.findIndex((e) => e.id === exerciseId);
  return group[(i + 1) % group.length] ?? null;
}
