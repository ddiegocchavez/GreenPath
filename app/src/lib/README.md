# lib/ — Lógica sin interfaz

- `tipos.ts` — tipos del catálogo y del flujo.
- `supabase.ts` — cliente con llave pública (la sesión anónima se guarda en el navegador) y `cargarCatalogo()`.
- `cuenta.ts` — cuenta anónima, perfil, plan demo, créditos, optimizaciones, gasto real, compensación, revisiones, cerrar sesión y borrar datos (funciones RPC de Supabase).
- `optimizar.ts` — algoritmo (incluye `evaluarAlternativas`: sustitutos que bajan costo y CO₂e):
  - Primero lo más barato; si sobra presupuesto, sube P o S donde cada peso rinde más.
  - Recorte si no alcanza.
  - Evalúa cada tienda y cada pareja.
  - Elige la presentación según el precio pagado.
- `perfil.ts` — encuesta → diagnóstico → plan recomendado, más:
  - Preferencias aplicadas al catálogo.
  - Alternativas equivalentes (res → frijol o pollo).
  - Ajuste de la lista por la revisión del periodo.
- `ticket.ts` — OCR en el navegador (Tesseract.js) y lector que aprende del catálogo (IDF, marcas, abreviaturas) y de tus correcciones. Lee columnas y total.
- `geo.ts` — distancia y sucursal más cercana.
- `impacto.ts` — desglose por producto de cada despensa, acumulado para el dashboard y tips de CO₂ con fuente que rotan.
