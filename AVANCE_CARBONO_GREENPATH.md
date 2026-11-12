# GreenPath — estado de implementación del motor de carbono

## Hecho
1. Motor determinista `mobile/src/features/carbon.ts` con factores alimentarios globales documentados y validación de unidades.
2. Comparador de menús en `mobile/src/screens/EventsScreen.tsx`, con cantidades por invitados, presupuesto y emisiones estimadas por ingrediente.
3. Registro de un alimento desechado por evento y su huella incorporada; diferencia entre residuos y sobrantes conservados.
4. Persistencia local de eventos con AsyncStorage (`mobile/src/features/eventStorage.ts`).
5. Escenario manual de electricidad en `mobile/src/screens/MonitorScreen.tsx`; no se infiere CO2e desde minutos de uso.
6. Metodología, limitaciones y fuentes en `docs/CARBON_METHODOLOGY.md`.
7. Ocho pruebas unitarias en `mobile/tests/carbon.test.mjs`, ejecutadas satisfactoriamente con Node 22.

## Falta
1. Compilar y probar en Android con `npm ci` y `npx expo run:android`. La instalación offline falló por dependencias no cacheadas, por lo que NO se ha verificado la compilación de React Native.
2. Validar y actualizar factores según versión/fuente; datos regionales mexicanos y productos procesados.
3. Sustituir precios y porciones de demostración por datos verificables y registrar compra/consumo real.
4. Ampliar desperdicio a varios alimentos, cantidades compradas, consumidas, guardadas y desechadas.
5. Sincronizar eventos con Supabase y diseñar reglas de acceso, si se requiere sincronización multidispositivo.
6. Validar línea base y acciones para demostrar reducción conseguida y, solo después, conceder puntos ambientales.
7. Construir un modelo de emisiones digitales con dispositivo/red/consumo energético y rangos de incertidumbre.

## Cómo probar cálculos sin Android
Desde `mobile/` ejecutar: `node --experimental-strip-types --test tests/carbon.test.mjs` (Node 22).

## Cómo probar la app Android
Desde `mobile/`: `npm ci`, luego `npx expo run:android`. Se necesita Android SDK/emulador o dispositivo, variables de entorno de Supabase configuradas como en el proyecto original y permiso de estadísticas de uso para monitoreo.

## Advertencia
Los kg CO2e del comparador son **estimaciones** basadas en promedios globales y menús hipotéticos. No representan emisiones evitadas verificadas. No se asignan puntos por esta comparación.
