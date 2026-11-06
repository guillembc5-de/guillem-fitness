/** Discos habituales de un gimnasio (kg), de mayor a menor. */
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const DEFAULT_BAR_KG = 20;

export type PlateCount = { plate: number; count: number };

export type PlateBreakdown = {
  /** Discos que van en CADA lado de la barra. */
  perSide: PlateCount[];
  /** Peso que se consigue con esos discos (barra incluida). */
  achievedKg: number;
  /** Lo que falta para llegar al objetivo (0 si es exacto). */
  remainderKg: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Qué discos poner en cada lado para llegar a un peso total. Empieza por el
 * disco más grande (así salen los menos discos posibles con los juegos
 * normales). Si el peso es menor que la barra, no lleva discos.
 */
export function plateBreakdown(totalKg: number, barKg: number = DEFAULT_BAR_KG, plates: readonly number[] = DEFAULT_PLATES_KG): PlateBreakdown {
  const sorted = [...new Set(plates.filter((p) => p > 0))].sort((a, b) => b - a);
  let perSideLeft = round2(Math.max(0, totalKg - barKg) / 2);
  const perSide: PlateCount[] = [];
  for (const plate of sorted) {
    const count = Math.floor((perSideLeft + 1e-9) / plate);
    if (count > 0) {
      perSide.push({ plate, count });
      perSideLeft = round2(perSideLeft - count * plate);
    }
  }
  const loaded = perSide.reduce((sum, p) => sum + p.plate * p.count, 0);
  const achievedKg = round2(barKg + loaded * 2);
  return { perSide, achievedKg, remainderKg: round2(Math.max(0, totalKg - achievedKg)) };
}
