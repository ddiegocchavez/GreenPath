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

## Tickets H-E-B #3 y #4 (13-nov-2026, madrugada)
- **#3** (frutas y verduras): **4/4** con precio (aguacate, plátano, pepino, limón). El "Cobro Estacionamiento" se descarta.
- **#4** (foto difícil: dedo, ángulo y brillo): el OCR pierde varios precios. El lector reconoce 13 renglones de producto.
  - **"MLD DULCE DE LECNE":** queda en "¿Qué es esto?" para que el usuario lo enseñe.
  - **El champiñón:** se pierde, porque el OCR lo leyó "Gunyo eco".
  - **Precios mal leídos:** algunos salen mal (pepino 39.09 en lugar de 39.29; galletas 31.0 en lugar de 37.90). El usuario los corrige en la revisión.
- **Lector:**
  - **Bloque de artículos:** si detecta el bloque ("ARTICULO CANT…" → "ARTICULOS COMPRADOS"), solo lee ahí; el encabezado y el pie nunca cuentan.
  - **Productos sin precio legible:** dentro del bloque, un producto con coincidencia fuerte (confianza ≥ 0.5) se conserva aunque no se lea su precio.
  - **Ruido nuevo:** promociones ("2X99 EN…", que el OCR lee "2499 EN" o "2)99 EN"), estacionamiento, IEPS y descuento.
- **Catálogo: 56 productos.** 10 nuevos **sin precio todavía** (limón, plátano, pepino, espinaca, champiñón, helado, queso feta, galletas multigrano, shampoo, ron). Se reconocen en el ticket y muestran "Precio no disponible". La extensión de Chrome estaba desconectada para capturar sus precios.
- **Pruebas:** `npm test` **42/42**, con los 4 tickets reales de H-E-B como pruebas automáticas (sin datos de cuenta ni folios).

## Cuatro modalidades: Gratis, Individual, Flex y Plus (13-nov-2026)
| Plan | Precio (demo) | Análisis completos |
|---|---|---|
| Gratis | $0 | 0: diagnóstico y comparación básica |
| Individual | $29 por pago | 1 por pago, cuando lo necesites |
| Flex | $59 al mes | 2 al mes |
| Plus | $99 al mes | 4 al mes |

- **Configurable:** precios y análisis incluidos están en `public.planes` (columna `tipo`: gratis, pago_unico o suscripcion). Sin pagos reales.
- **Encuesta:** nuevo paso opcional "¿Qué compras normalmente?" que se guarda en `perfiles.lista_habitual`. Esa lista se puede reutilizar en "Usar mi lista habitual".
- **Recomendación con datos verificables** (`perfil.recomendarPlan` + `valor.extraAvanzado`):
  - **Ahorro adicional por compra:** análisis completo (combina tiendas y la mejor alternativa ganar-ganar) contra el básico, con la lista habitual, precios reales y solo productos cubiertos en ambos.
  - **Beneficio neto mensual por plan:** ahorro × análisis que usarías (según tu frecuencia y los incluidos en el plan) − costo.
  - **Se recomienda** el mayor beneficio neto positivo. Si no hay lista o ningún plan da beneficio, se recomienda **Gratis**.
  - **Despensa mensual estable** (≤ 1 compra al mes): solo Gratis o Individual, nunca una suscripción.
- **Propuesta:** tabla por plan con costo, análisis, ahorro adicional, neto y CO₂e por mes, más lo que incluye cada uno.
- **Resultados:**
  - **Gratis:** comparación básica. El detalle, las alternativas y guardar requieren comprar un análisis Individual ($29) o tener Flex o Plus.
  - **Tabla de venta:** usa el ahorro real de esa lista para comparar los planes según tu frecuencia.
- **Servidor:** `guardar_optimizacion` cobra Individual (demo) o consume 1 análisis de Flex o Plus. `cambiar_plan_demo` acepta gratis, flex y plus. Se corrigió la asignación mensual para que no se duplique a quien ya tenía Plus.
- **Hallazgo de precios:** con Individual a $29 y Flex a $59, **Flex nunca conviene**, porque 2 Individuales cuestan $58. El algoritmo no lo recomienda. Para que Flex tenga sentido debería costar menos de $58 (por ejemplo $49) o Individual más de $29.5. Es configurable.
- **Pruebas:**
  - `npm test` **40/40**: recomendación de los 4 planes (sin datos, mensual estable, quincenal, semanal), equivalencia de despensas, compra incompleta y ajuste a presupuesto.
  - E2E **22/22**: Flex asigna 2, Individual no es suscripción, Individual cobra $29 demo y Plus asigna 4.
- **Falta verificar en el navegador:** la extensión de Chrome sigue desconectada.

## Comparación justa y Plus con valor medible (13-nov-2026)
**Errores encontrados y corregidos (inflaban el ahorro):**
1. **Recorte automático:** si el presupuesto no alcanzaba, la app quitaba paquetes y comparaba el ticket completo contra la lista recortada. **Ahora:** no se recorta nada en automático. Se advierte cuánto falta, se propone un ajuste y solo se aplica si el usuario lo acepta; en ese caso ambas listas usan la versión ajustada.
2. **Faltantes como ahorro:** un producto sin precio en línea (fresa, blueberry) bajaba el total "optimizado". **Ahora:** `compararCubiertos` solo suma productos con precio en ambas listas y muestra aparte los que no se comparan. Eso es lo que se guarda (`productos_excluidos`).

**Plus = análisis más profundo, medido con los mismos datos:**
- **"Lo que te dio Plus en esta compra":** modelo básico (la tienda más barata para todo, sin alternativas) contra el resultado Plus, en pesos y CO₂e, sobre la misma lista y precios. Se guarda como `ahorro_adicional_plus` y se suma en Mi valor.
- **Distribución del presupuesto:** por categoría, con sobrante o faltante. Si al usuario se le terminan productos, sugiere reservar lo que sobra para reponer.
- **Prevención de desperdicio:** la siguiente despensa ajusta cantidades con la revisión (solo Plus); Gratis ve el aviso de que Plus lo haría.
- **Revisión del periodo:** al volver a la app, si la última despensa guardada no tiene revisión, se preguntan 3 cosas: qué se terminó, qué sobró y qué se desperdició (`components/RevisionRapida.tsx`).

**Pruebas:**
- `npm test` **36/36**. Nuevas: Gratis vs Plus con los mismos datos (Plus nunca peor, extra medible), una compra incompleta no es ahorro, el ajuste a presupuesto se compara sobre la misma lista, comparación justa y distribución del presupuesto.
- E2E contra Supabase **19/19**.
- Tipos y lint sin errores.
- **Falta verificar en el navegador:** la extensión de Chrome se desconectó antes de probar este flujo en producción.

**Pendiente:** ajustar cantidades por número de personas sin historial requeriría datos de consumo por persona con fuente, y no los inventamos. Hoy las cantidades se ajustan con el historial de revisiones del propio usuario.

## Gratis vs Plus: "¿Quieres ahorrar más? Paga más" (13-nov-2026)
- **Modelo básico (Gratis):** la tienda más barata para toda tu lista. No combina tiendas ni aplica alternativas.
- **Modelo avanzado (Plus):** combina tiendas, aplica alternativas ganar-ganar (ver cuáles y aceptarlas), sube calidad o sustentabilidad con el presupuesto y aprende de las revisiones.
- **De dónde sale la diferencia de ahorro:** son funciones reales del modelo avanzado. A Gratis **nunca** se le muestran precios peores; mostrarle resultados peores a propósito sería engañoso (Ley Federal de Protección al Consumidor).
- **Tarjeta de venta en Gratis:**
  - "Estás dejando $X sobre la mesa en esta compra" y los kg de CO₂e que podrías evitar. Se calcula con el modelo avanzado sobre la misma lista y los mismos precios.
  - Alternativas bloqueadas 🔒 con su ahorro, proyección mensual si repites la compra (marcada como estimado) y botón para activar Plus (demo).
  - **Sin manipulación:** no hay urgencia falsa, reseñas inventadas ni ahorros que no existen.

## Dashboard, tips y alternativas ganar-ganar (13-nov-2026)
- **Dashboard** (`components/Dashboard.tsx`, en Mi valor):
  - Cada despensa guardada registra su desglose por producto: antes/después en pesos y kg CO₂e (columna `optimizaciones.detalle`, migración `detalle_por_producto`).
  - Muestra el total ahorrado y el CO₂e reducido, dos gráficas de barras por producto (pesos y CO₂e por separado) y una tabla por despensa.
  - Donde no hay referencia o factor muestra "—": no se inventa.
- **Tip para reducir CO₂ en alimentos** en cada resultado (`lib/impacto.ts`):
  - Primero vienen los tips de tu lista, con los factores del catálogo: qué producto aporta más CO₂e y comparaciones como res vs frijol, leche vs avena o arroz vs papa. Después, tips generales con fuente OWID (transporte, desperdicio, empaque).
  - No se repite hasta ver todos (se guarda en el teléfono) y tiene un botón para "Otro tip".
- **Algoritmo ganar-ganar** (`optimizar.evaluarAlternativas`):
  - Busca sustitutos de la misma función en estos grupos: proteína, bebida, guarnición y tortilla.
  - Compara con la misma cantidad y el precio más bajo en tus tiendas.
  - Propone primero los que bajan **costo y CO₂e**, después los que solo bajan CO₂e, y nunca más huella.
  - Respeta vegetariano, lo rechazado y una alternativa por producto.
- **Pruebas:** `npm test` 31/31.

## Ticket #2, pago por análisis y calidad con nombres (13-nov-2026)
- **Ticket real de H-E-B #2** (15 artículos, foto en el carrito):
  - **Reconocimiento:** 15 de 15 productos, cantidades y totales, sin renglones basura. Está como prueba automática y se verificó en producción.
  - **Lector:** ahora tolera cantidad pegada al precio ("815,50" = 8 × 15.50), decimales perdidos y palabras con una letra cambiada ("CONSONE", "Natual").
  - **Ruido descartado:** "T0A16%", "ahorro/rebajados", montos sueltos y el pie del ticket. También se descartan renglones sin importe.
- **Catálogo:** se agregaron miel, Salmas, queso manchego, queso cottage, bolsas de basura, Chobani/Oikos, Tomatísimo y pechuga de pavo, para un total de 283 ofertas.
  - **Sin precio en línea:** fresa y mora azul (blueberry) frescas no se venden en línea; solo hay congeladas o rebanadas y no se comparan. Se reconocen en el ticket y se muestran como "Precio no disponible".
- **Pago por análisis (pedido de Diego):**
  - **Bloqueo en Gratis:** en Gratis se ven los totales por tienda, pero el detalle por producto (qué comprar en cada tienda) y guardar en el historial requieren pagar **$5 por análisis** o tener Plus.
  - **Servidor:** lo valida `guardar_optimizacion(p, idem, p_pago_demo)` (migración `pago_por_analisis`). El precio se configura en `planes.precio_analisis_mxn`.
  - **Modo demostración:** no hay cobro real; para cobrar hace falta conectar una pasarela de pago con autorización de Diego.
- **Capturas de pantalla:** una web no puede bloquearlas (ningún navegador lo permite). La medida real es no mostrar el detalle en Gratis. Solo una app Android nativa podría bloquearlas, con FLAG_SECURE.
- **Calidad con nombres:** Premium · Superior · Normal · Estándar (gris) en lugar de P1–P4. Los motivos del catálogo se regeneraron (migración `datos_catalogo_v4`).
- **Pruebas:** `npm test` 24/24 y E2E 19/19, incluido que en Gratis no se guarda sin pagar.

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
