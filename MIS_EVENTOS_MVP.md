# GreenPath: modulo Mis eventos (MVP)

Acceso: app movil > Reducir > Mis eventos: carne asada.

Incluye: invitados (2-30), presupuesto MXN, tres menus, seleccion de insumos existentes, costo ilustrativo, cantidades orientativas y registro local de sobrantes. No requiere IA ni nuevas tablas de Supabase.

**Limitaciones:** los precios y porciones son supuestos de demostracion, no precios de tiendas ni recomendaciones nutricionales. La comparacion de costos NO mide carbono. Los factores de emision no estan integrados: no se muestran kg CO2e inventados ni se entregan puntos por supuestas reducciones. Los datos no persisten al cerrar la pantalla. El registro de sobrantes no diferencia aun entre comida guardada y desperdiciada.

**Siguiente fase:** factores de emision por ingrediente con unidad, limites del sistema y fuente; precios de comercios con fecha; persistencia de eventos; registro de alimentos efectivamente consumidos, conservados y descartados; comparacion contra un escenario base documentado y puntos solo para acciones verificadas.

Para probar: `cd mobile`, `npm install`, `npx expo run:android` con SDK Android configurado. La app usa dependencias nativas y no puede probarse completamente en Expo Go.
