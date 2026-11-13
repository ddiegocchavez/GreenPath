# PROGRESO — GreenPath

Hackatón Monterrey · entrega **13-nov-2026 09:00 (CDMX)**.

## Siguiente paso
1. Publicar en Vercel y probar en un teléfono real: ubicación, cámara y OCR con un ticket de verdad.
2. Ampliar la captura de precios: frutas y verduras, y más productos.
3. Preparar el pitch y la demo.

## Estado (12-nov-2026, noche)
- ✅ **Nueva idea:** reemplaza la app GreenPath de huella digital (Android).
  - Se borraron el proyecto Supabase anterior y el emulador.
  - Se reutiliza este repo.
- ✅ **Supabase `greenpath`** (`hrhojmruqjwpyfqalepx`):
  - Catálogo de solo lectura: 3 tiendas, 22 productos, 160 ofertas y 54 sucursales.
- ✅ **Web móvil** con el flujo completo, probada en el navegador:
  - **Lista:** 4 productos, $500, prioridad sustentabilidad. Recomienda Walmart + H-E-B a $398 y sube huevo, leche y frijol a orgánico (S1).
  - **Ticket** (imagen de prueba): el OCR leyó los 7 productos y sus precios. Con "Reducir" y prioridad precio, ahorras $40.30.

## Decisiones
| Decisión | Por qué |
|---|---|
| Web móvil en vez de app Android | No hay APK que compilar, se abre con un link y usa la cámara del teléfono. |
| Precios capturados a mano en las tiendas en línea | Las tiendas tienen protección anti-bots que no vamos a saltar, y la demo no puede depender de que una página responda en vivo. |
| OCR gratis en el navegador (Tesseract.js) | El usuario no quiso API de IA. La foto no sale del teléfono. Se agregó una pantalla de revisión porque el OCR se equivoca (leyó "606G" en vez de "60G"). |
| Sin cuentas ni datos personales en el servidor | El nombre, la lista y el ticket viven solo en memoria del navegador. |
| P1–P4 y S1–S4 por reglas explícitas | Reproducible y explicable. Cada oferta guarda el motivo de su nivel (ver `data/README.md`). |
| Costco incluido con aviso | Requiere membresía y en línea solo vende abarrotes en paquetes grandes. |

## Funciones
| Función | Archivo | Qué hace |
|---|---|---|
| `armarPlan` | `app/src/lib/optimizar.ts` | Elige la oferta más barata por producto y, si sobra presupuesto, mejora según la prioridad. |
| `recortarAPresupuesto` | ídem | Quita paquetes del renglón más caro hasta caber en el presupuesto. |
| `evaluar` | ídem | Prueba cada tienda sola y cada pareja, y las ordena. |
| `cantidadTipica` | ídem | Da la presentación más común de un producto. |
| `leerTicket`, `analizarTexto`, `extraerPrecio`, `extraerCantidad`, `extraerTotal`, `emparejarProducto` | `app/src/lib/ticket.ts` | OCR del ticket y lectura de cada renglón. |
| `masCercana`, `distanciaKm` | `app/src/lib/geo.ts` | Calculan la sucursal más cercana. |
| `cargarCatalogo` | `app/src/lib/supabase.ts` | Lee el catálogo de Supabase. |

## Pruebas
| Prueba | Resultado |
|---|---|
| `npm test` (algoritmo y lector de ticket, `app/tests/`) | 9/9 ✅ |
| `tsc --noEmit` y `eslint` | ✅ |
| Flujo de lista en Chrome (localhost) | ✅ |
| Flujo de ticket con imagen generada | ✅ OCR correcto salvo "606G" |

## Problemas pendientes
- **Frutas y verduras a granel:** casi no hay en línea (no salieron jitomate, plátano ni limón).
- **Precios vigentes:** son del 12-nov y en tienda pueden variar. Para la siguiente versión falta un proceso de actualización.
- **Precio de Walmart:** es el general en línea; no se fijó sucursal.
- **Tickets reales:** el OCR con tickets térmicos arrugados va a fallar más. La pantalla de revisión lo mitiga.
- **`C:\greenpath`:** carpeta local vieja que Diego debe borrar a mano.

## Archivos
- `app/`: web móvil.
- `data/`: capturas, sucursales y generador.
- `supabase/migrations/`: esquema y datos.

## Entorno local
- `.env` (raíz, no versionado): `SUPABASE_DB_PASSWORD`.
- `app/.env.local` (no versionado): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_KEY` (publishable).
- Regenerar catálogo: `node data/generar-seed.mjs > supabase/migrations/<ts>_datos_catalogo.sql` y luego `db push --remote`.
