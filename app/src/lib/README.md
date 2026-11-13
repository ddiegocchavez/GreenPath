# lib/ — Lógica sin interfaz

- `tipos.ts` — tipos del catálogo y del flujo.
- `supabase.ts` — cliente con llave pública y `cargarCatalogo()` (solo lectura).
- `optimizar.ts` — algoritmo: lo más barato primero; si sobra presupuesto, sube calidad (P) o sustentabilidad (S) donde cada peso extra rinde más; recorte si no alcanza; evalúa cada tienda y cada pareja.
- `ticket.ts` — OCR en el navegador (Tesseract.js) y lectura de renglones: producto, precio, presentación y total.
- `geo.ts` — distancia y sucursal más cercana.
