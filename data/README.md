# data/ — Precios y clasificación

- `capturas/AAAA-MM-DD.tsv` — precios consultados a mano en las tiendas en línea (un renglón por artículo).
- `sucursales-osm.json` — sucursales de Walmart, H-E-B y Costco en Monterrey (OpenStreetMap, ODbL).
- `generar-seed.mjs` — aplica las reglas y genera la migración con el catálogo:
  `node data/generar-seed.mjs > supabase/migrations/<timestamp>_datos_catalogo.sql`

## Captura del 12-nov-2026
- **Walmart:** búsqueda en walmart.com.mx.
- **H-E-B:** heb.com.mx con la sucursal HEB Gonzalitos (Monterrey).
- **Costco:** costco.com.mx; en línea casi no vende perecederos, solo abarrotes en presentaciones grandes y con membresía.
- Se consultó navegando como cualquier persona, sin saltar protecciones. Los precios en tienda pueden variar.
- **Huecos:** frutas y verduras a granel, que casi no aparecen en línea.

## Calidad (4 niveles: premium, superior, normal, estándar)
| Nivel | Regla (según el título o la marca) |
|---|---|
| Premium (1) | Dice "orgánico". |
| Superior (2) | Atributo de valor declarado: libre pastoreo/jaula, selecto/seleccionado, premium, gourmet, artesano, griego, sirloin, supreme, extra virgen, albacora, basmati. |
| Normal (3) | Marca reconocida sin atributos extra (incluye las marcas propias estándar: HEB, Kirkland, Marketside). |
| Estándar (4, gris) | Marca propia básica: Great Value, Aurrera, HCF, Mi Tienda. |

## Sustentabilidad (S1–S4)
| Nivel | Regla |
|---|---|
| S1 Alta | Se vende como orgánico. En México ese término exige certificación (Ley de Productos Orgánicos). |
| S2 Buena | Atributo declarado sin certificación verificada: libre pastoreo/jaula, agroecológico, biodegradable, nacional. |
| S3 Convencional | Ninguno de los anteriores. |
| S4 Alto impacto | Convencional, y su tipo de alimento emite ≥ 20 kg CO₂e/kg (res, queso, café). |

Huella por tipo de alimento: Poore & Nemecek (2018), *Science*, vía [Our World in Data](https://ourworldindata.org/grapher/ghg-per-kg-poore). Valores usados (kg CO₂e/kg):
- **Proteína animal:** res 99.48, queso 23.88, pollo 9.87, huevo 4.67, leche 3.15.
- **Abarrotes y granos:** café 28.53, aceite de soya 6.32, arroz 4.45, azúcar de caña 3.20, avena 2.48, maíz 1.70, trigo 1.57.
- **Leguminosas y verduras:** leguminosas 1.79, cebolla 0.50, papa 0.46.

Desde la captura del 13-nov también: jamón y salchicha de pavo usan el factor de aves (9.87), harina de maíz y de trigo usan maíz (1.70) y trigo (1.57), y la bebida de avena usa el de leche de avena (0.9 por litro).

No tienen factor y se muestran sin huella:
- **Alimentos:** atún, aguacate, yogurt, crema, mantequilla, mayonesa, puré, consomé, galletas y cereal.
- **Hogar:** papel y limpieza.

## Capturas
| Archivo | Productos | Ofertas |
|---|---|---|
| `2026-11-12.tsv` | 22 base | 160 |
| `2026-11-13.tsv` | +17 nuevos, más deslactosadas y Cottonelle | 93 |

`productos.mjs` es la lista de productos genéricos con sus sinónimos. El generador la usa, y también las pruebas del lector de ticket.

Son clasificaciones de GreenPath a partir de lo que dice cada producto, no pruebas de laboratorio.
