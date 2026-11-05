/**
 * @jest-environment node
 */
import { createGeminiProvider, GeminiHttpError, geminiModelCandidates, isModelUnavailable, isSchemaRejected, parseFoodAnalysis } from './gemini';
import { VisionError } from './types';

const FOOD = { food_detected: true, items: [{ name: 'Arroz', grams: 150, kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.5 }] };

function okBody(text: string) {
  return { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] };
}

type Call = { url: string; body: Record<string, unknown> };

function mockFetch(handler: (call: Call) => { status: number; json: unknown }) {
  const calls: Call[] = [];
  global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(url), body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown> };
    calls.push(call);
    const { status, json } = handler(call);
    return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return calls;
}

describe('modelos de Gemini', () => {
  it('el antiguo «gemini-flash-latest» se sustituye por los modelos actuales', () => {
    expect(geminiModelCandidates('gemini-flash-latest')).toEqual(['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  });

  it('un modelo elegido a mano va primero y no se repite', () => {
    expect(geminiModelCandidates(' gemini-3.8-flash ')).toEqual(['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']);
  });

  it('distingue «modelo no disponible» de «clave mala»', () => {
    expect(isModelUnavailable(new GeminiHttpError(404, 'models/x is not found for API version v1beta'))).toBe(true);
    expect(isModelUnavailable(new GeminiHttpError(429, 'Quota exceeded ... limit: 0, model: x'))).toBe(true);
    expect(isModelUnavailable(new GeminiHttpError(429, 'Quota exceeded ... limit: 20'))).toBe(false);
    expect(isModelUnavailable(new GeminiHttpError(403, 'This model is no longer available to new users'))).toBe(true);
    expect(isModelUnavailable(new GeminiHttpError(400, 'API key not valid. Please pass a valid API key.'))).toBe(false);
  });

  it('detecta un esquema rechazado', () => {
    expect(isSchemaRejected(new GeminiHttpError(400, 'Invalid JSON payload received. Unknown name "responseJsonSchema"'))).toBe(true);
    expect(isSchemaRejected(new GeminiHttpError(400, 'Image too large'))).toBe(false);
  });
});

describe('lectura de la respuesta', () => {
  it('acepta JSON envuelto en ```json y descarta las partes de «pensamiento»', () => {
    const body = { candidates: [{ content: { parts: [{ text: 'pensando…', thought: true }, { text: '```json\n' + JSON.stringify(FOOD) + '\n```' }] } }] };
    expect(parseFoodAnalysis(body)).toEqual(FOOD);
  });

  it('JSON roto → invalid_response', () => {
    expect(() => parseFoodAnalysis(okBody('no sé'))).toThrow(VisionError);
  });
});

describe('proveedor Gemini', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('si el modelo no está disponible, prueba el siguiente y lo recuerda', async () => {
    const calls = mockFetch(({ url }) =>
      url.includes('gemini-3.6-flash')
        ? { status: 404, json: { error: { message: 'models/gemini-3.6-flash is not found', status: 'NOT_FOUND' } } }
        : { status: 200, json: okBody(JSON.stringify(FOOD)) },
    );
    const provider = createGeminiProvider('clave', 'gemini-flash-latest');
    await expect(provider.analyze('AAAA')).resolves.toEqual(FOOD);
    expect(calls.map((c) => c.url.match(/models\/([^:]+)/)?.[1])).toEqual(['gemini-3.6-flash', 'gemini-3.8-flash']);

    await provider.analyze('AAAA');
    expect(calls.at(-1)?.url).toContain('gemini-3.8-flash'); // ya no reintenta el que falló
  });

  it('si un modelo está saturado (503), usa el siguiente', async () => {
    const calls = mockFetch(({ url }) =>
      url.includes('gemini-3.6-flash')
        ? { status: 503, json: { error: { message: 'This model is currently experiencing high demand.', status: 'UNAVAILABLE' } } }
        : { status: 200, json: okBody(JSON.stringify(FOOD)) },
    );
    await expect(createGeminiProvider('clave', 'gemini-3.6-flash').analyze('AAAA')).resolves.toEqual(FOOD);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toContain('gemini-3.8-flash');
  });

  it('si todos están saturados, error «servidor» (la foto se puede guardar para reintentar)', async () => {
    mockFetch(() => ({ status: 503, json: { error: { message: 'high demand', status: 'UNAVAILABLE' } } }));
    await expect(createGeminiProvider('clave', 'gemini-3.6-flash').analyze('AAAA')).rejects.toMatchObject({ kind: 'server' });
  });

  it('si Google rechaza el esquema, repite sin él con el mismo modelo', async () => {
    const calls = mockFetch(({ body }) => {
      const config = body.generationConfig as Record<string, unknown>;
      return 'responseJsonSchema' in config
        ? { status: 400, json: { error: { message: 'Invalid JSON payload received. Unknown name "responseJsonSchema"', status: 'INVALID_ARGUMENT' } } }
        : { status: 200, json: okBody(JSON.stringify(FOOD)) };
    });
    await expect(createGeminiProvider('clave', 'gemini-3.6-flash').analyze('AAAA')).resolves.toEqual(FOOD);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toContain('gemini-3.6-flash');
  });

  it('una clave mala no prueba otros modelos y dice que revises la clave', async () => {
    const calls = mockFetch(() => ({ status: 400, json: { error: { message: 'API key not valid.', status: 'INVALID_ARGUMENT' } } }));
    await expect(createGeminiProvider('mala', 'gemini-3.6-flash').analyze('AAAA')).rejects.toMatchObject({ kind: 'auth' });
    expect(calls).toHaveLength(1);
  });

  it('«Probar conexión» hace una petición real de texto', async () => {
    const calls = mockFetch(() => ({ status: 200, json: okBody('ok') }));
    await createGeminiProvider('clave', 'gemini-3.6-flash').testConnection();
    expect(calls[0]?.url).toMatch(/:generateContent$/);
  });
});
