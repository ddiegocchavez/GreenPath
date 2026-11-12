# PROGRESO · GreenPath

Bitácora para que cualquier colaborador pueda continuar o revisar el trabajo. Se actualiza después de cada avance importante.

**Entrega:** 13 de noviembre de 2026, 9:00 a. m. (America/Mexico_City)
**Última actualización:** 2026-11-12 ~15:05
**Repo:** https://github.com/ddiegocchavez/greenpath (privado)

Leyenda: ✅ probado · 🔧 en curso · 📋 pendiente · ⚠️ problema

---

## Siguiente paso

1. Navegación con las **3 pestañas**: Monitor · Reducir sin gastar · Eventos sostenibles, con la paleta de verdes (`theme/colors.ts`).
2. Supabase: tablas, RLS y Edge Function `sync` (contrato v1).
3. Monitor → enviar el resumen a Supabase y probar que repetir no duplica.

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
| 11-12 | El uso se calcula sumando eventos por **activity** desde las 00:00 locales; se excluyen launcher y asistentes del sistema, como Bienestar digital. |

## Funciones implementadas

| Función | Estado |
|---|---|
| Entorno Android (JDK 17, SDK 36, emulador API 35 con WHPX) | ✅ el emulador arranca Android 15 en ~40 s |
| App Expo base (SDK 58, RN 0.88, TypeScript) | ✅ compila (debug) e instala en el emulador |
| `expo-android-usagestats` 1.2.0 con Expo 58 | ✅ compila y funciona |
| Lector de uso `features/usage/usageReader.ts` | ✅ estados ok / sin permiso / vacío / error |
| Pantalla temporal `screens/UsageDebugScreen.tsx` | ✅ se reemplazará por la pestaña Monitor |
| Paleta `theme/colors.ts` | ✅ definida, aún no aplicada en pantallas |
| Contrato de sincronización v1 | ✅ definido (`shared/contrato/`), sin implementar |
| Supabase, Edge Function, catálogo, web | 📋 |

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

## Entorno local (máquina de Diego)

- JDK: `C:\Program Files\Microsoft\jdk-17.0.21.21-hotspot` (`JAVA_HOME`)
- Android SDK: `%LOCALAPPDATA%\Android\Sdk`, usado a través del enlace sin espacios **`C:\Android\Sdk`** (`ANDROID_HOME`)
- Emulador: `emulator -avd huella_api35` (Pixel 6, 2 GB RAM)
- No se usa el IDE de Android Studio para ahorrar RAM (16 GB en total).
