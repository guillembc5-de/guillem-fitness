# Guillem Fitness (GF)

App personal para iPhone con tres módulos: **entreno** al estilo Hevy, **pasos** con calendario y **calorías** estimadas a partir de fotos.
Todo se guarda en el móvil: sin cuentas, sin nube y sin anuncios.

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Plan (`docs/PLAN.md`) | ✅ |
| 2 | Base: design system, pestañas, base de datos, onboarding y Perfil | ✅ |
| 3 | Entreno: 143 ejercicios, rutinas, entreno activo, descanso, historial, gráficas y récords | ✅ |
| 4 | Pasos: anillo, calendario, gráficas semana/mes, racha y permisos | ✅ |
| 5 | Calorías: foto → IA → revisión, entrada manual, resumen diario, historial y pendientes | ✅ |
| 6 | Pulido: exportar/importar JSON, datos de prueba, contraste AA verificado, arranque más ligero | ✅ |
| 7 | Entreno como Hevy, kcal de entrenos, fotos que aprenden de tus correcciones, Salud con Atajos | ✅ (sin probar en el iPhone) |
| 8 | Menú «⋮» del ejercicio como Hevy, lower 2, upper 2, RECUPERACIÓ CREUATS, icono de Goku, Atajo en catalán | ✅ (sin probar en el iPhone) |
| 9 | Datos de Fitness: energía activa, minutos de ejercicio y entrenos del Watch | ✅ (sin probar en el iPhone) |
| 10 | Galería de platos: fotos de comida guardadas para repetirlas y afinar las estimaciones | ✅ (sin probar en el iPhone) |
| 11 | Entrenos de Hevy en la app (archivo gratis o API Pro), nombres de ejercicio de Hevy, cardio con km y tiempo | ✅ (sin probar en el iPhone) |

**Pendiente de comprobar en el iPhone real** (no se puede probar sin Mac ni móvil): la primera compilación (en GitHub o en el Mac), HealthKit con Apple ID gratuito, las notificaciones con la app cerrada y la llamada real a Gemini o Claude. Si algo falla, el error de GitHub Actions o una captura bastan para arreglarlo.

---

## Lo que hace la app

- **Entreno** (las funciones del apartado de entreno de Hevy):
  - 152 ejercicios en español (buscador sin tildes, filtros por músculo y material, ejercicios propios). Tus rutinas precargadas: **lower 1, upper 1, lower 2, upper 2** (copiadas de tus vídeos de Hevy) y **RECUPERACIÓ CREUATS** (la pauta del fisio; lo que la pizarra no dice va vacío). Si ya tenías la app, las que falten se añaden al final al abrirla; las que borres no vuelven.
  - **Rutinas** en **carpetas**, con notas por ejercicio, superseries, descanso por ejercicio y series objetivo. Duplicar, ordenar, mover de carpeta.
  - **Entreno en vivo:** cronómetro, volumen y series en directo; columna «Anterior» (de cualquier entreno o de la misma rutina); tipos de serie **normal, calentamiento (W), drop set (D) y al fallo (F)**; **RPE** opcional; **superseries** (el descanso llega tras el último ejercicio del grupo); **notas** del entreno y nota fija del ejercicio; menú **«⋮»** del ejercicio como el de Hevy (**reordenar ejercicios**, **reemplazar**, **agregar a superserie**, **eliminar**, y además calentamiento, discos y descanso); **calculadora de discos**; **series de calentamiento** automáticas; **cronómetro** en ejercicios por tiempo; aviso y vibración al batir un **récord** (1RM, peso, volumen o repeticiones); pantalla siempre encendida.
  - Descanso automático con aviso aunque la app esté cerrada. Si cierras la app a la fuerza, vuelves al mismo punto.
  - Al terminar, si cambiaste la rutina, pregunta si **actualizarla**. Resumen con nº de entreno, racha semanal y récords.
  - **Historial** en lista, **calendario** y **estadísticas** (entrenos, volumen y duración por semana; series por músculo). Cada entreno se puede **editar** (series, nombre, nota, fecha, hora y duración), **repetir** o **guardar como rutina**.
  - **Entrenos de Hevy** (Perfil → Hevy, o el icono ⇄ en Entreno): se importan tal cual (series, kilos, reps, tipo de serie, RPE, notas, superseries y cardio con km y tiempo) y cuentan en Calorías, historial y récords.
    - **Gratis, con un archivo:** en Hevy, Perfil → Ajustes → Exportar e importar datos → Exportar entrenos → Guardar en Archivos; en la app, «Elegir archivo de Hevy». Antes de guardar enseña qué es nuevo, qué cambió y qué ejercicios se crearán. Se puede repetir cuando quieras: lo que ya estaba no se duplica, lo cambiado en Hevy se actualiza y lo borrado en la app no vuelve.
    - **Automático, solo con Hevy Pro (de pago, ~2,99 $/mes):** pegando la clave de la API (hevy.com → Ajustes → Desarrollador) se sincroniza al abrir Entreno. La clave va al llavero del iPhone, nunca al código.
    - Opción «Actualizar mis rutinas»: como en Hevy, cada rutina queda como tu último entreno con ella.
    - Los ejercicios que usas en Hevy tienen en la app su mismo nombre (también los nombres antiguos o en inglés de tu historial van al ejercicio correcto). Uno que la app no conozca se crea con su nombre de Hevy.
    - Kcal: la cinta y correr no suman como entreno (ya están en los pasos); bici, elíptica y remo sí (MET 7); el resto, como pesas.
  - Ajustes en Perfil → Entreno: RPE, discos y barra, «Anterior», avisos de récord y pantalla encendida.
  - No incluye lo que necesita servidores o contenido de Hevy: vídeos de ejercicios, programas para descargar, parte social ni fotos en los entrenos.
- **Pasos:** anillo del día, km, kcal y racha; semana, mes y calendario por colores; una sola fuente (Salud o, si no hay permiso, el sensor del iPhone). Si la instalación no puede leer Salud, un **Atajo** te trae los pasos de Salud y del Apple Watch (Perfil → Salud con Atajos).
  - **Fitness:** energía activa (anillo Moverse) y minutos de ejercicio (anillo Ejercicio) llegan por el mismo Atajo (`&energia=…&ejercicio=…`) o, si Salud directo funciona, solos. Los **entrenos del Watch** (correr, caminar, bici…) solo llegan con Salud directo; por el Atajo no se pueden leer bien, pero sus calorías ya van dentro de la energía activa. Se ven en Pasos y en el detalle de cada día del calendario.
- **Calorías:** foto → la IA estima → tú corriges → guardas. También a mano. Resumen con lo comido en verde (+) y lo quemado en rojo (−): **pasos y entrenos** por separado (o, si el Apple Watch mide más, una sola línea «Actividad (Fitness)»: se usa la mayor cifra y nunca se suman), macros, comidas del día, historial y fotos pendientes si no hay conexión.
  - **Kcal de un entreno** = (MET 4 − 1) × tu peso × horas: lo extra sobre el reposo, como con los pasos (por ejemplo, 75 min con 80 kg ≈ 300 kcal). Un entreno olvidado abierto cuenta 3 h como máximo.
  - Por eso el **nivel de actividad** del perfil describe ahora solo tu día a día, sin caminar ni gimnasio. **Revísalo en Perfil → Datos y objetivos.**
  - **Galería de platos** (icono de imágenes en Calorías, o «Añadir comida → Repetir un plato guardado»): todas las comidas guardadas con foto, con los valores que confirmaste. Buscar por alimento, ordenar por recientes o más repetidos. Cada plato se puede **añadir a hoy** (revisas los gramos y guardas) o **corregir**. Al analizar una foto nueva, si la IA ve alimentos parecidos a un plato guardado, la app te lo propone («¿Es uno de tus platos guardados?») y con un toque usas tus valores en vez de la estimación. Las fotos viven solo en el iPhone (≈150 KB cada una) y **no van en la copia de seguridad JSON**: si borras la app, se pierden; al reinstalar encima con Sideloadly, se conservan.
  - **Las fotos mejoran con el uso:** la app recuerda los alimentos que guardas con tus valores, se los pasa a la IA junto a la foto y, si la IA suele quedarse corta o pasarse con las raciones, lo corrige sola. La IA no se reentrena: aprende la app, de tus correcciones. Se puede borrar en Perfil → Análisis de fotos.
- **Perfil:** datos y objetivos, clave de la IA con «Probar conexión», copia de seguridad en JSON y datos de prueba.

## Uso diario: tres consejos

1. **Exporta una copia cada semana** (Perfil → Copia de seguridad y datos de prueba → Exportar). Guárdala en Archivos o en tu correo. Con el Apple ID gratuito la app caduca cada 7 días; tus datos no se pierden al refrescarla, pero la copia es tu seguro.
2. **Refresca la app antes de que caduquen los 7 días**: con Sideloadly (Opción A, paso A6) o con un comando desde el Mac (Opción B, paso B5).
3. **Abre la app al menos una vez cada pocos días** si usas el sensor en vez de Salud: el sensor solo recuerda 7 días. Con el Atajo de Salud (Perfil → Salud con Atajos), cada vez que abres la app se traen los pasos del día.

---

## Cómo instalarla en tu iPhone: elige opción

Las dos opciones son gratis y usan tu Apple ID normal.

| | **A · Desde Windows** | **B · Desde un Mac** |
|---|---|---|
| Quién compila | Un Mac de GitHub (en la nube) | Tu Mac |
| Quién instala | Sideloadly en tu PC | El propio Mac, con un comando |
| Tiempo por compilación | 35–50 min (cupo de ~4–5 al mes) | Unos minutos, sin cupo |
| Necesitas | Cuenta de GitHub, iTunes, Sideloadly | Xcode y Node.js |
| HealthKit | Puede fallar al firmar | Más probable que funcione (no garantizado) |
| **Caduca cada 7 días** | **Sí** | **Sí** |
| Tus datos al refrescar | Se conservan | Se conservan |

> **Lo que no cambia con el Mac: la app caduca cada 7 días igualmente.** Es un límite de Apple para cualquier Apple ID gratuito, no depende del ordenador. Al caducar, la app no se abre hasta que la vuelves a instalar, pero **tus datos no se pierden**.
>
> Otros límites del Apple ID gratuito: máximo 3 apps instaladas así a la vez y 10 identificadores de app nuevos por semana (GF usa 2: «GF Dev» y «Guillem Fitness»).

> **Opción C · Sin caducidad semanal (de pago):** el Apple Developer Program (99 €/año) hace que la instalación dure un año y permite TestFlight. Con él ni siquiera hace falta un Mac: la app se compila en la nube de Expo. Si algún día lo quieres, pídemelo y preparo la configuración.

---

## Opción A · Instalar desde Windows (sin Mac)

Compilar para iPhone exige un Mac. Sin él, **un Mac de GitHub compila la app** y **Sideloadly la instala** desde tu PC.

### Lo que necesitas (una sola vez)

1. **Git para Windows.** Abre PowerShell y ejecuta:
   ```bash
   winget install --id Git.Git -e
   ```
   Después **cierra PowerShell y ábrelo de nuevo**; si no, no reconoce el comando `git`.
2. **Una cuenta gratuita de GitHub** en [github.com](https://github.com). Solo sirve para compilar; la app no la usa.
3. **iTunes e iCloud descargados de la web de Apple**, no de la Microsoft Store (Sideloadly lo necesita así):
   - [apple.com/itunes](https://www.apple.com/itunes/)
   - iCloud para Windows desde la web de Apple
4. **Sideloadly** desde su web oficial, [sideloadly.io](https://sideloadly.io).
5. **El cable USB** del iPhone.

### A1 · Subir el proyecto a GitHub (repositorio privado)

1. En GitHub, pulsa **New repository**. Ponle de nombre `guillem-fitness`, márcalo como **Private** y no añadas ningún archivo.
2. Solo la primera vez que usas Git en este PC, dile quién eres (cualquier nombre; el correo puede ser el de GitHub):
   ```bash
   git config --global user.name "Guillem"
   ```
   ```bash
   git config --global user.email "TU_CORREO"
   ```
3. En PowerShell, entra en la carpeta del proyecto:
   ```bash
   cd "$HOME\Downloads\fabrica-videos\guillem-fitness"
   ```
4. Ejecuta estos comandos uno a uno. Sustituye `TU_USUARIO` por tu usuario de GitHub:
   ```bash
   git init
   ```
   ```bash
   git add .
   ```
   ```bash
   git commit -m "Fase 2: base"
   ```
   ```bash
   git branch -M main
   ```
   ```bash
   git remote add origin https://github.com/TU_USUARIO/guillem-fitness.git
   ```
   ```bash
   git push -u origin main
   ```
   La primera vez, Git abre el navegador para que inicies sesión en GitHub.

> Ninguna clave de API va en el repositorio: se escriben dentro de la app y se guardan en el llavero del iPhone.

### A2 · Compilar la app en GitHub

1. En tu repositorio, abre la pestaña **Actions** → **Compilar iOS** → **Run workflow**.
2. Elige **development** y deja marcado **Incluir HealthKit**. Pulsa **Run workflow**.
3. Tarda unos **35–50 minutos** (usa un Mac Intel: los M1 gratuitos de GitHub suelen estar sin plaza).
4. Cuando termine, abre la ejecución y descarga el artefacto **GuillemFitness-development**. Es un `.zip` que contiene `GuillemFitness-development.ipa`. Descomprímelo.

> **Cupo gratuito de GitHub:**
> - En repositorios privados hay 2.000 minutos al mes, pero los de Mac cuentan ×10. Eso son unos 200 minutos reales, **unas 4–5 compilaciones al mes**. Si una compilación no llega a arrancar porque no hay Mac libre, no gasta minutos.
> - Sin método de pago, GitHub no cobra: simplemente para al agotarse el cupo.
> - La versión de desarrollo **solo hay que recompilarla si cambian los módulos nativos**; ya están todos incluidos desde esta fase.

### A3 · Instalar con Sideloadly

1. Conecta el iPhone por cable al PC. Desbloquéalo y pulsa **Confiar** en este ordenador.
2. Abre Sideloadly:
   - Arrastra el `.ipa` a la ventana.
   - Escribe tu Apple ID.
   - Pulsa **Start**.
3. Te pedirá la contraseña de tu Apple ID y, si tienes verificación en dos pasos, el código. Lo escribes tú en Sideloadly; se envía solo a Apple.

### A4 · Permitir la app en el iPhone (solo la primera vez)

1. Ve a **Ajustes → Privacidad y seguridad → Modo de desarrollador** y actívalo. El iPhone se reinicia; al volver, confirma **Activar**.
2. Ve a **Ajustes → General → VPN y gestión de dispositivos**, pulsa tu Apple ID y después **Confiar**.

### A5 · Arrancar (versión de desarrollo)

La versión **GF Dev** carga el código desde tu PC por Wi-Fi, así que ves los cambios de cada fase **sin recompilar**.

1. El PC y el iPhone tienen que estar en la **misma Wi-Fi**, y esa red debe estar marcada como **Privada** en Windows.
2. En la carpeta del proyecto, ejecuta:
   ```bash
   npm install
   ```
   ```bash
   npm start
   ```
   Si Windows pregunta por el firewall, **permite Node.js en redes privadas**.
3. Abre **GF Dev** en el iPhone y toca el servidor que aparece. Si no aparece, escribe la dirección que muestra la terminal (`http://192.168.x.x:8081`).

### A6 · Cada 7 días: refrescar

- Si la app caduca, no se abre, pero **los datos siguen ahí**.
- Para refrescarla: conecta el iPhone y vuelve a instalar **el mismo `.ipa`** con Sideloadly.
- Sideloadly también puede refrescarla solo por Wi-Fi si el PC está encendido. Actívalo en sus opciones avanzadas (*Automatic refresh*).

### Versión definitiva (sin el PC)

En el paso A2, elige **release**. Se instala igual y aparece como **Guillem Fitness**. Lleva todo el código dentro y funciona sin el PC. Puede convivir con GF Dev.

### Si HealthKit da problemas

Apple permite HealthKit con un Apple ID gratuito, y el `.ipa` ya lleva el permiso. Si en **Pasos** sale «Salud no está disponible», lo más probable es que Sideloadly lo haya quitado al firmar. El aviso muestra un **Detalle técnico** con el error exacto.

La opción **Use custom entitlements** de Sideloadly, que podría conservarlo, es **de pago** (solo para mecenas de Patreon). No hace falta: usa la alternativa gratis con **Atajos** (más abajo). Deja esa casilla **desmarcada** al instalar.

**Si no quieres usar Atajos:**
1. En el aviso, pulsa **Usar solo el sensor y ocultar este aviso**. Si Sideloadly no deja instalar, vuelve a compilar (paso A2) **desmarcando «Incluir HealthKit»**.
2. La app contará los pasos con el **podómetro del iPhone**. Sin Apple Watch, es el mismo sensor que usa Salud.
3. Como el podómetro solo guarda 7 días, la app apunta cada día en su base de datos para que el calendario no se vacíe.
4. Con un Mac (Opción B), Xcode sí activa el permiso de Salud con tu Apple ID gratuito.

**Alternativa sin permiso de HealthKit: Atajos.** Un Atajo del iPhone lee tus pasos en la app Salud (también los del Apple Watch) y los pasa a la app con el enlace `guillemfitness://salud?pasos=…` (son 4 acciones). Los pasos para crearlo están dentro de la app, en castellano o en catalán (Dreceres), en **Perfil → Salud con Atajos** (o en el aviso de Pasos → «Conectar Salud con Atajos»). Con una automatización «al abrir Guillem Fitness», se hace solo.

---

## Opción B · Instalar desde un Mac

Con un Mac no hacen falta GitHub, iTunes ni Sideloadly: el Mac compila la app y la instala directamente en el iPhone conectado por cable. **Sigue caducando cada 7 días** (Apple ID gratuito), pero refrescarla es repetir un comando.

### B1 · Preparar el Mac (una sola vez)

1. Instala **Xcode** desde la App Store (gratis; ocupa bastante). Ábrelo una vez, acepta la licencia y deja que instale los componentes de iOS. Si la App Store no te deja instalar la versión actual, actualiza macOS.
2. En Xcode, ve a **Ajustes → Cuentas**, pulsa **+** y añade tu **Apple ID** normal.
3. Instala **Homebrew** siguiendo las instrucciones de [brew.sh](https://brew.sh). Después, en la app Terminal:
   ```bash
   brew install node cocoapods
   ```
4. Copia al Mac la carpeta `guillem-fitness` (por AirDrop, USB o desde GitHub si la subiste). **No copies `node_modules`**: se vuelve a instalar.
5. En Terminal, dentro de la carpeta:
   ```bash
   npm install
   ```

### B2 · Instalar la versión definitiva

1. Conecta el iPhone por cable al Mac, desbloquéalo y pulsa **Confiar** en este ordenador.
2. Ejecuta:
   ```bash
   npx expo run:ios --device --configuration Release
   ```
   - Si te pregunta en qué dispositivo instalar, elige tu iPhone.
   - Tarda unos minutos la primera vez; las siguientes, bastante menos.
   - Instala **Guillem Fitness**, que lleva todo el código dentro y funciona sin el Mac.

**Si da un error de firma («signing», «development team», «provisioning»):**

1. Abre el proyecto en Xcode:
   ```bash
   xed ios
   ```
2. Selecciona el proyecto **GuillemFitness** (arriba a la izquierda) → pestaña **Signing & Capabilities**.
3. Marca **Automatically manage signing** y en **Team** elige tu nombre (*Personal Team*).
4. Cierra Xcode y repite el comando de B2.

**Si el error menciona HealthKit** (*«Personal development teams do not support the HealthKit capability»*), compila sin HealthKit; los pasos se contarán con el sensor del iPhone. Hay que regenerar el proyecto nativo (la carpeta `ios`) y volver a compilar:
```bash
GF_HEALTHKIT=off npx expo prebuild --platform ios --clean
```
```bash
npx expo run:ios --device --configuration Release
```
Al regenerar se pierde el equipo de firma: si vuelve a dar error de firma, repite los pasos de arriba (Xcode → Team).

**Si el error dice que el identificador ya está registrado** (*«Failed to register bundle identifier»*), cambia en `app.config.ts` `com.guillem.fitness` por algo tuyo, por ejemplo `com.guillembc.fitness`. Después regenera y compila como en el caso de HealthKit, pero sin `GF_HEALTHKIT=off`. Hazlo antes de empezar a usar la app: si lo cambias después, el iPhone la trata como una app nueva. Para recuperar los datos en ese caso, exporta antes la copia JSON e impórtala después.

### B3 · Permitir la app en el iPhone (solo la primera vez)

Igual que en A4:

1. **Ajustes → Privacidad y seguridad → Modo de desarrollador** → activar y reiniciar.
2. **Ajustes → General → VPN y gestión de dispositivos** → tu Apple ID → **Confiar**.

### B4 · Versión de desarrollo (opcional, para ver cambios al instante)

Solo si vas a pedirme cambios y quieres verlos sin recompilar. Instala **GF Dev** una vez:

```bash
APP_VARIANT=development npx expo run:ios --device
```

Las siguientes veces basta con arrancar el servidor (Mac e iPhone en la misma Wi-Fi) y abrir GF Dev:

```bash
npm start
```

### B5 · Cada 7 días: refrescar

Conecta el iPhone y repite el comando de B2:

```bash
npx expo run:ios --device --configuration Release
```

Se instala encima de la anterior: **no se pierde nada**. Si se te pasa y la app caduca, no se abre hasta que la reinstalas, pero los datos siguen ahí. Hazlo mejor el día 6 que el día 8.

Si compilaste sin HealthKit, no hace falta repetir `GF_HEALTHKIT=off`: la carpeta `ios` ya está generada así. Solo afecta cuando se regenera con `prebuild --clean`.

---

## Clave de la IA (para las fotos de comida)

- **Gemini (gratis, por defecto):**
  1. Entra en [aistudio.google.com/apikey](https://aistudio.google.com/apikey) con tu cuenta de Google.
  2. Pulsa **Create API key** y cópiala.
  3. En la app ve a **Perfil → Análisis de fotos**, pégala en Gemini y pulsa **Guardar clave**.
  - En la capa gratuita, Google puede usar lo que envías para mejorar sus modelos.
  - La app usa `gemini-3.6-flash`. Si tu clave no puede usarlo, prueba sola `gemini-3.8-flash` y `gemini-3.5-flash-lite`.
  - **Probar la clave desde el PC** (sin compilar): en PowerShell, dentro de la carpeta del proyecto, escribe `$env:GEMINI_API_KEY = "tu clave"` y después `node scripts/probar-gemini.mjs`. Para usar una foto tuya, añade la ruta: `node scripts/probar-gemini.mjs "C:\ruta\plato.jpg"`. (Si usas `npm` y PowerShell dice que «la ejecución de scripts está deshabilitada», escribe `npm.cmd` en lugar de `npm`.)
- **Claude (opcional, de pago por uso):** crea la clave en la consola de Anthropic ([platform.claude.com/settings/keys](https://platform.claude.com/settings/keys)) y pégala en la tarjeta de Claude. Puedes cambiar de proveedor cuando quieras.
  - Al crearla, **elige un workspace** (el «Default» vale). Una clave sin workspace no funciona en la app.
  - Hay que **comprar saldo** en *Billing* antes de que funcione; cada foto cuesta céntimos.

La clave se guarda **cifrada en el llavero del iPhone** (`expo-secure-store`). Nunca va en el código, en la base de datos ni en git.

> ⚠️ **Si algún día publicas la app:** la llamada a la IA debe pasar por **un servidor propio** (por ejemplo, una función de Supabase o Cloudflare Workers) que guarde la clave. Una clave dentro de una app publicada se puede extraer del paquete en minutos.

---

## Desarrollo

Requisito: Node 24 o superior.

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo para GF Dev |
| `npm run check` | TypeScript + lint + tests (lo mismo que comprueba GitHub antes de compilar) |
| `npm test` | Tests unitarios |
| `npm run db:generate` | Genera una migración SQL tras cambiar `src/data/db/schema.ts` |

**Estructura:**

```
src/
├─ app/          pantallas (Expo Router): onboarding, (tabs)/entreno · pasos · calorias · perfil
├─ design/       colores, tipografía, espaciados y componentes base
├─ domain/       lógica pura con tests: kcal (Mifflin-St Jeor), formato español, días locales…
├─ data/         base de datos (Drizzle + SQLite) y repositorios
├─ features/     lógica de cada módulo (hooks, formularios, componentes)
└─ lib/          utilidades: ids, llavero, caché de consultas
drizzle/         migraciones SQL generadas
docs/PLAN.md     plan aprobado (arquitectura, esquema y diseño)
```

**Reglas del proyecto:**

- Las pantallas solo acceden a los datos a través de repositorios (`src/data/repositories`). Para conectar una nube se cambia `getRepositories()` y nada más.
- Todas las tablas tienen `id` (UUID), `created_at`, `updated_at` y `deleted_at` (borrado suave).
- Los pesos se guardan siempre en kg; los días, como fecha local `AAAA-MM-DD` calculada al guardar.
- TypeScript estricto y sin `any`; el lint falla si aparece uno.
- Las gráficas se dibujan con Skia directamente (`src/design/components/LineChart.tsx`). No uso victory-native porque su versión actual exige otro paquete de Skia distinto al que fija Expo.
- Los tests de repositorios (`src/data/repositories/sqlite/repositories.test.ts`) ejecutan las migraciones y consultas reales sobre el SQLite de Node.
- El contraste de todos los colores de texto se comprueba en `src/design/contrast.test.ts` (WCAG AA, 4,5:1).
- Copia de seguridad: `src/data/backup/backup.ts` (exporta todas las tablas, también los borrados suaves; importa fusionando por id en una transacción).
- Datos de prueba: `src/data/seed/demoData.ts` (2 años, deterministas, marcados con `is_demo`).

**Pasos:** una sola fuente por plataforma (Salud en iPhone, Health Connect en Android) y el sensor solo si no hay permiso; nunca se suman fuentes. Los días se guardan en la tabla `step_day`, así el calendario conserva el historial aunque el sensor solo recuerde 7 días. La parte de Android está implementada pero no probada en un móvil real.

**Calorías por foto:** la foto se reduce a 1024 px y se comprime en JPEG antes de enviarla. La IA responde con salida estructurada (JSON), que se valida con zod; si falla, se reintenta una vez y después se pasa a entrada manual. Sin conexión, la foto se guarda como pendiente. Gemini usa `generateContent` por REST; Claude usa el SDK oficial `@anthropic-ai/sdk` con `messages.parse` y por defecto Claude Haiku 5.5 (el más barato con visión; se puede cambiar en Perfil). Las kcal de la IA son siempre una estimación: no cuentan hasta que revisas y pulsas Guardar.

**Añadir ejercicios a la biblioteca:** edita `src/data/seed/exercises.ts`. Copia una línea, pon un UUID nuevo y cambia el resto. Al abrir la app se insertan los que falten.

---

## Problemas frecuentes

| Problema | Solución |
|---|---|
| «No se puede verificar la app» o no abre | Paso A4 / B3: confiar en tu Apple ID y activar el Modo desarrollador |
| La app no abre tras una semana | Ha caducado: paso A6 (Windows) o B5 (Mac). Los datos se conservan |
| GF Dev no encuentra el servidor | Misma Wi-Fi, red «Privada» en Windows y Node.js permitido en el firewall. Prueba a escribir la dirección a mano |
| Sideloadly: «Maximum App ID limit» | Con un Apple ID gratuito puedes registrar 10 apps por semana; espera unos días o reutiliza el mismo `.ipa` |
| Error de HealthKit al instalar | Compila sin HealthKit: casilla en GitHub (Opción A) o `GF_HEALTHKIT=off` (Opción B) |
| El workflow falla en «Comprobar código» | Ejecuta `npm run check` en el PC para ver el error |
| La foto no se analiza | Perfil → Análisis de fotos → «Probar conexión». Sin red, guárdala como pendiente |
| He cambiado de móvil | Instala la app, haz el onboarding y en Perfil → Importar copia elige tu último JSON |

---

## Cómo pedir cambios concretos

Pide un cambio nombrando **la pantalla y el comportamiento**, no el módulo entero. Ejemplos que funcionan bien:

- «En el entreno activo, que el botón ✓ copie también el peso de la serie anterior si está vacío.»
- «En Pasos, cambia el umbral ámbar del calendario del 50 % al 70 %.» (`src/domain/steps.ts` → `compliance`)
- «Añade a la biblioteca el ejercicio X con grupo Y y material Z.» (`src/data/seed/exercises.ts`)
- «En Calorías, que la merienda empiece a las 17:00.» (`src/domain/nutrition.ts` → `mealTypeForTime`)
- «Cambia el texto del aviso de permisos de Salud.» (`src/features/steps/PermissionCard.tsx`)

Cada módulo vive en su carpeta (`src/features/workout`, `steps`, `nutrition`, `profile`) y la lógica pura en `src/domain`, con tests. Un cambio así toca uno o dos archivos y se comprueba con `npm run check`. Los cambios de JavaScript llegan al iPhone por Wi-Fi sin recompilar; solo hay que recompilar en GitHub si se añade una librería nativa.

---

## Conectar una nube más adelante (por ejemplo, Supabase)

La app está preparada para no reescribir nada:

1. **Crear las tablas** en Supabase (Postgres) con las mismas columnas que `src/data/db/schema.ts`, y activar Row Level Security con una política por usuario (`user_id = auth.uid()`).
2. **Añadir inicio de sesión** (Supabase Auth, por ejemplo con «Iniciar sesión con Apple») y una columna `user_id` en cada tabla.
3. **Sincronizar, no sustituir:** mantener SQLite como base local y añadir un proceso que suba las filas con `updated_at` posterior a la última sincronización y baje las remotas. Gana el `updated_at` más reciente, la misma regla que ya usa la importación JSON (`src/data/backup/backup.ts`). Los borrados viajan como `deleted_at`, nunca como borrados físicos.
4. **Fotos:** subirlas a Supabase Storage y guardar la URL en `meal.photo_uri`.
5. **La IA a través de un servidor propio:** mover la llamada a Gemini/Claude a una Edge Function que guarde la clave. La app deja de tener clave.
6. **Punto de cambio en el código:** `getRepositories()` en `src/data/repositories/index.ts`. Las pantallas no se tocan.
