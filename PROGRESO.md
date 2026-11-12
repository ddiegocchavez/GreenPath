# PROGRESO · GreenPath

Bitácora para que cualquier colaborador pueda continuar o revisar el trabajo. Se actualiza después de cada avance importante.

**Entrega:** 13 de noviembre de 2026, 9:00 a. m. (America/Mexico_City)
**Última actualización:** 2026-11-12 ~14:30

Leyenda: ✅ probado · 🔧 en curso · 📋 pendiente · ⚠️ problema

---

## Siguiente paso

1. Diego: `! gh auth login --web --git-protocol https` → crear repo **privado** `greenpath` y subir `main`.
2. **D1:** compilar `mobile/` con `npx expo run:android` en el emulador `huella_api35` y mostrar uso real por app.

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

## Funciones implementadas

| Función | Estado |
|---|---|
| Entorno Android (JDK 17, SDK 36, emulador API 35 con WHPX) | ✅ el emulador arranca Android 15 en ~40 s |
| App Expo base (SDK 58, RN 0.88, TypeScript) | 🔧 creada, sin compilar |
| `expo-android-usagestats` 1.2.0 | 🔧 instalado, sin compilar ni validar |
| Contrato de sincronización v1 | ✅ definido (`shared/contrato/`), sin implementar |
| Supabase, Edge Function, catálogo, web | 📋 |

## Pruebas realizadas

| Prueba | Resultado |
|---|---|
| `emulator -accel-check` | ✅ WHPX instalado y usable |
| Arranque del AVD `huella_api35` | ✅ `sys.boot_completed=1`, Android 15 |
| Servicio `usagestats` presente en el emulador | ✅ responde a `dumpsys` |
| Lectura de uso desde nuestra app | 📋 no probada |

## Problemas pendientes

- ⚠️ `expo-android-usagestats` se publicó con Expo 53; usamos Expo 58. Compatibilidad sin verificar.
- ⚠️ Los intervalos diarios de `queryUsageStats` pueden no alinearse con la medianoche local; preferir sumar eventos desde las 00:00.
- ⚠️ En PowerShell, `sdkmanager` corta los nombres con `;`: usar `--package_file`.
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
| `mobile/` | App Expo base; `App.tsx` movido a `src/App.tsx` |

## Entorno local (máquina de Diego)

- JDK: `C:\Program Files\Microsoft\jdk-17.0.21.21-hotspot` (`JAVA_HOME`)
- Android SDK: `%LOCALAPPDATA%\Android\Sdk` (`ANDROID_HOME`)
- Emulador: `emulator -avd huella_api35` (Pixel 6, 2 GB RAM)
- No se usa el IDE de Android Studio para ahorrar RAM (16 GB en total).
