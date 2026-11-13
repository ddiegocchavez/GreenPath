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

## Calidad (P1–P4)
| Nivel | Regla (según el título o la marca) |
|---|---|
| P1 Premium | Dice "orgánico". |
| P2 Superior | Atributo de valor declarado: libre pastoreo/jaula, selecto, premium, gourmet, artesano, griego, sirloin, supreme, extra virgen, albacora, basmati. |
| P3 Estándar | Marca reconocida sin atributos extra (incluye las marcas propias estándar: HEB, Kirkland, Marketside). |
| P4 Económica | Marca propia básica: Great Value, Aurrera, HCF, Mi Tienda. |

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

Atún, aguacate, yogurt, papel y detergente no tienen factor: se muestran sin huella.

Son clasificaciones de GreenPath a partir de lo que dice cada producto, no pruebas de laboratorio.
