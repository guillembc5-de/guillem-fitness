// Prueba tu clave de Gemini desde el PC, con la misma petición que hace la app.
//
//   $env:GEMINI_API_KEY = "tu clave"                  (solo en esta ventana de PowerShell)
//   node scripts/probar-gemini.mjs                    (usa el icono de la app: debe decir «sin comida»)
//   node scripts/probar-gemini.mjs "C:\ruta\plato.jpg" (con una foto de comida tuya)
//
// La clave no se guarda ni se muestra. Mantén estos modelos iguales que en
// src/features/nutrition/vision/gemini.ts.
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';

const MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];

/** Lee una línea sin mostrarla en pantalla, para que la clave no salga en capturas. */
async function askHidden(prompt) {
  process.stdout.write(prompt);
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    const rl = createInterface({ input: stdin, terminal: false });
    const line = await rl.question('');
    rl.close();
    process.stdout.write('\n');
    return line;
  }
  return new Promise((done) => {
    let text = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.off('data', onData);
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          done(text);
          return;
        }
        if (ch === '\u0003') process.exit(130); // Ctrl+C
        if (ch === '\u007f' || ch === '\b') text = text.slice(0, -1);
        else text += ch;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

/** Textos de ejemplo de las instrucciones: no son una clave. */
const looksLikePlaceholder = (k) => !k || k.includes('...') || k.includes('…') || /PEGA|tu clave/i.test(k);

let key = process.env.GEMINI_API_KEY?.trim() ?? '';
if (looksLikePlaceholder(key)) {
  key = (await askHidden('Pega tu clave de Gemini y pulsa Enter (no se verá en pantalla): ')).trim().replace(/^"|"$/g, '');
}
if (looksLikePlaceholder(key)) {
  console.error('No has pegado una clave. Cópiala de https://aistudio.google.com/apikey y vuelve a probar.');
  process.exit(1);
}
console.log(`Clave recibida (${key.length} caracteres)`);

const imagePath = resolve(process.argv[2] ?? 'assets/icon.png');
const mimeType = extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
const data = readFileSync(imagePath).toString('base64');

const schema = {
  type: 'object',
  properties: {
    food_detected: { type: 'boolean' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          grams: { type: 'number' },
          kcal: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
        },
        required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
      },
    },
  },
  required: ['food_detected', 'items'],
};

async function call(model, withSchema) {
  const started = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data } },
            { text: 'Analiza la comida de la foto. Responde SOLO con JSON: food_detected e items (name, grams, kcal, protein_g, carbs_g, fat_g). Si no hay comida, food_detected=false e items=[].' },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json', ...(withSchema ? { responseJsonSchema: schema } : {}) },
    }),
  });
  const body = await res.json().catch(() => null);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (!res.ok) return { ok: false, line: `HTTP ${res.status} en ${seconds} s → ${body?.error?.message ?? 'sin detalle'}` };
  const text = (body?.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? '').join('');
  return { ok: true, line: `OK en ${seconds} s → ${text.slice(0, 300)}` };
}

console.log(`Foto: ${imagePath}\n`);
let anyOk = false;
for (const model of MODELS) {
  for (const withSchema of [true, false]) {
    try {
      const r = await call(model, withSchema);
      console.log(`${r.ok ? '✅' : '❌'} ${model}${withSchema ? '' : ' (sin esquema)'}: ${r.line}`);
      if (r.ok) anyOk = true;
    } catch (e) {
      console.log(`❌ ${model}: sin conexión (${e instanceof Error ? e.message : e})`);
    }
  }
}
console.log(anyOk ? '\nTu clave funciona: la app usará el primer modelo con ✅.' : '\nNingún modelo ha funcionado: copia estas líneas y pásamelas.');
