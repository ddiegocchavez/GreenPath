# PROGRESO · GreenPath

Bitácora para que cualquier colaborador pueda continuar o revisar el trabajo. Se actualiza después de cada avance importante.

**Entrega:** 13 de noviembre de 2026, 9:00 a. m. (America/Mexico_City)
**Última actualización:** 2026-11-12 ~17:20
**Repo:** https://github.com/ddiegocchavez/greenpath (privado) · **Ruta local:** `C:\greenpath`

Leyenda: ✅ probado · 🔧 en curso · 📋 pendiente · ⚠️ problema

---

## Siguiente paso

1. **Probar MVP v2 en el emulador** (Mi alimentación, Mis eventos, calculadora eléctrica): no se ha visto en Android todavía.
2. Catálogo de recomendaciones en Supabase (Reducir sigue mostrando "Catálogo en preparación").
3. Perfil web (Next.js) y despliegue.
4. Patrocinadores de recompensas (más adelante, no prioritario).

## MVP v2 integrado desde ZIP (`GreenPath_v2_descarga_nueva.zip`) · 2026-11-12

Cambios recibidos (carpeta `coolproject-main`), revisados e integrados. Solo 19 archivos difieren; el resto era idéntico al repo.

- **Navegación a 3 pestañas:** 📊 Mi impacto (Monitor) · 🌱 Reducir · 🏆 Mi progreso (Recompensas). Eventos y Alimentación quedan dentro de Reducir.
- **Motor de carbono** `features/carbon.ts`: factores Poore & Nemecek (2018) vía Our World in Data (res 99.48, pollo 9.87, legumbres 1.79, tomate 2.09, maíz 1.70, arroz 4.45 kg CO₂e/kg — valores verificados contra la fuente publicada). Globales, no México.
- **Mis eventos: carne asada** (`EventsScreen`): 3 menús, invitados, presupuesto, CO₂e estimado vs. menú tradicional de referencia (comparación **potencial**, no reducción), seguimiento comprado / consumido / guardado / desechado (`foodLedger.ts`), historial local (`eventStorage.ts`, AsyncStorage, no Supabase).
- **Mi alimentación** (`FoodScreen`, `food.ts`): despensa local de 12 ingredientes y 6 recetas deterministas.
- **Calculadora eléctrica manual** en Mi impacto: kWh × factor del usuario; no se deduce de minutos de uso; no da puntos.
- Metodología: `docs/CARBON_METHODOLOGY.md`. Notas del autor: `CAMBIOS_GREENPATH_MVP.md`, `AVANCE_GREENPATH_V2.md`, `AVANCE_CARBONO_GREENPATH.md`, `MIS_EVENTOS_MVP.md`.
- Verificado aquí: `tsc --noEmit` ✅ · `tests/carbon.test.mjs` 8/8 ✅ · `tests/foodLedger.test.mjs` 7/7 ✅.
- ✅ **Verificado en el emulador:** 3 pestañas; Mis eventos calcula bien (equilibrado 8 personas = 81.97 kg CO₂e; tradicional = 145.34; revisado a mano); Mi alimentación guarda ingredientes y sugiere recetas.
- Arreglo propio: la barra "← Volver a Reducir" se encimaba con el reloj del teléfono. Ahora `Screen` acepta `onBack`/`backLabel` y el botón vive dentro del área segura.
- ⚠️ Precios y porciones de eventos son de demostración. Los eventos y la despensa no se sincronizan con Supabase.

## UI v3 según mockups (`Downloads/IMPACTO`, `REDUCIR`, `PROGRESO`) · 2026-11-12

Mockups en `docs/producto/mockups/*-v3.png`; fotos recortadas en `mobile/assets/hero-*.jpg`. Los mockups traían **datos de ejemplo**; se conectaron a datos reales:

| Elemento del mockup | Dato real |
|---|---|
| Mi impacto · Hoy / Semana, apps | `usage_daily` (hoy, del lector; semana, de Supabase) |
| Mi impacto · Alimentación "3.2 kg CO₂e" | CO₂e estimado de **eventos registrados** (comprado) o del plan del último evento; si no hay, "Sin registros" |
| Mi impacto · Digital | "Pendiente" |
| Reducir · Tus preferencias + Editar | Tabla `preferences` (editable) |
| Reducir · receta | Despensa local + `food.ts` (sin precio inventado) |
| Reducir · Alternativas para ti | Tabla `recommendations` (seed nuevo, 5 con fuente o "No cuantificado"), filtradas por esfuerzo y presupuesto; "Esto sí va conmigo" → `user_choices` |
| Mi progreso · gráfica kg CO₂e/semana (ejemplo) | **Uso promedio por día por semana** (`v_daily_activity`, medido; no CO₂e) |
| Mi progreso · retos y puntos | `user_choices` (realizadas) y `points_ledger`; reclamar puntos se conserva |

- Nuevos: `components/ui/Icon.tsx` (íconos SVG basados en Lucide, ISC), `AppHeader.tsx`, `charts/LineChart.tsx`, `features/progress/{progress,foodSummary}.ts`, `features/preferences/preferences.ts`, `features/recommendations/recommendations.ts`.
- Migración `20261113002742_seed_catalog.sql`: eventos (carne asada, fiesta) y 5 recomendaciones.
- Cerrar sesión: ícono de perfil del encabezado.
- La calculadora eléctrica manual ya no aparece en Mi impacto (no está en el diseño); la función sigue en `features/carbon.ts`.
- ✅ `tsc` sin errores. 📋 **Pendiente verificar en el emulador** (Metro detenido por falta de memoria).

## UI actualizada desde ZIP (`GreenPath_v2_UI_actualizada.zip`) · 2026-11-12

- **Reducir** rediseñado según mockup: "Reduce tu huella 🌱", 4 accesos rápidos (Alimentación, Consumo digital, Mi despensa, Mis eventos), foto de evento, tarjeta "Carne asada · Personalizable" y consejo.
- **Mis eventos**: título "Organiza tu carne asada", foto principal y tarjeta "Tu evento · En planificación" con invitados y presupuesto.
- Las 2 imágenes del ZIP eran **capturas completas del mockup** (con textos y botones), no fotos. Se **recortó solo la foto** para `mobile/assets/event-table.png` y `carne-asada.png`; los mockups completos quedaron en `docs/producto/mockups/` como referencia.
- **No se tomaron** del ZIP: `PROGRESO.md`, `README.md` (eran versiones anteriores y borraban la documentación v2), `Screen.tsx` y `FoodScreen.tsx` (deshacían el arreglo del botón Volver).
- Corrección: el acceso "Consumo digital" abría Mi alimentación; ahora navega a **Mi impacto**.
- ✅ Verificado en emulador: Reducir, Mis eventos, Volver y Consumo digital. `tsc` sin errores.
- ⚠️ **Origen y licencia de las fotos sin confirmar**: revisar antes de hacer público el repo.

## Recompensas ✅ (emulador + servidor)

- 4.ª pestaña **Recompensas**: barra de puntos por nivel (Semilla 0 · Brote 250 · Retoño 750 · Árbol 1500 · Bosque 3000), comparación y botón "Reclamar".
- **Regla `reduccion-actividad-v2-promedio-diario`:** compara el **promedio diario** de tiempo de uso de los últimos 7 días completos vs. los 7 anteriores, por dispositivo. 10 pts por cada 1 % de reducción, desde 5 %, máx. 500. Si sube, 0 (sin castigo). Solo si ambos periodos tienen ≥ 5 días con datos. Una vez por ventana de 7 días.
- La v1 comparaba totales: con 6 vs 7 días daba 3 % en vez de ~17 %. Corregido a promedio diario (migración `..._rewards_daily_average.sql`).
- Calculado y otorgado en el servidor: `weekly_reduction` (invoker) y `claim_weekly_points` (definer, recalcula; no confía en el cliente).
- Es reducción de **actividad**, no de CO₂; la app lo dice. Puntos en `points_ledger`, separados de emisiones.
- La app sube los días anteriores que Android conserva (`syncPastDays`, idempotente).
- Historial de **demostración** (`is_demo=true`, etiquetado en la app): `supabase/seed/demo_history.mjs` para la cuenta demo.
- Migración `20261112221450_rewards_points.sql` quedó **vacía por error** (no cambia nada; no borrar: está en el historial remoto). El contenido está en `..._rewards_points_v1.sql`.
- Patrocinadores: **pendiente**, decisión de Diego dejarlo para después.

## Hito 2 · Cuenta + Monitor guardando en Supabase ✅ (emulador)

- Inicio de sesión → Monitor con uso real → `sync_usage` → filas en `usage_daily` y `v_daily_activity` de la cuenta. Verificado leyendo con la sesión de la cuenta demo.
- Cuenta demo: `demo@greenpath.test` (contraseña en `C:\greenpath\.env`, no versionado), creada confirmada desde el servidor.
- ⚠️ Pendiente que Diego desactive "Confirm email" en Supabase para que el registro desde la app no requiera correo (hackatón). Reactivarlo con SMTP propio antes de producción.

## Supabase ✅

- Proyecto **greenpath** · ref `fmjjcdflnmbytznryefg` · us-east-1 · https://supabase.com/dashboard/project/fmjjcdflnmbytznryefg
- Contraseña de la base en `.env` (raíz, no versionado). Clave pública en `mobile/.env` (no versionado; plantilla en `mobile/.env.example`).
- Migración `20261112210859_init_schema.sql` aplicada con `npx supabase db push --remote`.
- ⚠️ La conexión MCP de Supabase de la sesión apunta a **otro proyecto (jmf-erp)**: no usarla para GreenPath; usar la CLI enlazada.

## Hito 1 · Lectura real en Android ✅ (emulador)

## Decisiones tomadas

| Fecha | Decisión |
|---|---|
| 11-12 | Nombre del proyecto: **GreenPath** (antes "Huella Invisible"). |
| 11-12 | Android primero (Expo + RN + TS). iOS y GPS para después. Web consultable desde cualquier celular. |
| 11-12 | Lectura de uso con `UsageStatsManager` vía `expo-android-usagestats` 1.2.0. Plan B: módulo Expo local en Kotlin si no compila en 1 h. |
| 11-12 | Consulta al abrir o actualizar la app; sin monitoreo en segundo plano. |
| 11-12 | Backend: Supabase (Auth, Postgres + RLS, Edge Function `sync`). Plan B: función RPC si la Edge Function se bloquea. |
| 11-12 | Sincronización por **foto acumulada del día**: reemplaza, nunca suma; `observed_at` más reciente gana. |
| 11-12 | Recomendaciones desde **catálogo curado + reglas**, sin IA. |
| 11-12 | Puntos, decisiones elegidas, acciones realizadas y emisiones estimadas se muestran **por separado**. |
| 11-12 | No se inventan factores de CO₂ por minuto; sin factor defendible la estimación queda **pendiente**. |
| 11-12 | Fotografías: **ampliación**, con categoría elegida a mano, sin reconocimiento automático. |
| 11-12 | Beneficios de negocios locales: solo "en exploración", sin acuerdos confirmados. |
| 11-12 | Identidad visual propia, lúdica: mascota oso negro de NL, Nunito, verde `#1FAF5A`. |
| 11-12 | Desarrollo en emulador; **teléfono prestado** para la demo final. |
| 11-12 | Todo el código se hace desde la sesión de Claude con Diego. Scar: catálogo, fuentes, enlaces verificados, textos y pitch. |
| 11-12 | Repo **privado** por ahora; se hará público antes de la entrega. |
| 11-12 | Repo organizado por capas y funciones; cada carpeta tiene un `README.md` que explica qué contiene. |
| 11-12 | La app tiene **3 secciones**: **Monitor** (capta y transforma la actividad), **Reducir sin gastar** y **Eventos sostenibles** (lista y productos sustentables). |
| 11-12 | Paleta de **verdes oscuros y claros** (`forest`, `pine`, `leaf`, `sprout`, `mint`, `mist`); reemplaza a la propuesta anterior con amarillo/azul. |
| 11-12 | **Recompensas:** puntos por % de reducción de la **actividad medida** (promedio diario, 7 vs 7 días); 4.ª pestaña "Recompensas"; patrocinadores después. |
| 11-12 | **Ya no hay reparto entre dos personas: todo se hace desde la sesión de Claude** (sujeto a cambios). |
| 11-12 | Sincronización: la app llama la función SQL `sync_usage` (security invoker + RLS) directamente; la Edge Function queda opcional para cálculos posteriores. Ahorra un despliegue y cumple: usuario desde el JWT, idempotencia, lo antiguo no pisa lo reciente. |
| 11-12 | El uso se calcula sumando eventos por **activity** desde las 00:00 locales; se excluyen launcher y asistentes del sistema, como Bienestar digital. |

## Funciones implementadas

| Función | Estado |
|---|---|
| Entorno Android (JDK 17, SDK 36, emulador API 35 con WHPX) | ✅ el emulador arranca Android 15 en ~40 s |
| App Expo base (SDK 58, RN 0.88, TypeScript) | ✅ compila (debug) e instala en el emulador |
| `expo-android-usagestats` 1.2.0 con Expo 58 | ✅ compila y funciona |
| Lector de uso `features/usage/usageReader.ts` | ✅ estados ok / sin permiso / vacío / error |
| Pantalla temporal `screens/UsageDebugScreen.tsx` | ✅ se reemplazará por la pestaña Monitor |
| Paleta `theme/colors.ts` + `theme/index.ts` (Nunito, espacios, radios) | ✅ aplicada |
| Componentes `ui/Button` (relieve), `ui/Card`, `ui/Screen` | ✅ |
| Cuenta: `features/auth/AuthProvider.tsx`, `screens/AuthScreen.tsx` | ✅ inicio de sesión probado |
| Navegación 3 pestañas `navigation/Tabs.tsx` | ✅ Monitor · Sin gastar · Eventos sostenibles |
| Monitor `screens/MonitorScreen.tsx` + `features/sync/syncUsage.ts` | ✅ medido / estimación pendiente / por app / guardado |
| Reducir sin gastar / Eventos (`ReduceScreen`, `EventsScreen`) | 🔧 leen el catálogo; vacío por ahora |
| `metro.config.js` ignora `android/app/build` y `.cxx` | ✅ el paquete pasó de >35 min a ~20 s |
| Contrato de sincronización v1 | ✅ definido (`shared/contrato/`), sin implementar |
| Esquema Supabase: perfiles, preferencias, dispositivos, `usage_daily`, factores, catálogo, elecciones, puntos | ✅ aplicado |
| RLS en las 11 tablas + permisos explícitos | ✅ probado |
| `sync_usage(payload)` idempotente + vista `v_daily_activity` | ✅ probado |
| Catálogo (seed), metodología, web | 📋 |

## Pruebas realizadas

| Prueba | Resultado |
|---|---|
| `emulator -accel-check` | ✅ WHPX instalado y usable |
| Arranque del AVD `huella_api35` | ✅ `sys.boot_completed=1`, Android 15 |
| Servicio `usagestats` presente en el emulador | ✅ responde a `dumpsys` |
| Compilación debug (`npx expo run:android`) | ✅ BUILD SUCCESSFUL en 2 min 14 s (tras corregir la ruta del SDK) |
| Sin permiso → mensaje y botón "Abrir ajustes" | ✅ |
| Con permiso → lista real de apps y tiempos | ✅ Chrome, Settings, YouTube Music |
| Usar otra app y volver → el tiempo sube | ✅ Chrome de 0 a 3 min tras ~100 s de uso; Settings 20 s exactos |
| Revocar permiso (`appops ... ignore`) → vuelve a pedirlo sin cerrarse | ✅ |
| Teléfono real | 📋 pendiente (teléfono prestado) |
| `supabase/tests/rewards_e2e.mjs` (usuarios de prueba borrados al final) | ✅ 9/9: 20 % → 200 pts; marca demo; reclamar otorga; no duplica; pocos días → no comparable; B no reclama con dispositivo de A (403); B no ve puntos de A; si sube → 0 |
| Recompensas en emulador con historial demo | ✅ 4 h 20 → 3 h 36 por día = 16.8 % → 168 pts; reclamar suma y bloquea el periodo |
| `supabase/tests/sync_e2e.mjs` contra el proyecto real (2 usuarios de prueba, borrados al final) | ✅ 9/9: guarda; repetir no cambia; más reciente reemplaza; más antiguo no sobrescribe; sin duplicados; B no ve a A; B no escribe en el dispositivo de A (403); sin sesión no lee uso (401); catálogo público legible |
| Comparación contra Bienestar digital | 📋 pendiente en teléfono real |

## Problemas pendientes

- ✅ **Resuelto:** `expo-android-usagestats` (hecho para Expo 53) compila y funciona con Expo 58.
- ✅ **Resuelto:** primera versión del lector cortaba sesiones: Chrome abre varias activities y al detenerse una se cerraba toda la app (marcaba 0 min). Ahora se sigue cada activity y la app cuenta mientras tenga al menos una abierta.
- ⚠️ La exclusión de launcher/sistema es por nombre de paquete (heurística); validar en el teléfono prestado (otras marcas usan otros launchers).
- ⚠️ Metro con `CI=1` no recarga cambios: arrancar con `npx expo start` normal. Si la app abre en blanco: `adb reverse tcp:8081 tcp:8081` y reabrir.
- ⚠️ En PowerShell, `sdkmanager` corta los nombres con `;`: usar `--package_file`.
- ✅ **Resuelto:** la primera compilación falló al enlazar (`undefined symbol: __gxx_personality_v0`). Causa: la ruta del SDK tiene un espacio (`C:\Users\Diego Emilio\...`), CMake llamó al compilador por su nombre corto `CLANG_~1.EXE` y clang no enlazó la biblioteca de C++. Solución: enlace sin espacios `C:\Android\Sdk` (junction al SDK real), `ANDROID_HOME=C:\Android\Sdk` y `sdk.dir` en `mobile/android/local.properties`. **Cualquier máquina con espacios en la ruta del usuario necesita lo mismo.**
- ⚠️ El enum `UsageEventType` de `expo-android-usagestats` tiene valores incorrectos (p. ej. `SCREEN_NON_INTERACTIVE = 8`; Android usa 16). Usamos las constantes oficiales en `usageReader.ts`.
- ⚠️ El módulo declara `QUERY_ALL_PACKAGES`, restringido en Google Play. No afecta al APK de la demo; revisar antes de publicar en la tienda.
- 📋 Falta el factor de emisión con fuente primaria (red eléctrica de México y consumo del smartphone).
- 📋 Falta el modelo y la versión de Android del teléfono prestado.
- 📋 Sesión de GitHub CLI pendiente para crear el repo remoto.

## Archivos modificados

| Archivo / carpeta | Cambio |
|---|---|
| `README.md` | Descripción completa, diagramas de arquitectura, secuencia y datos |
| `PROGRESO.md` | Esta bitácora |
| `.gitignore` | Excluye `.env`, `node_modules`, nativos generados, APK y keystores |
| `*/README.md` | Explicación corta de cada carpeta |
| `shared/contrato/sync-v1.schema.json` | Esquema JSON del contrato v1 |
| `docs/arquitectura/contrato-sync-v1.md` | Reglas del contrato y respuesta propuesta |
| `docs/metodologia/metodologia.md` | Esqueleto de la metodología ambiental |
| `mobile/` | App Expo base; `App.tsx` movido a `src/App.tsx`; `app.json` con nombre GreenPath y paquete `com.greenpath.app` |
| `mobile/src/features/usage/usageReader.ts` | Lector de uso por eventos, permisos y estados |
| `mobile/src/screens/UsageDebugScreen.tsx` | Pantalla temporal del Hito 1 |
| `mobile/src/theme/colors.ts` | Paleta de verdes |
| `supabase/config.toml`, `supabase/.gitignore` | Generados por `supabase init` |
| `supabase/migrations/20261112210859_init_schema.sql` | Esquema, RLS, `sync_usage`, vista diaria |
| `supabase/tests/sync_e2e.mjs` | Prueba de punta a punta de sincronización y RLS |
| `mobile/.env.example` | Plantilla de variables de la app |

## Entorno local (máquina de Diego)

- **Proyecto en `C:\greenpath`** (antes en `C:\Users\Diego Emilio\greenpath`). Se movió porque la ruta larga y con espacio rompía la compilación C++ de `react-native-safe-area-context` (`ninja: error: Stat(...)`, límite de 260 caracteres de Windows).
- Si hay que borrar `mobile/android` con rutas largas: `cmd /c "rd /s /q \\?\C:\greenpath\mobile\android"`.
- Aun en `C:\greenpath`, `safe-area-context` genera rutas internas de más de 260 caracteres. Solución aplicada:
  1. `LongPathsEnabled = 1` en `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem` (requiere administrador).
  2. CMake **3.31.6** del SDK (trae `ninja` 1.12.1, compatible con rutas largas; el 3.22.1 no).
  3. `mobile/android/local.properties` → `cmake.dir=C\:\\Android\\Sdk\\cmake\\3.31.6`.
  `android/` se regenera con `expo prebuild`: si se borra, volver a poner `sdk.dir` y `cmake.dir` en `local.properties`.

- JDK: `C:\Program Files\Microsoft\jdk-17.0.21.21-hotspot` (`JAVA_HOME`)
- Android SDK: `%LOCALAPPDATA%\Android\Sdk`, usado a través del enlace sin espacios **`C:\Android\Sdk`** (`ANDROID_HOME`)
- Emulador: `emulator -avd huella_api35` (Pixel 6, 2 GB RAM)
- No se usa el IDE de Android Studio para ahorrar RAM (16 GB en total).
