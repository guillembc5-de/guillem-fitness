/**
 * Calculadora de calentamiento: series progresivas antes del peso de trabajo.
 * 40 % × 10, 60 % × 5 y 80 % × 3, redondeadas al disco más pequeño.
 */
export const WARMUP_STEPS = [
  { pct: 0.4, reps: 10 },
  { pct: 0.6, reps: 5 },
  { pct: 0.8, reps: 3 },
] as const;

export type WarmupSet = { weightKg: number; reps: number };

/**
 * @param workingKg peso de la primera serie de trabajo
 * @param minKg peso mínimo posible (la barra vacía, o 0 sin barra)
 * @param stepKg redondeo (2,5 kg con discos de 1,25 por lado)
 */
export function warmupSets(workingKg: number, minKg = 0, stepKg = 2.5): WarmupSet[] {
  if (!(workingKg > 0)) return [];
  const sets: WarmupSet[] = [];
  for (const { pct, reps } of WARMUP_STEPS) {
    const weightKg = Math.max(minKg, Math.round((workingKg * pct) / stepKg) * stepKg);
    // Sin series repetidas ni que igualen el peso de trabajo.
    if (weightKg >= workingKg) continue;
    if (sets.some((s) => s.weightKg === weightKg)) continue;
    sets.push({ weightKg, reps });
  }
  return sets;
}
