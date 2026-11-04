import { draftToInput, emptyDraft, normalizeRate, validateFields, type ProfileDraft } from './profileForm';

function filled(overrides: Partial<ProfileDraft> = {}): ProfileDraft {
  return { ...emptyDraft(), age: '25', heightCm: '180', weightKg: '80,5', ...overrides };
}

describe('formulario de perfil', () => {
  it('detecta campos vacíos y fuera de rango', () => {
    const errors = validateFields({ ...emptyDraft(), age: '', heightCm: '300', weightKg: '80' }, ['age', 'heightCm', 'weightKg']);
    expect(errors.age).toBe('Campo obligatorio');
    expect(errors.heightCm).toBeDefined();
    expect(errors.weightKg).toBeUndefined();
  });

  it('convierte el borrador en perfil con coma decimal', () => {
    const input = draftToInput(filled(), 123);
    expect(input.weightKg).toBe(80.5);
    expect(input.heightCm).toBe(180);
    expect(input.stepGoal).toBe(10000);
    expect(input.onboardingCompletedAt).toBe(123);
  });

  it('guarda en kg aunque se escriba en lb', () => {
    const input = draftToInput(filled({ weightUnit: 'lb', weightKg: '176,4' }), null);
    expect(input.weightKg).toBeCloseTo(80, 0);
  });

  it('ajusta el ritmo al cambiar de objetivo', () => {
    expect(normalizeRate('gain', 1)).toBe(0.25);
    expect(normalizeRate('lose', 0.5)).toBe(0.5);
  });
});
