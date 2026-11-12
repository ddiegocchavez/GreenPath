# GreenPath - Avance v2: seguimiento real de alimentos en eventos

## Implementado
- Registro por evento de varios alimentos: gramos comprados, consumidos, guardados y desechados.
- Validacion de balance: consumido + guardado + desechado no puede superar comprado.
- Resumen de gramos y huella incorporada en los alimentos desechados (kg CO2e).
- Guardado local con AsyncStorage; eventos antiguos siguen accesibles.
- Seleccion de un evento historico para editar su seguimiento.
- Sin IA generativa, sin inventar reducciones verificadas ni otorgar puntos por escenarios.
- Pruebas unitarias del balance de masa y calculos.

## Limitaciones importantes
- No hay sincronizacion de los eventos con Supabase.
- No hay verificacion independiente de compras o desperdicios reportados.
- Los factores alimentarios son promedios globales; los proxies de frijoles/tortillas no son especificos de Mexico.
- La huella del alimento desechado no es equivalente a emisiones evitadas.
- No se incluyen coccion, transporte de invitados ni tratamiento final de residuos.
- No se ha validado la compilacion en Android en este entorno.

## Proximos pasos
1. Compilar en Android y verificar flujo completo.
2. Sincronizar con Supabase mediante tablas y RLS (con migraciones y pruebas).
3. Integrar factores mexicanos y precios actuales documentados.
4. Definir una metodologia verificable de reduccion conseguida y puntos.
5. Mejorar escenarios de consumo digital con datos energeticos fiables.

## Para probar
cd mobile
npm install
node --experimental-strip-types --test tests/carbon.test.mjs
node --experimental-strip-types tests/foodLedger.test.mjs
npx expo run:android
