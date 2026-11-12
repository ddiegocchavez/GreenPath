# GreenPath — Metodología de cálculo de carbono (MVP)

## Alcance y fuentes

Los cálculos de alimentación se realizan localmente sin IA. Factores promedio globales de emisiones del ciclo de vida alimentario basados en Poore, J. y Nemecek, T. (2018), *Reducing food's environmental impacts through producers and consumers*, Science 360(6392), 987–992, recopilados por Our World in Data: https://ourworldindata.org/grapher/ghg-per-kg-poore . Estos factores son **promedios globales**, no representan un proveedor específico de México.

- Carne de res de ganado de carne: 99.48 kg CO2e/kg
- Pollo: 9.87 kg CO2e/kg
- Legumbres genéricas (proxy de frijoles): 1.79 kg CO2e/kg
- Tomate: 2.09 kg CO2e/kg
- Maíz (proxy de tortillas): 1.70 kg CO2e/kg
- Arroz: 4.45 kg CO2e/kg

Los proxies no deben presentarse como factores exactos de frijoles preparados o tortillas procesadas. Revisar versiones, licencias y definiciones originales antes de publicar cifras finales. El factor de carne de res no representa todos los tipos de carne bovina.

## Cálculo

Huella estimada del menú = suma de (masa de ingrediente en kg × factor en kg CO2e/kg).

La referencia es un menú tradicional hipotético para el mismo número de invitados. Diferencia = huella referencia - huella menú elegido. Esta diferencia es una **comparación potencial**, no reducción real demostrada. Los menús no están diseñados para tener equivalencia nutricional. Cantidades y precios son ilustrativos.

Para desperdicio: huella de producción incorporada en lo desechado = gramos desechados / 1000 × factor alimentario. NO suma emisiones por disposición final, NO contabiliza automáticamente emisiones evitadas, y no debe sumarse nuevamente a la huella del menú sin explicar el doble conteo.

## Actividad digital

Android UsageStatsManager mide tiempo de uso; no mide por sí solo energía ni CO2e. Se conserva el indicador como actividad observada. Se añadió calculadora **manual de escenario eléctrico**: kWh × kg CO2e/kWh, sin factor prellenado ni atribución automática a una app. El usuario debe aportar un factor con fuente, región y año. No se asignan puntos de carbono a minutos de pantalla.

Referencia de contexto: IEA, *The carbon footprint of streaming video: fact-checking the headlines*, https://www.iea.org/commentaries/the-carbon-footprint-of-streaming-video-fact-checking-the-headlines . No usar cifras históricas de streaming como factores universales actuales.

## Evidencia y niveles de afirmación

1. **Medido**: tiempo de apps, número de invitados y gramos registrados por el usuario (autodeclarados).
2. **Estimado**: huella alimentaria mediante factores globales; escenarios eléctricos ingresados manualmente.
3. **Potencial**: diferencia entre dos menús hipotéticos.
4. **Reducción conseguida**: NO disponible en el MVP. Requiere definir línea base, comprobar compras y consumos, controlar sustitución y evitar doble conteo.

No otorgar recompensas por kg CO2e evitados hasta validar metodología y acciones. Se pueden mantener puntos de participación claramente diferenciados de los de impacto ambiental.

## Persistencia

Los planes de evento y un registro de alimento desechado por plan se almacenan localmente mediante AsyncStorage, sin Supabase. No están sincronizados entre dispositivos y pueden perderse al borrar los datos de la app.

## Pendientes

- Revisar datos regionales, variabilidad y unidad de producto (crudo/cocido).
- Catálogo de precios reales por tienda/fecha y porciones validadas.
- Registro separado de comprado, consumido, guardado y desechado para múltiples alimentos.
- Línea base observada y reglas verificables para impacto y recompensas.
- Modelo digital específico de dispositivo/red/electricidad con fuentes recientes y rangos de incertidumbre.
- Pruebas en emulador/dispositivo Android, integración con Supabase si se desea sincronización.
