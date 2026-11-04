# Guillem Fitness (GF) · Plan de la Fase 1

> Estado: **pendiente de aprobación**. No hay código todavía.
> Fecha: 4 de noviembre de 2026 · Expo SDK 58

---

## 0. Lo más importante: iPhone 12 + PC Windows

Compilar una app de iOS exige macOS y Xcode. No hay Mac, así que la vía **gratuita** es esta:

| Paso | Herramienta | Coste |
|---|---|---|
| Compilar el `.ipa` sin firmar | **GitHub Actions** (máquina macOS en la nube de GitHub) | Gratis. Hace falta una cuenta de GitHub, solo para compilar |
| Firmar e instalar en el iPhone desde Windows | **Sideloadly** + tu **Apple ID gratuito** | Gratis |
| Desarrollo diario (ver cambios al instante) | `expo start --dev-client` en el PC, iPhone en la misma Wi-Fi | Gratis |

**Limitaciones de la vía gratis (Apple, no mías):**

1. **La app caduca a los 7 días.** Hay que volver a firmarla con Sideloadly. Tiene un modo de refresco automático por Wi-Fi si el PC está encendido. **Los datos no se pierden al refrescar**, porque se reinstala sobre la misma app. Aun así, la exportación a JSON de Perfil es tu seguro.
2. Máximo 3 apps instaladas así a la vez. Usaremos 2: la de desarrollo y la final.
3. En el iPhone hay que activar el **Modo desarrollador** (Ajustes → Privacidad y seguridad). Es un único paso, documentado en el README.
4. **HealthKit con Apple ID gratuito no está garantizado.** En los foros de Apple hay casos que funcionan y casos en que el perfil gratuito no lo incluye. La app está diseñada para no depender de ello. Si HealthKit no está disponible, usa el podómetro del iPhone (CoreMotion), que es el **mismo sensor** que alimenta los pasos de Salud cuando no llevas Apple Watch. La diferencia es que CoreMotion solo guarda 7 días, y eso lo cubre la tabla `step_day`.
5. Las cuentas de GitHub en repositorio privado tienen un cupo mensual limitado de minutos de macOS, suficiente para unas pocas compilaciones al mes. Para no gastarlo, **meto todos los módulos nativos de golpe en la Fase 2**. Así una sola compilación de desarrollo sirve para las fases 2 a 5, porque los cambios de JavaScript llegan por Wi-Fi sin recompilar. Al final hago una compilación «release» que funciona sin el PC.

**Alternativa de pago (no la necesitas):** Apple Developer Program, 99 €/año. Con ella la app dura un año, se instala con TestFlight y compila con EAS sin GitHub Actions. Solo vale la pena si el refresco semanal te molesta.

> Ninguna de estas cuentas (GitHub, Apple ID, Google AI Studio) la usa la **app**: la app no tiene login ni nube. Son herramientas para compilarla y para obtener la clave de Gemini.

---

## 1. Arquitectura

```
┌──────────────── Pantallas (app/, Expo Router) ────────────────┐
│  solo usan hooks de features/ — nunca SQL ni Drizzle          │
└───────────────┬───────────────────────────────────────────────┘
                │ TanStack Query (caché + invalidación)
┌───────────────▼───────────── features/ ───────────────────────┐
│ workout · steps · nutrition · profile  (hooks + servicios)    │
│   steps/providers:  HealthKit │ HealthConnect │ Podómetro     │
│   nutrition/vision: NutritionVisionProvider → Gemini │ Claude │
└───────┬──────────────────────────────┬────────────────────────┘
        │ interfaces de repositorio    │ lógica pura
┌───────▼──────── data/repositories ┐ ┌▼──────── domain/ ─────────┐
│ ProfileRepo, ExerciseRepo,        │ │ 1RM, volumen, récords,    │
│ RoutineRepo, WorkoutRepo,         │ │ Mifflin-St Jeor, kcal/g,  │
│ StepDayRepo, MealRepo,            │ │ día local, rachas,        │
│ PendingPhotoRepo, BackupRepo      │ │ formato español           │
└───────┬───────────────────────────┘ └───────────────────────────┘
        │ implementación actual: SQLite (Drizzle)
┌───────▼──────── expo-sqlite + Drizzle ORM ─────────────────────┐
```

**Decisiones clave:**

- **Repositorios como interfaces.** Hoy hay una implementación `Sqlite*Repo`. Para conectar Supabase basta con crear `Supabase*Repo`, o una capa de sincronización, sin tocar las pantallas.
- **TanStack Query entre pantallas y repositorios**, no `useLiveQuery` de Drizzle, porque ese hook ataría las pantallas a Drizzle. Cada mutación invalida sus claves.
- **`domain/` es TypeScript puro**, sin React ni Expo. Es lo que cubren los tests unitarios.
- **Fechas:**
  - Los instantes se guardan como epoch ms en UTC.
  - Todo lo que se agrupa por día (comidas, pasos, entrenos) guarda además `local_date` (`AAAA-MM-DD`) calculado **en el momento de guardar** con la zona horaria del móvil.
  - Así, una comida a las 23:59 queda en su día aunque luego viajes o cambie la hora.
- **Temporizador de descanso:**
  - Se guarda `rest_ends_at` (marca de tiempo) en el entreno activo y se programa una notificación local para ese instante.
  - La pantalla calcula `restante = rest_ends_at − ahora`; no hay `setInterval` que se pare en segundo plano.
  - Si cierras la app a la fuerza, al reabrir el temporizador sigue donde debía.
- **Entreno activo persistente:**
  - Un entreno con `ended_at = null` es el entreno activo.
  - Cada cambio de serie se escribe en SQLite al instante.
  - Al arrancar, si hay un entreno activo, la app vuelve a él.
- **Una sola fuente de pasos por plataforma:**
  - Hay una interfaz `StepsProvider` y un `StepsService` que elige UNA fuente: HealthKit o Health Connect y, si no hay permiso, el podómetro.
  - Nunca se suman fuentes. Cada `step_day` guarda su `source`.
  - Detalle de iOS: **iOS no dice si denegaste el permiso de lectura de Salud**; simplemente devuelve 0. Para detectarlo comparo HealthKit con CoreMotion en las mismas horas: si Salud da 0 y el sensor da más de 0, asumo permiso denegado, cambio al sensor y te lo indico con un aviso y un botón «Reintentar».
- **Fotos de comida:**
  - Se redimensionan a 1024 px por el lado largo y se comprimen en JPEG al 70 % antes de enviarlas (de ~3 MB a ~150 KB).
  - El modelo responde con salida estructurada en JSON, que se valida con zod.
  - Si la validación falla, se hace 1 reintento; si vuelve a fallar, pasa a entrada manual.
  - Si no reconoce comida, la respuesta trae `{ "food_detected": false }` y la app lo dice.
- **Sin conexión:** si no hay red o falla la API, la foto se copia a la carpeta de la app y queda como **pendiente**. Desde «Pendientes» la reintentas o la pasas a mano.
- **Borrado suave:**
  - Ningún dato del usuario se borra físicamente. Los datos de prueba sí se borran físicamente, porque así lo pediste.
  - Borrar un ejercicio con historial solo pone `deleted_at`: desaparece de la biblioteca y de las rutinas.
  - Los entrenos pasados guardan `exercise_name_snapshot`, así que las gráficas y el historial siguen funcionando.
- **Arranque en menos de 2 s:**
  - Fuente del sistema (SF Pro), así que no se cargan fuentes.
  - Migraciones SQL embebidas.
  - Pantallas pesadas (gráficas) cargadas de forma diferida.
  - Splash nativo hasta que la base de datos esté lista.
- **Formato español:**
  - `Intl` con `es-ES` y semana desde el lunes (`weekStartsOn: 1`).
  - Detalle: `es-ES` no separa los miles en números de 4 cifras («10000»), así que fuerzo la agrupación para mostrar «10.000».
  - Los campos numéricos aceptan coma y punto.

---

## 2. Estructura de carpetas

```
guillem-fitness/
├─ app/                              # Expo Router (solo pantallas)
│  ├─ _layout.tsx                    # providers, splash, redirección a onboarding / entreno activo
│  ├─ onboarding/                    # primer arranque: datos → pasos → permisos → resumen
│  ├─ (tabs)/
│  │  ├─ _layout.tsx                 # barra inferior: Entreno · Pasos · Calorías · Perfil
│  │  ├─ entreno/  index · rutina/[id] · rutina/editar · historial · historial/[id]
│  │  ├─ pasos/    index · calendario · dia/[fecha] · permisos
│  │  ├─ calorias/ index · historial · pendientes
│  │  └─ perfil/   index · datos · ia · datos-app
│  ├─ entreno-activo.tsx             # modal a pantalla completa
│  ├─ ejercicios/  index · [id] · nuevo
│  └─ comida/      foto · revisar · manual
├─ src/
│  ├─ design/      tokens.ts · theme.ts · components/ (Button, Card, NumberField, Ring,
│  │               Sheet, ListRow, Chip, Stat, EmptyState, ErrorState, Skeleton, Toast)
│  ├─ domain/      oneRepMax · volume · records · calorieGoal · stepsEnergy · nutrition
│  │               · localDay · streak · format · parseNumber   (+ *.test.ts)
│  ├─ data/
│  │  ├─ db/       client.ts · schema.ts · migrations/ (generadas por drizzle-kit)
│  │  ├─ repositories/  interfaces.ts · sqlite/*.ts
│  │  ├─ seed/     exercises.es.ts (≥120) · routines.guillem.ts · demoData.ts
│  │  └─ backup/   exportJson.ts · importJson.ts · backupSchema.ts (zod)
│  ├─ features/
│  │  ├─ workout/    hooks · restTimer.ts · ActiveWorkout components
│  │  ├─ steps/      StepsService.ts · providers/{healthkit.ios, healthConnect.android, pedometer}.ts
│  │  ├─ nutrition/  vision/{NutritionVisionProvider, gemini, claude, schema}.ts · imagePrep.ts
│  │  └─ profile/
│  └─ lib/         secureStore · notifications · haptics · queryClient · uuid · clock
├─ plugins/        withoutPushEntitlement.js   # quita el permiso de push (no lo usamos y el Apple ID gratis no lo admite)
├─ .github/workflows/ios-build.yml            # compila el .ipa sin firmar (dev y release)
├─ app.config.ts · drizzle.config.ts · eslint.config.js · tsconfig.json (strict)
└─ README.md
```

---

## 3. Esquema de la base de datos

**Columnas comunes en TODAS las tablas:**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | TEXT PK | UUID v4 (`expo-crypto`) |
| `created_at` | INTEGER | epoch ms |
| `updated_at` | INTEGER | epoch ms; para «gana el último» al importar o sincronizar |
| `deleted_at` | INTEGER NULL | borrado suave |
| `is_demo` | INTEGER 0/1 | solo en tablas con datos de prueba; permite borrarlos sin tocar los tuyos |

### Tablas

**`profile`** (1 fila)
- `sex` ('male' | 'female')
- `birth_year`: guardo el año en vez de la edad para que se actualice sola.
- `height_cm`, `weight_kg`
- `activity_level` (sedentary | light | moderate | high | very_high)
- `goal` (lose | maintain | gain)
- `goal_rate_kg_week`
- `step_goal` (10000), `weight_unit` ('kg')
- `default_rest_seconds` (150)
- `ai_provider` ('gemini' | 'claude'), `gemini_model`, `claude_model`
- `onboarding_completed_at`

**`exercise`**
- `name`, `muscle_group`, `secondary_muscles` (JSON), `equipment`
- `tracking_type`:
  - `weight_reps`: kg × reps
  - `added_weight_reps`: «+KG», como tu hiperextensión
  - `reps_only`
  - `duration`
- `default_rest_seconds` NULL, `is_custom`, `notes`

**`routine`**
- `name`, `position` (para reordenar), `notes`

**`routine_exercise`**
- `routine_id` → routine, `exercise_id` → exercise
- `position`
- `rest_seconds` NULL: si está vacío, usa el del ejercicio y, si tampoco, el del perfil.

**`routine_set`**
- `routine_exercise_id` → routine_exercise
- `position`
- `set_type` ('normal' | 'warmup')
- `target_weight_kg`, `target_reps`, `target_duration_s`

**`workout`**
- `routine_id` NULL, `name`
- `started_at`, `ended_at` NULL: `ended_at` NULL significa entreno activo.
- `local_date`
- `rest_ends_at` NULL, `rest_notification_id` NULL
- `notes`

**`workout_exercise`**
- `workout_id` → workout, `exercise_id` → exercise
- `exercise_name_snapshot`
- `position`, `rest_seconds`

**`workout_set`**
- `workout_exercise_id` → workout_exercise
- `position`, `set_type`
- `weight_kg`, `reps`, `duration_s`
- `completed_at` NULL

**`step_day`**
- `local_date` (UNIQUE)
- `steps`, `distance_m`, `kcal`
- `source` ('healthkit' | 'health_connect' | 'pedometer' | 'demo')
- `goal_snapshot`: el objetivo de ese día, para que cambiarlo no recoloree el pasado.

**`meal`**
- `local_date`
- `meal_type` ('breakfast' | 'lunch' | 'snack' | 'dinner')
- `eaten_at`
- `source` ('photo' | 'manual')
- `photo_uri` NULL, `ai_provider` NULL

**`food_item`**
- `meal_id` → meal
- `name`, `grams`
- `kcal_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`
- `ai_estimated` (0/1), `position`

**`pending_photo`**
- `photo_uri`, `meal_type`, `local_date`, `captured_at`
- `status` ('pending' | 'failed'), `attempts`, `last_error`

**Relaciones:**

```
routine 1─N routine_exercise N─1 exercise
routine_exercise 1─N routine_set
workout 1─N workout_exercise N─1 exercise        (exercise puede estar borrado suave)
workout_exercise 1─N workout_set
meal 1─N food_item
```

**Datos que se calculan al consultar, sin tablas extra:**
- Totales de comida, volumen, 1RM y récords.
- Las consultas usan índices: `workout_set(workout_exercise_id)`, `workout_exercise(exercise_id)`, `workout(started_at)` y `meal(local_date)`.

**Alimentos guardados por cada 100 g:** al cambiar los gramos, las kcal y los macros se recalculan exactamente:

```
kcal = grams × kcal_per_100g / 100
```

**La clave de la API NO va en la base de datos:** va en `expo-secure-store`.

---

## 4. Pantallas

### Onboarding (solo en el primer arranque)

1. **Bienvenida**
2. **Tus datos:** sexo, edad, altura, peso, objetivo y ritmo.
3. **Nivel de actividad** «sin contar caminar», con ejemplos. Para tus 4 días de gimnasio sugiero **ligero (×1,375)**, porque los pasos se restan aparte.
4. **Objetivo de pasos:** 10.000, ya rellenado.
5. **Permiso de Salud:** para qué lo pido y botones «Permitir» y «Ahora no».
6. **Permiso de notificaciones:** para el aviso de fin de descanso.
7. **Resumen:** tu objetivo diario en kcal y cómo se calcula.

### Entreno

- **Inicio**
  - Banner «Entreno en curso · Reanudar», si lo hay.
  - Botón «Empezar entreno vacío».
  - Tus rutinas, que se reordenan arrastrando.
  - Cada rutina tiene un menú ⋯ con Editar, Duplicar y Borrar.
- **Detalle de rutina**
  - Gráfica de volumen, repeticiones o duración de los últimos 3 meses.
  - Ejercicios con sus series objetivo y descanso.
  - Botón «Empezar rutina».
- **Editor de rutina:** nombre, añadir ejercicios, series objetivo, tipo de serie, descanso por ejercicio y reordenar.
- **Biblioteca de ejercicios**
  - Buscador sin tildes («triceps» encuentra «Tríceps»).
  - Filtros por grupo muscular y material.
  - Botón «Crear ejercicio».
- **Detalle de ejercicio**
  - Gráficas: peso máximo, 1RM estimado (Epley) y volumen.
  - Récords destacados.
  - Historial de series.
- **Entreno activo** (modal): descrita en detalle más abajo.
- **Resumen al terminar:** duración, volumen, series y récords nuevos.
- **Historial:** lista por meses y detalle de cada entreno.

### Pasos

- **Hoy:** anillo de progreso, distancia, kcal estimadas, racha y la fuente de los datos (Salud o sensor).
- **Calendario mensual:** descrito en detalle más abajo.
- **Detalle de un día** (hoja inferior): pasos, objetivo, distancia, kcal y fuente.
- **Gráficas:** semana (barras L–D) y mes, con la línea del objetivo.
- **Permisos:** explicación, «Reintentar» y mensaje claro si los rechazas, con enlace a Ajustes.

### Calorías

- **Hoy:** descrita en detalle más abajo.
- **Foto:** cámara o galería → «Analizando…» → revisión.
- **Revisión:** cada alimento con nombre, gramos, kcal y macros, editables. Puedes borrar, añadir o elegir la comida del día antes de guardar. Aviso fijo: «Estimación de IA: revisa las raciones».
- **Manual:** nombre, gramos, kcal/100 g y macros, con autocompletado desde lo que ya has comido.
- **Pendientes:** fotos sin analizar, con botones «Reintentar» y «Pasar a mano».
- **Historial:** días con su total frente al objetivo.

### Perfil

- **Mis datos y objetivos:** recalcula el objetivo de kcal en vivo.
- **Unidades** y **descanso por defecto**.
- **IA:**
  - Proveedor (Gemini o Claude).
  - Clave de cada uno, guardada en secure-store y mostrada como `••••1234`.
  - Modelo.
  - Botón «Probar conexión».
- **Permisos:** estado de Salud y notificaciones, con «Reintentar».
- **Datos:**
  - Exportar JSON (hoja de compartir: AirDrop, Archivos, correo).
  - Importar JSON (fusiona por `id`; gana el `updated_at` más reciente).
  - Generar datos de prueba (2 años).
  - Borrar datos de prueba.

---

## 5. Librerías

Las versiones exactas las fija `npx expo install` para el SDK 58; aquí van las actuales de npm.

| Librería | Versión | Motivo |
|---|---|---|
| expo | 58.0.x | Base. TypeScript strict. |
| expo-router | 58.0.x | Navegación por archivos y pestañas. |
| expo-dev-client | 58.0.x | Development build (HealthKit no funciona en Expo Go). |
| expo-sqlite | 58.0.x | Base de datos local. |
| drizzle-orm / drizzle-kit | 0.45.x / 0.31.x | Esquema tipado y migraciones SQL generadas. |
| @tanstack/react-query | 5.105.x | Caché e invalidación entre repositorios y pantallas. |
| zod | 4.6.x | Validar el JSON de la IA y los backups importados. |
| @kingstinct/react-native-healthkit | 16.2.x | HealthKit moderno y mantenido, con tipos; requiere react-native-nitro-modules. |
| react-native-health-connect + expo-health-connect | 4.1.x / 0.1.x | Health Connect en Android (implementado, pero sin probar en dispositivo: tienes iPhone). |
| expo-sensors | 58.0.x | Podómetro de respaldo. |
| expo-notifications | 58.1.x | Notificación local de fin de descanso. |
| expo-haptics | 58.0.x | Vibración al completar serie y al terminar el descanso. |
| expo-secure-store | 58.0.x | Claves de API en el llavero de iOS. |
| expo-image-picker / expo-image-manipulator | 58.0.x | Foto o galería, y reducir a 1024 px con compresión. |
| expo-file-system / expo-sharing / expo-document-picker | 58.0.x | Fotos pendientes y exportar/importar JSON. |
| expo-crypto | 58.0.x | UUID v4. |
| @shopify/react-native-skia + victory-native | 2.14.x / 43.0.x | Gráficas fluidas en GPU con 2 años de datos; el mismo Skia dibuja los anillos. |
| react-native-reanimated | 4.7.x | Animaciones (anillos, temporizador, hojas). |
| @shopify/flash-list | 2.3.x | Listas largas fluidas (historial, biblioteca). |
| react-native-keyboard-controller | 1.22.x | Que el teclado no tape los campos de peso y repeticiones. |
| date-fns | 4.4.x | Fechas con locale `es` y semana desde el lunes. |
| zustand | 5.0.x | Solo estado de interfaz efímero (filtros, borradores); los datos van en SQLite. |
| jest-expo + @testing-library/react-native | 58.0.x | Tests. |
| eslint-config-expo + typescript-eslint | — | Lint con `no-explicit-any` como error. |

**Descartadas a propósito:**
- `react-native-calendars`: calendario propio, 42 celdas, control total del color y del lunes como primer día.
- SDKs de Gemini y Anthropic: uso `fetch` directo para tener menos dependencias y no necesitar polyfills de Node.
- Fuentes personalizadas: la del sistema es más legible y no penaliza el arranque.
- Google Fit: obsoleto.

**IA:**
- **Gemini:** modelo Flash de la capa gratuita, configurable en Perfil. El nombre exacto lo verifico en la Fase 5, porque Google lo cambia a menudo.
- **Claude:** Haiku 5.5, barato y con visión, configurable.
- Las dos cumplen la interfaz `NutritionVisionProvider.analyze(imageBase64) → Promise<FoodAnalysis>`.

---

## 6. Fórmulas (lo que verifican los tests)

- **1RM (Epley):** `peso × (1 + reps/30)`. Si reps = 1, el 1RM es el peso. Solo cuentan las series normales completadas con reps ≥ 1.
- **Volumen:** Σ `peso × reps` de las series normales completadas. **Los calentamientos (W) no cuentan** para volumen ni para récords.
- **Récords por ejercicio:** peso máximo, 1RM estimado máximo, mejor volumen en una serie y más repeticiones con un peso dado. Durante el entreno, la serie que bate un récord se marca 🏆 al completarla.
- **Objetivo calórico:**
  - Mifflin-St Jeor: `10·kg + 6,25·cm − 5·edad + 5` (hombre) o `− 161` (mujer).
  - Se multiplica por el factor de actividad (sin caminar).
  - Perder o ganar: ± `ritmo_kg_semana × 7700 / 7`.
  - Suelo de seguridad: nunca por debajo de 1500 kcal (hombre) o 1200 kcal (mujer).
- **Pasos → energía:**
  - Zancada = `altura × 0,415` (hombre) o `× 0,413` (mujer).
  - Distancia = `pasos × zancada`.
  - kcal netas ≈ `0,5 × kg × km`. Son kcal de caminar por encima del reposo, para no contarlo dos veces con el metabolismo basal.
- **Balance del día** (tu respuesta 5):

  ```
  Objetivo 2.250
    Comido   + 1.850   (verde)
    Pasos    −   260   (rojo)
  ─────────────────────
  Neto        1.590   →   Te quedan 660
  ```

  Restante = objetivo − comido + quemado por pasos.
- **Racha:** días seguidos con `steps ≥ goal_snapshot`, hasta hoy. Si hoy aún no lo has cumplido, la racha cuenta hasta ayer y no se rompe.
- **Día local:** `local_date` se calcula con la zona del móvil en el momento del registro. Test: 23:59 → día D; 00:01 → día D+1, también en los cambios de hora de marzo y octubre.

---

## 7. Tus rutinas (precargadas desde los vídeos de Hevy)

Entrenas 4 días: **lower · upper · lower · upper**. Precargo las dos rutinas con las series y los kilos que tenías como objetivo de partida.

**lower 1**

| Ejercicio | Descanso | Series (kg × reps) |
|---|---|---|
| Extensión de espalda (hiperextensión con peso) · +kg | — | W: 0 × 10, W: +10 × 10 |
| Extensión de pierna a una pierna | 2:30 | 30 × 10 · 35 × 4 · 30 × 9 |
| Curl de pierna sentado | 2:30 | 25 × 9 · 25 × 7 · 25 × 6 |
| Sentadilla hack (máquina) | 3:00 | 20 × 10 · 40 × 10 · 40 × 8 |
| Peso muerto rumano (barra) | 3:00 | 90 × 10 · 90 × 8 · 90 × 6 |
| Aducción de cadera (máquina) | 1:30 | 70 × 9 · 70 × 6 |
| Abducción de cadera (máquina) | 1:30 | 70 × 5 · 70 × 6 |
| Elevación de gemelos de pie (máquina) | 2:00 | 40 × 8 · 40 × 6 |

**upper 1**

| Ejercicio | Descanso | Series (kg × reps) |
|---|---|---|
| Press de pecho inclinado (máquina) | 2:30 | 60 × 7 · 60 × 5 · 60 × 4 · 50 × 8 |
| Jalón al pecho (polea) | 2:30 | 70 × 5 · 65 × 7 · 65 × 5 · 60 × 6 |
| Press de hombros (máquina de discos) | 2:30 | 60 × 8 · 60 × 5 |
| Elevación lateral a una mano (polea) | 2:30 | 15 × 10 · 15 × 10 |
| Extensión de tríceps en polea | 2:30 | 15 × 12 · 15 × 10 |
| Curl de bíceps (polea) | 2:30 | 40 × 8 · 40 × 7 |

Todos estos ejercicios estarán en la biblioteca de más de 120 ejercicios, con los mismos nombres para que los reconozcas.

---

## 8. Dirección visual

### Paleta

He ajustado la tuya por contraste:

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0B0B0C` | Fondo |
| `surface` | `#161618` | Tarjetas, filas |
| `surfaceRaised` | `#1E1E21` | Hojas inferiores, campos, fila de serie activa |
| `border` | `#26262A` | Separadores |
| `text` | `#F5F5F7` | Texto principal (18,6:1 sobre el fondo) |
| `textSecondary` | `#9A9AA0` | Texto secundario (6,5:1 sobre `surface`) ✅ AA |
| `textTertiary` | `#85858C` | Pistas y textos menores (corregido en la Fase 6: `#6E6E75` solo daba 3,3–3,9:1) |
| `accent` | `#DC2F33` | **Rellenos**: botón principal, anillo de progreso, barra del temporizador (corregido en la Fase 6: con `#E5383B` el texto blanco del botón daba 4,2:1; ahora 4,7:1) |
| `accentText` | `#FF5C5F` | **Texto rojo pequeño** (récords, «−260 kcal»): AA sobre todas las superficies. El test `src/design/contrast.test.ts` comprueba todos los pares |
| `onAccent` | `#FFFFFF` | Texto sobre rojo (5,2:1) |
| `success` | `#2BB673` | Serie completada, día cumplido, kcal comidas (+) |
| `warmup` | `#F5A524` | Series de calentamiento «W» y días con el objetivo al 50–99 % |

**Reglas de color:**
- El rojo se usa solo en el botón principal de cada pantalla, el progreso, los récords y las kcal quemadas.
- Un día sin cumplir en el calendario **no es rojo** (sería castigar): es gris.

### Tipografía

Se usa la fuente del sistema (SF Pro en iPhone) con **cifras tabulares**, para que los números no bailen al cambiar.

| Estilo | Tamaño / peso | Uso |
|---|---|---|
| `display` | 64 / Bold | Temporizador de descanso, pasos de hoy |
| `numberXL` | 40 / Bold | kcal restantes, totales |
| `title` | 28 / Bold | Título de pantalla |
| `numberField` | 24 / Semibold | **Campos de kg y reps en el entreno** |
| `headline` | 17 / Semibold | Nombre de ejercicio, cabeceras |
| `body` | 16 / Regular | Texto |
| `caption` | 13 / Medium | Etiquetas (SERIE, KG, REPS) |

### Espaciado y forma

- Escala de 4 pt: 4 · 8 · 12 · 16 · 24 · 32.
- Radios: 12 en tarjetas y 999 en píldoras.
- Mínimo táctil de 44 × 44; las filas de serie miden 56 pt de alto.
- Iconos: Ionicons (incluidos en Expo), de 24 pt con trazo fino.

### Pantalla 1 · Entreno activo

Es la que más importa: se usa con las manos ocupadas.

- **Cabecera fija:**
  - Nombre de la rutina y cronómetro total (`32:14`, en `headline`).
  - A la derecha, botón **Terminar** relleno en rojo.
- **Barra de descanso** (aparece al completar una serie):
  - Una franja bajo la cabecera con la cuenta atrás grande (`2:27`, 40 pt).
  - Una barra roja que se vacía.
  - Botones `−15 s`, `+15 s` y `Saltar`.
  - Al llegar a 0: vibración y notificación, aunque la app esté cerrada.
- **Cada ejercicio es una tarjeta:**
  - Nombre del ejercicio (`headline`) y menú ⋯ (cambiar descanso, quitar o sustituir).
  - Columnas `SERIE · ANTERIOR · KG · REPS · ✓`.
  - **ANTERIOR** muestra en gris lo que hiciste la última vez en esa serie («60 × 7»). Tocarlo copia esos valores.
  - Los campos KG y REPS son grandes (24 pt) y abren el teclado decimal, que acepta coma.
  - Si dejas un campo vacío, su pista muestra el objetivo de la rutina.
  - El botón ✓ ocupa 56 × 56 pt. Al tocarlo:
    - La fila se pinta en verde tenue (`success` al 15 %).
    - Vibra.
    - Se guarda en SQLite al instante.
    - Arranca el descanso.
    - Si es récord, aparece un 🏆 rojo junto a los kg.
  - Las series de calentamiento llevan una «W» ámbar en la columna SERIE. Tocar el número de serie alterna entre normal y calentamiento.
  - Al pie de la tarjeta, «+ Añadir serie». Deslizar una serie a la izquierda la borra.
- **Al final de la lista:** «+ Añadir ejercicio».
- Si cierras la app a la fuerza y la reabres, vuelves exactamente aquí, con el descanso en el segundo correcto.

### Pantalla 2 · Calendario de pasos

- **Arriba:**
  - Anillo de 200 pt con los pasos de hoy en `display` («7.842») y debajo «de 10.000».
  - El anillo es rojo mientras avanza y se vuelve verde al cumplir.
  - Bajo el anillo, tres datos en fila: **5,6 km · 196 kcal · 🔥 12 días**.
- **Selector** Semana | Mes | Calendario (píldoras).
- **En la vista Calendario:**
  - Cabecera «noviembre 2026» con flechas para cambiar de mes.
  - Rejilla **L M X J V S D**.
  - Cada día es un círculo de 40 pt con su número y relleno según cumplimiento:
    - Sin datos: transparente con borde.
    - Menos del 50 %: `surfaceRaised`.
    - 50–99 %: ámbar al 35 %.
    - 100 % o más: verde.
  - Hoy lleva un anillo blanco fino.
  - Al tocar un día se abre una hoja inferior con pasos, objetivo de ese día, distancia, kcal y fuente («Salud» o «Sensor del iPhone»).
- **Pie:** una línea pequeña con la fuente actual. Si es el sensor, se añade «Activar Salud para más historial».

### Pantalla 3 · Calorías de hoy

- **Bloque superior:**
  - «Te quedan» y debajo **660** grandes (`numberXL`), con «kcal» pequeño.
  - Debajo, el desglose en tres líneas alineadas a la derecha y con cifras tabulares:
    - `Objetivo 2.250`
    - `Comido +1.850` (verde)
    - `Pasos −260` (rojo, `accentText`)
  - Si te pasas del objetivo, «Te quedan» pasa a «Te has pasado» en texto blanco, sin dramatismo.
- **Tres barras finas de macros** (proteína, hidratos y grasa): gramos consumidos y objetivo, este último derivado del objetivo calórico (proteína 1,8 g/kg, grasa 25 %, el resto hidratos).
- **Comidas agrupadas:** Desayuno, Comida, Merienda y Cena. Cada una:
  - Es una tarjeta con su total de kcal.
  - Lista sus alimentos («Arroz blanco · 180 g · 234 kcal»).
  - Tiene un botón «+» para añadir a esa comida.
- **Botón flotante rojo** con icono de cámara. Al pulsarlo se abre una hoja con «Hacer foto», «Elegir de la galería» y «Añadir a mano».
- Si hay fotos pendientes, aparece un aviso ámbar: «2 fotos pendientes de analizar».

---

## 9. Riesgos y cómo los resuelvo

| Riesgo | Solución |
|---|---|
| Expo Go no carga HealthKit | Development build desde la Fase 2, compilado con GitHub Actions e instalado con Sideloadly |
| El Apple ID gratuito puede no incluir HealthKit | Respaldo automático con el podómetro y aviso visible; el calendario no se vacía gracias a `step_day` |
| expo-notifications añade el permiso de push y el Apple ID gratuito lo rechaza | Plugin `withoutPushEntitlement`: solo usamos notificaciones locales |
| iOS oculta si se denegó el permiso de lectura de Salud | Comparación de HealthKit con CoreMotion para detectarlo y cambiar al sensor |
| Datos perdidos si la app caduca y algo va mal | Exportar JSON desde Perfil, y recordatorio en el README de hacerlo cada semana |
| La IA devuelve JSON roto | Salida estructurada, validación con zod, 1 reintento y después entrada manual |
| Fotos de varios MB | 1024 px y JPEG al 70 % antes de enviarlas |
| El teclado tapa los campos | keyboard-controller con teclado decimal que acepta coma |
| Gráficas lentas con 2 años de datos | Agregar en SQL (un punto por entreno) y dibujar con Skia |

---

## 10. Plan de fases (resumen)

- **Fase 2 · Base**
  - Proyecto, design system, pestañas, base de datos y repositorios.
  - Onboarding y Perfil.
  - Todos los módulos nativos incluidos.
  - Workflow de GitHub Actions y README de instalación.
  - Primera instalación en tu iPhone.
- **Fase 3 · Entreno:** biblioteca, rutinas, entreno activo, temporizador, historial, gráficas y récords.
- **Fase 4 · Pasos:** proveedores, permisos, anillo, calendario, gráficas y racha.
- **Fase 5 · Calorías:** visión con Gemini y Claude, revisión, comida manual, resumen, historial y pendientes.
- **Fase 6 · Pulido:** estados vacíos, de carga y de error, accesibilidad, tests, rendimiento con datos de prueba, compilación release y README final.
