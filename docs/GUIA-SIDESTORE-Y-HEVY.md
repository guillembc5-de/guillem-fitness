# Guía: app sin caducar (SideStore) y entrenos de Hevy (gratis)

Dos objetivos, los dos gratis:

1. **La app no caduca cada 7 días.** SideStore la renueva sola desde el propio iPhone, sin PC.
2. **Lo que entrenas en Hevy cuenta en tu app.** Las calorías llegan solas (Hevy → Salud → Atajo); el detalle de cada serie, con el archivo de Hevy cuando quieras.

Tiempo: unos 45 minutos la primera vez. Después, nada (o 2 minutos para traer el detalle de Hevy).

---

## Parte 0 · Antes de empezar (5 min)

SideStore puede instalar la app como **una app nueva**, aparte de la que pusiste con Sideloadly. Para no perder nada:

1. Compila la versión nueva en GitHub: **Actions → Compilar iOS → Run workflow** (ya sale **release** por defecto) y espera al tic verde (30–40 min). Mientras, sigue con la Parte 1.
2. En tu app actual: **Perfil → Copia de seguridad y datos de prueba → Exportar copia (JSON) → Guardar en Archivos → En mi iPhone**.
3. Abre la app **Archivos** y comprueba que está el archivo `guillem-fitness-AAAA-MM-DD.json`.
4. Ten a mano tu **clave de Gemini** (la copias otra vez de aistudio.google.com): no va en la copia, vive en el llavero del iPhone.

> Las **fotos de la galería de platos** no van en la copia (solo sus alimentos y valores). Si las tienes, se perderán al cambiar de app.

---

## Parte 1 · En el PC: instalar SideStore con iloader (10 min)

Necesitas **iTunes** (ya lo tienes por Sideloadly) y el cable del iPhone.

1. Descarga iloader **solo** de su página oficial: [github.com/nab138/iloader/releases](https://github.com/nab138/iloader/releases) → archivo **`iloader-windows-x64.msi`**. (También vale [iloader.app](https://iloader.app). Ninguna otra web.)
2. Instálalo (doble clic al `.msi` → Siguiente → Finalizar).
3. Conecta el iPhone por cable, desbloquéalo y, si lo pregunta, toca **Confiar** y pon tu código.
4. Abre **iloader**. Si sale en inglés, cambia el idioma a **Español**.
5. Inicia sesión con tu **Apple ID** (el mismo de Sideloadly) y escribe el código de 6 cifras que te llega al iPhone.
6. Elige tu iPhone y pulsa **Instalar SideStore (Stable)**. Espera a que termine.

---

## Parte 2 · En el iPhone: activar SideStore (10 min)

1. En la **App Store**, instala **LocalDevVPN** (gratis). Ábrela y toca **Connect**. Cuando pregunte, **Permitir** la configuración de VPN y pon tu código.
2. **Ajustes → General → VPN y gestión de dispositivos** → en «App de desarrollador», toca tu Apple ID → **Confiar** → **Confiar**. (Si sale **Permitir y reiniciar**, tócalo.)
3. Si te lo pide: **Ajustes → Privacidad y seguridad →** (abajo del todo) **Modo de desarrollador** → actívalo. El iPhone se reinicia; al volver, confirma **Activar**.
4. Con **LocalDevVPN conectada**, abre **SideStore** e inicia sesión con el **mismo Apple ID**.
5. Ve a **My Apps** y toca el contador **7 DAYS** junto a SideStore. Si pregunta por el certificado, **Yes** / **Refresh Now**. SideStore se cierra un momento y vuelve: está listo.

---

## Parte 3 · Instalar Guillem Fitness con SideStore (5 min)

Cuando la compilación de la Parte 0 tenga el tic verde:

1. En el iPhone, abre **Safari** y ve a:
   `https://github.com/guillembc5-de/guillem-fitness/releases/download/ultima/GuillemFitness.ipa`
   Se descarga en **Archivos → Descargas**.
2. Borra la app antigua (la de Sideloadly): mantén pulsado el icono → **Eliminar app**. (Tu copia ya está en Archivos.)
3. Con **LocalDevVPN conectada**, abre **SideStore → My Apps → +** (arriba a la izquierda) y elige `GuillemFitness.ipa` en Descargas. Espera a que aparezca con su contador de días.
4. Abre **Guillem Fitness**. Si empieza de cero: **Perfil → Copia de seguridad y datos de prueba → Importar copia** y elige el `.json` de la Parte 0. Vuelve todo.
5. **Perfil → Análisis de fotos**: pega otra vez tu clave de Gemini.
6. Mira **Pasos**: con SideStore puede que Salud funcione directamente. Si el aviso de «Salud no está disponible» desaparece, mejor; si no, sigue con el Atajo (Parte 5).

---

## Parte 4 · Que se renueve sola cada día (5 min)

Con esto la app no caduca nunca y no vuelves a necesitar el PC.

1. Abre **Atajos → Automatización → +** (o **Nueva automatización**) → **Hora del día**.
2. Pon una hora en la que el iPhone suela estar encendido y con Wi-Fi (por ejemplo, **14:00**), **Diariamente**, y marca **Ejecutar inmediatamente** (no «Pedir confirmación»). **Siguiente**.
3. **Nuevo atajo en blanco** y añade estas acciones (usa el buscador de acciones):
   1. Busca **VPN** → **Definir VPN** (o «Establecer VPN»): **Conectar** → **LocalDevVPN**.
   2. Busca **Esperar** → **5 segundos**.
   3. Busca **Refresh** → **Refresh All Apps** (de SideStore). Toca la flecha de la acción y **desactiva «Mostrar al ejecutar»**.
   4. Otra vez **Definir VPN**: **Desconectar** → **LocalDevVPN**.
4. Guarda. Ejecútalo una vez a mano desde la biblioteca de Atajos y acepta los permisos que pida.

**Si un día falla** (tienes 7 días de margen): abre LocalDevVPN → **Connect**, abre SideStore → **My Apps** → toca el contador de días. Listo.

**Si actualizas iOS** y SideStore deja de renovar: en el PC abre iloader → **Gestionar archivo de emparejamiento** (Manage Pairing File) → **Colocar** junto a SideStore.

---

## Parte 5 · Hevy: que las calorías cuenten solas (10 min)

1. En **Hevy**: **Perfil → ⚙️ Ajustes →** apartado de integraciones → **Apple Health / Salud** → actívalo y permite en Salud **Entrenamientos** y **Energía activa**. Activa también **Calorías activas** si aparece la opción.
2. En **Guillem Fitness**: **Perfil → Salud con Atajos** (tiene botón **Català**) y crea el Atajo **con la parte 2 (Fitness)**: así trae tus pasos **y la energía activa** del día, que ya incluye las calorías de los entrenos de Hevy.
3. Crea la automatización **al abrir Guillem Fitness** (está en la misma pantalla).

Desde ahora, cada vez que abres la app, las calorías de tus entrenos de Hevy cuentan en **Calorías** sin hacer nada. La app usa la mayor cifra entre la de Fitness y su propio cálculo: nunca suma dos veces lo mismo.

## Parte 6 · Hevy: el detalle de cada entreno (2 min, cuando quieras)

Para ver en la app tus series, kilos y récords:

1. **Hevy → Perfil → ⚙️ Ajustes → Exportar e importar datos → Exportar entrenos → Guardar en Archivos**.
2. **Guillem Fitness → Perfil → Hevy → Elegir archivo de Hevy** → elige el `.csv` → **Importar**.

Lo que ya estaba no se duplica; lo que cambiaste en Hevy se actualiza.

---

## Actualizar la app en el futuro (sin PC)

1. Cuando haya cambios: `git add .` → `git commit -m "…"` → `git push`, y en GitHub **Actions → Compilar iOS → Run workflow** (release).
2. Al terminar (tic verde), en el iPhone: conecta **LocalDevVPN** y en la app **Perfil → Actualizar la app**. SideStore la instala encima, **sin perder datos**.

## Límites de la versión gratis

- Como máximo **3 apps** a la vez instaladas con tu Apple ID (SideStore cuenta como una).
- **10 apps distintas por semana**: no instales y borres apps de prueba sin parar.
- La renovación necesita **Wi-Fi** y **LocalDevVPN** conectada (la automatización lo hace).

Si quieres olvidarte de todo esto: la cuenta de desarrollador de Apple (99 €/año) hace que la app dure un año sin renovar.
