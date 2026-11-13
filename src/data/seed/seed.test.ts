import { EQUIPMENT, MUSCLE_GROUPS, TRACKING_TYPES } from '@/domain/enums';
import { matchesSearch, normalizeSearch } from '@/domain/text';

import { SEED_EXERCISES } from './exercises';
import { SEED_ROUTINES } from './routines';

describe('biblioteca de ejercicios', () => {
  it('tiene al menos 120 ejercicios', () => {
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(120);
  });

  it('ids, slugs y nombres únicos', () => {
    expect(new Set(SEED_EXERCISES.map((e) => e.id)).size).toBe(SEED_EXERCISES.length);
    expect(new Set(SEED_EXERCISES.map((e) => e.slug)).size).toBe(SEED_EXERCISES.length);
    expect(new Set(SEED_EXERCISES.map((e) => normalizeSearch(e.name))).size).toBe(SEED_EXERCISES.length);
  });

  it('ids con formato UUID', () => {
    for (const e of SEED_EXERCISES) expect(e.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('grupos, material y tipo válidos', () => {
    for (const e of SEED_EXERCISES) {
      expect(MUSCLE_GROUPS).toContain(e.muscleGroup);
      expect(EQUIPMENT).toContain(e.equipment);
      expect(TRACKING_TYPES).toContain(e.trackingType);
    }
  });

  it('cubre todos los grupos musculares', () => {
    const used = new Set(SEED_EXERCISES.map((e) => e.muscleGroup));
    for (const m of MUSCLE_GROUPS) expect(used).toContain(m);
  });
});

describe('rutinas precargadas', () => {
  it('las cuatro de Hevy y la del fisio', () => {
    expect(SEED_ROUTINES.map((r) => r.name)).toEqual(['lower 1', 'upper 1', 'lower 2', 'upper 2', 'RECUPERACIÓ CREUATS']);
    expect(SEED_ROUTINES.map((r) => r.exercises.length)).toEqual([8, 6, 8, 8, 9]);
  });

  it('ids únicos en todas las rutinas, ejercicios y series', () => {
    const ids = SEED_ROUTINES.flatMap((r) => [r.id, ...r.exercises.flatMap((e) => [e.id, ...e.sets.map((s) => s.id)])]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('solo usan ejercicios de la biblioteca', () => {
    const slugs = new Set(SEED_EXERCISES.map((e) => e.slug));
    for (const r of SEED_ROUTINES) for (const re of r.exercises) expect(slugs).toContain(re.exerciseSlug);
  });
});

describe('búsqueda', () => {
  it('ignora tildes, mayúsculas y orden de palabras', () => {
    const name = normalizeSearch('Jalón de tríceps en polea');
    expect(matchesSearch(name, 'TRICEPS')).toBe(true);
    expect(matchesSearch(name, 'polea jalon')).toBe(true);
    expect(matchesSearch(name, 'biceps')).toBe(false);
  });
});
