# GreenPath: MVP enfocado en carbono

## Implementado
- Navegacion principal reorganizada en Mi impacto, Reducir y Mi progreso.
- Modulo nuevo de alimentacion accesible desde Reducir.
- Inventario de 12 ingredientes con persistencia local en AsyncStorage.
- Recomendador determinista de seis recetas, ordenadas por ingredientes disponibles y faltantes.
- Informacion honesta sobre CO2e: sin cifras inventadas, sin confundir tiempo de pantalla con emisiones evitadas.
- Monitor Android, sincronizacion Supabase, puntos, y modulo Eventos preservados en el codigo.

## Alcance y limitaciones
- La despensa es local al dispositivo, no se sincroniza entre cuentas.
- Las recetas son sugerencias y no comprueban desperdicio evitado.
- No hay calculo alimentario de CO2e ni integracion con inventarios/precios reales de supermercados.
- Los puntos actuales siguen correspondiendo a reduccion de tiempo de pantalla, NO a reduccion verificada de CO2e.
- Las alianzas con negocios son una propuesta, no acuerdos establecidos.

## Proximos pasos
1. Validar factores de emision alimentarios por producto y unidad con fuente, limites y version.
2. Registrar cantidades consumidas y desperdiciadas; definir linea base para medir cambios.
3. Validar metodologia de huella digital; no convertir minutos a CO2e sin evidencia.
4. Incorporar filtros por presupuesto, precios verificables y comparaciones de productos.
5. Disenar puntos vinculados a acciones verificadas y reglas antiabuso.

## Ejecucion
Desde mobile: `npm ci`, configurar `.env` segun `.env.example`, y ejecutar el flujo Expo/Android del README. El monitor de uso necesita permisos nativos Android.

## Verificacion
No se ejecutaron compilacion ni pruebas automatizadas en este entorno porque no estan instaladas las dependencias node_modules. Probar en Android antes de la presentacion.
