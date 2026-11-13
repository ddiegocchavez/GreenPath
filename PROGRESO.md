# PROGRESO — GreenPath

Hackatón Monterrey · entrega **13-nov-2026 09:00 (CDMX)**.

## Siguiente paso
1. Preparar el pitch y la demo:
   - Recorrido: encuesta → diagnóstico → Plus demo → lista → aceptar res → frijol → guardar → Mi valor.
   - Después: registrar lo que pagaste → ahorro comprobado.
2. Probar más tickets reales (Walmart y Costco) y agregarlos a `app/tests/ticket-real.test.mjs`.
3. Pendiente para después del hackatón:
   - **Módulos:** Eventos (recuperar del historial de git), Negocios y consumo digital (app Android).
   - **Pagos y créditos:** créditos sueltos de "Análisis individual", y pasarela de pago real con autorización.

## Ajustes de interfaz (13-nov-2026)
- **"Cerrar sesión"** arriba a la derecha en las 2 primeras pantallas (nombre y ubicación).
  - Pide confirmación en pantalla, porque la cuenta es anónima: al salir empiezas de cero.
  - Sirve para pasar la demo a otra persona.
  - Probado en producción: regresa a "¿Cómo te llamas?" como usuario nuevo.
- **Pantallas centradas:** "¿Cómo te llamas?" y "¿Dónde estás?" quedan al centro vertical, con los botones debajo.
- **Documentación actualizada:** README raíz (funciones, flujo con onboarding, arquitectura con cuentas y créditos, pruebas) y los README de `app/`, `components/` y `lib/`.

## Onboarding y modelo freemium (13-nov-2026, madrugada)
**Decisiones de Diego:**
- Consumo digital queda fuera de la web.
- Cuenta anónima.
- Prioridad: primero Mi Ahorro + Gratis/Plus, luego Cotidiano.
- El diseño actual se conserva; no se aplicó la paleta nueva del prompt.

**Implementado:**
- **Cuenta anónima de Supabase** (sin correo). Se activó `enable_anonymous_sign_ins` en `supabase/config.toml` con `config push`.
- **Migración `usuarios_planes_creditos`:**
  - **Tablas:** `planes` (configurable: precio, optimizaciones incluidas, umbral de compensación), `perfiles`, `optimizaciones`, `movimientos_credito` (libro mayor con `idem_key` única) y `revisiones`.
  - **RLS:** cada usuario solo accede a lo suyo. El plan y los créditos solo cambian mediante funciones del servidor; el cliente no puede escribir `plan`.
  - **Funciones:** `mi_estado`, `cambiar_plan_demo`, `guardar_optimizacion` (idempotente, consume 1 crédito en Plus), `registrar_gasto_real` (ahorro comprobado), `evaluar_compensacion` (una vez por análisis, si el ahorro estimado es menor al umbral) y `borrar_mis_datos`.
- **Encuesta de una sola vez** (`components/onboarding/Encuesta.tsx`):
  - **Preguntas:** uso, personas (1–15), frecuencia, gasto, problemas y qué no cambiar.
  - **Detalle extra:** restricciones (vegetariano, sin lactosa), supermercados habituales y marcas.
  - **Navegación:** barra de progreso y botón para regresar.
- **Diagnóstico y recomendación de plan** (`lib/perfil.ts`), por reglas y sin inventar ahorros:
  - **Plus:** se sugiere si hay ≥ 2 compras al mes, si cuesta ≤ 5 % del gasto mensual y si hay algún problema de planeación.
  - **Análisis individual:** si compras 1 vez al mes.
  - **Eventos y Negocios:** cuando ese es el uso elegido.
  - **Gratis:** en cualquier otro caso.
- **Propuesta Gratis vs Plus** ($99, 4 optimizaciones). Dice "Modo demostración: sin cobro" y no usa urgencia artificial.
- **Resultados:**
  - **Preferencias aplicadas:** supermercados, sin P4 si la calidad no se cambia, sin lactosa, vegetariano y marcas.
  - **Comparación:** la lista habitual (tu súper habitual o tu ticket) contra la optimizada, en pesos y CO₂e.
  - **Alternativas:** se pueden aceptar o rechazar, y las rechazadas no se repiten.
  - **Gratis vs Plus:** Gratis muestra la comparación por tienda y una vista previa de Plus calculada con los mismos precios; Plus hace la optimización completa.
  - **Guardar:** botón idempotente.
- **Mi valor GreenPath** (`components/MiValor.tsx`):
  - **Tu dinero:** gasto de referencia, costo optimizado, ahorro potencial (estimado), ahorro comprobado, desperdicio (registrado por el usuario), costo de Plus (demo) y beneficio neto. Cada valor lleva su etiqueta.
  - **Tu huella:** CO₂e de la referencia contra la alternativa.
  - **Historial:** registrar lo que pagaste, revisión del periodo (agotados, desperdiciados, sobrantes) y "Repetir lista (ajustada)".
  - **Créditos:** movimientos, compensación y botón para cancelar Plus sin perder el historial.
  - **Tus datos:** editar respuestas y borrar todo.
- **Pruebas:**
  - `npm test`: 22/22 (incluye 7 nuevas de perfil, plan, preferencias, alternativas, CO₂e y revisión).
  - `supabase/tests/planes_e2e.mjs`: **18/18 contra Supabase real**, incluida la RLS entre dos usuarios.
  - Recorrido completo probado en https://coolproject-henna.vercel.app/.

## Lector de ticket v2 (13-nov-2026, madrugada)
- **El problema:** con el ticket real de H-E-B (foto de Diego), la v1 solo acertó 1 de 2 renglones reconocidos. Leyó "LECHE VEG AVENA OATLY" como *Avena en hojuelas*, porque los tickets no usan el nombre genérico, sino marca y abreviaturas.
- **La solución:** el lector aprende del catálogo y de las correcciones.
  - **Catálogo:** cada título capturado sirve de ejemplo de cómo se nombra un producto.
  - **Peso por palabra:** pesan más las palabras raras (IDF), y aún más si son marca (Oatly → bebida vegetal).
  - **Abreviaturas:** se reconocen como prefijos ("CLA" → Clara, "VEG" → vegetal, "DESLACTOSAD" → deslactosada).
  - **Columnas:** lee CANT · PRE.UNIT · TOTAL y solo las usa si cuadran.
  - **Errores del OCR:** "7506R" se interpreta como "750GR", y renglones de pago como "TUA16%" se descartan.
  - **Correcciones:** si cambias el producto de un renglón, o asignas uno que no se reconoció, se guarda en el teléfono. La próxima vez ese texto se reconoce directo.
- **El resultado:** con la salida REAL de Tesseract sobre la foto, reconoce **6/6 artículos con su precio y 0 renglones basura** (prueba automática).
- **Catálogo ampliado:** 39 productos y 253 ofertas.
  - Se agregaron harinas, tortilla de harina, cereal, galletas, bebida vegetal, crema, mantequilla, jamón, salchicha, sal, mayonesa, puré, consomé, quitamanchas, lavatrastes y cloro.
  - También leche deslactosada y Cottonelle.
- **Publicada:** https://coolproject-henna.vercel.app/ (Vercel, se actualiza con cada push a `main`).

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
| ~~Sin cuentas ni datos personales en el servidor~~ → cuenta anónima (13-nov) | Historial, créditos y plan necesitan servidor. Sin correo ni pago; RLS por usuario; borrar todo desde la app. El ticket sigue sin subirse. |
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
| `presentacionPorPrecio` | `app/src/lib/optimizar.ts` | Si el ticket no dice la presentación, usa la del catálogo más parecida al precio pagado. |
| `construirIndice`, `emparejar`, `extraerColumnas`, `aprender` | `app/src/lib/ticket.ts` | Lector de ticket que aprende del catálogo y de las correcciones. |
| `diagnosticar`, `recomendarPlan`, `gastoMensual` | `app/src/lib/perfil.ts` | Diagnóstico y plan por reglas. |
| `aplicarPreferencias`, `alternativasPara`, `aplicarAlternativas`, `ajustarPorRevision` | ídem | Preferencias, alternativas equivalentes y ajuste por la revisión del periodo. |
| `asegurarSesion`, `guardarPerfil`, `miEstado`, `cambiarPlanDemo`, `guardarOptimizacion`, `registrarGastoReal`, `evaluarCompensacion`, `guardarRevision`, `cerrarSesion`, `borrarMisDatos` | `app/src/lib/cuenta.ts` | Cuenta anónima, plan, créditos e historial. |

## Pruebas
| Prueba | Resultado |
|---|---|
| `npm test` (algoritmo, lector de ticket con ticket real de H-E-B, perfil, plan, preferencias, alternativas, CO₂e y revisión) | 22/22 ✅ |
| `supabase/tests/planes_e2e.mjs` (Supabase real: plan demo, créditos, doble cobro, compensación, RLS y borrado) | 18/18 ✅ |
| `tsc --noEmit` y `eslint` | ✅ |
| Recorrido en producción: encuesta → Plus demo → lista → alternativa → guardar → Mi valor → cerrar sesión | ✅ |
| Ticket real de H-E-B en producción (foto) | ✅ 6/6 productos, precios y total |

## Problemas pendientes
- **Frutas y verduras a granel:** casi no hay en línea (no salieron jitomate, plátano ni limón).
- **Usuarios de prueba:** la prueba E2E crea cuentas anónimas vacías en Supabase Auth (sus datos se borran al terminar).
- **Precios vigentes:** son del 12 y 13-nov y en tienda pueden variar. Para la siguiente versión falta un proceso de actualización.
- **Precio de Walmart:** es el general en línea; no se fijó sucursal.
- **Tickets reales:** el OCR con tickets térmicos arrugados va a fallar más. La pantalla de revisión lo mitiga.
- **`C:\greenpath`:** carpeta local vieja que Diego debe borrar a mano.

## Archivos
- `app/`: web móvil (pantallas en `src/components`, lógica en `src/lib`, pruebas en `tests`).
- `data/`: capturas, sucursales y generador.
- `supabase/`: migraciones (catálogo, usuarios, planes y créditos), `config.toml` (cuentas anónimas) y `tests/planes_e2e.mjs`.

## Entorno local
- `.env` (raíz, no versionado): `SUPABASE_DB_PASSWORD`.
- `app/.env.local` (no versionado): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_KEY` (publishable).
- Regenerar catálogo: `node data/generar-seed.mjs > supabase/migrations/<ts>_datos_catalogo.sql` y luego `db push --remote`.
