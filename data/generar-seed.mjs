// Genera la migración con el catálogo: tiendas, sucursales (OSM), productos y ofertas clasificadas.
// Uso: node data/generar-seed.mjs > supabase/migrations/<timestamp>_datos_catalogo.sql
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CAPTURA = '2026-11-12';
const OWID = 'Poore & Nemecek (2018), vía Our World in Data: emisiones de GEI por kg de alimento';

const tiendas = [
  ['walmart', 'Walmart', 'https://www.walmart.com.mx', false, 'Precio en línea de walmart.com.mx; en tienda puede variar.', (q) => `https://www.walmart.com.mx/search?q=${q}`],
  ['heb', 'H-E-B', 'https://www.heb.com.mx', false, 'Precio en línea de heb.com.mx con la sucursal HEB Gonzalitos (Monterrey).', (q) => `https://www.heb.com.mx/search?q=${q}`],
  ['costco', 'Costco', 'https://www.costco.com.mx', true, 'Requiere membresía. En línea solo hay abarrotes en presentaciones grandes.', (q) => `https://www.costco.com.mx/search?text=${q}`],
];

// id, nombre, categoría, unidad, sinónimos (lista escrita / OCR), huella kg CO2e/kg (null = sin factor), término de búsqueda usado
const productos = [
  ['huevo', 'Huevo', 'Huevo y lácteos', 'pza', ['huevo', 'huevos', 'blanquillos'], 4.67, 'huevo blanco'],
  ['leche', 'Leche entera', 'Huevo y lácteos', 'l', ['leche'], 3.15, 'leche entera'],
  ['queso', 'Queso panela', 'Huevo y lácteos', 'kg', ['queso', 'panela'], 23.88, 'queso panela'],
  ['yogurt', 'Yogurt natural', 'Huevo y lácteos', 'kg', ['yogurt', 'yoghurt', 'yogur'], null, 'yogurt natural'],
  ['tortilla', 'Tortilla de maíz', 'Granos y cereales', 'kg', ['tortilla', 'tortillas'], 1.70, 'tortilla de maiz'],
  ['arroz', 'Arroz', 'Granos y cereales', 'kg', ['arroz'], 4.45, 'arroz'],
  ['pan', 'Pan de caja', 'Granos y cereales', 'kg', ['pan', 'pan de caja', 'pan blanco', 'bimbo'], 1.57, 'pan blanco'],
  ['sopa', 'Pasta para sopa', 'Granos y cereales', 'kg', ['sopa', 'pasta', 'fideo', 'spaghetti', 'codo'], 1.57, 'sopa de pasta'],
  ['avena', 'Avena en hojuelas', 'Granos y cereales', 'kg', ['avena'], 2.48, 'avena'],
  ['frijol', 'Frijol', 'Leguminosas', 'kg', ['frijol', 'frijoles'], 1.79, 'frijol pinto'],
  ['lentejas', 'Lentejas', 'Leguminosas', 'kg', ['lenteja', 'lentejas'], 1.79, 'lentejas'],
  ['pollo', 'Pechuga de pollo', 'Carnes y pescado', 'kg', ['pollo', 'pechuga'], 9.87, 'pechuga de pollo'],
  ['res', 'Carne molida de res', 'Carnes y pescado', 'kg', ['res', 'molida', 'carne molida', 'carne'], 99.48, 'carne molida de res'],
  ['atun', 'Atún en agua', 'Carnes y pescado', 'kg', ['atun', 'atún'], null, 'atun en agua'],
  ['cebolla', 'Cebolla', 'Frutas y verduras', 'kg', ['cebolla'], 0.50, 'cebolla blanca'],
  ['papa', 'Papa', 'Frutas y verduras', 'kg', ['papa', 'papas'], 0.46, 'papa'],
  ['aguacate', 'Aguacate', 'Frutas y verduras', 'kg', ['aguacate'], null, 'aguacate hass'],
  ['aceite', 'Aceite comestible', 'Abarrotes', 'l', ['aceite'], 6.32, 'aceite vegetal'],
  ['azucar', 'Azúcar', 'Abarrotes', 'kg', ['azucar', 'azúcar'], 3.20, 'azucar'],
  ['cafe', 'Café soluble', 'Abarrotes', 'kg', ['cafe', 'café', 'nescafe'], 28.53, 'cafe soluble'],
  ['papel', 'Papel higiénico', 'Hogar', 'pza', ['papel', 'papel higienico', 'higienico'], null, 'papel higienico'],
  ['detergente', 'Detergente en polvo', 'Hogar', 'kg', ['detergente', 'jabon en polvo'], null, 'detergente en polvo'],
];

// ---- Reglas de clasificación (documentadas en data/README.md) ----
const ORGANICO = /org[aá]nic/i;
const ATRIBUTO_SUST = /libre (de )?(pastoreo|jaula)|agroecol|biodegradable|nacional/i;
const PREMIUM = /libre (de )?(pastoreo|jaula)|selec(ta|to|cionado)|premium|gourmet|artesano|griego|sirloin|supreme|extra virgen|albacora|basmati|24 kilates/i;
const MARCA_ECONOMICA = /^(Great Value|Aurrera|HCF|Mi Tienda)$/i;
const MARCA_PROPIA = /^(Great Value|Aurrera|HCF|Mi Tienda|HEB|Marketside|Kirkland Signature)$/i;

function calidad(titulo, marca) {
  if (ORGANICO.test(titulo)) return [1, 'P1 Premium: producto orgánico.'];
  const m = titulo.match(PREMIUM);
  if (m) return [2, `P2 Superior: atributo de valor declarado ("${m[0]}").`];
  if (marca && MARCA_ECONOMICA.test(marca)) return [4, `P4 Económica: marca propia básica (${marca}).`];
  return [3, marca ? `P3 Estándar: marca reconocida (${marca}).` : 'P3 Estándar: producto sin atributos adicionales.'];
}

function sustentabilidad(titulo, huella) {
  if (ORGANICO.test(titulo)) return [1, 'S1 Alta: se vende como orgánico; en México ese término exige certificación (Ley de Productos Orgánicos).'];
  const m = titulo.match(ATRIBUTO_SUST);
  if (m) return [2, `S2 Buena: atributo declarado en la etiqueta ("${m[0]}"), sin certificación verificada.`];
  if (huella != null && huella >= 20) return [4, `S4 Alto impacto: convencional y su tipo de alimento emite ${huella} kg CO2e por kg (${OWID}).`];
  return [3, 'S3 Convencional: sin certificación ni atributo ambiental declarado.'];
}

// ---- SQL ----
const q = (s) => (s == null || s === '' ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const out = [];
out.push(`-- Generado por data/generar-seed.mjs (capturas ${CAPTURA}). No editar a mano.`);
out.push('truncate public.ofertas, public.sucursales restart identity;');
out.push('delete from public.productos; delete from public.tiendas;');

out.push('insert into public.tiendas (id, nombre, sitio_web, requiere_membresia, nota_precios) values');
out.push(tiendas.map(([id, n, w, mem, nota]) => `(${q(id)}, ${q(n)}, ${q(w)}, ${mem}, ${q(nota)})`).join(',\n') + ';');

out.push('insert into public.productos (id, nombre, categoria, unidad, sinonimos, huella_kgco2e, huella_fuente) values');
out.push(productos.map(([id, n, c, u, sin, h]) =>
  `(${q(id)}, ${q(n)}, ${q(c)}, ${q(u)}, array[${sin.map(q).join(', ')}]::text[], ${h ?? 'null'}, ${h == null ? 'null' : q(OWID)})`).join(',\n') + ';');

const prodById = Object.fromEntries(productos.map((p) => [p[0], p]));
const tiendaById = Object.fromEntries(tiendas.map((t) => [t[0], t]));
const filas = readFileSync(join(here, 'capturas', `${CAPTURA}.tsv`), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split('\t'));
const ofertas = filas.map(([producto, tienda, titulo, marca, cantidad, precio]) => {
  const p = prodById[producto];
  if (!p) throw new Error(`Producto desconocido: ${producto}`);
  const [cal, calM] = calidad(titulo, marca);
  const [sus, susM] = sustentabilidad(titulo, p[5]);
  const url = tiendaById[tienda][5](encodeURIComponent(p[6]));
  const propia = !!marca && MARCA_PROPIA.test(marca);
  return `(${q(producto)}, ${q(tienda)}, ${q(titulo)}, ${q(marca)}, ${propia}, ${Number(cantidad)}, ${Number(precio)}, ${cal}, ${q(calM)}, ${sus}, ${q(susM)}, ${q(url)}, '${CAPTURA}')`;
});
out.push('insert into public.ofertas (producto_id, tienda_id, titulo, marca, marca_propia, cantidad, precio, calidad, calidad_motivo, sustentabilidad, sustentabilidad_motivo, url, consultado_el) values');
out.push(ofertas.join(',\n') + ';');

// Sucursales: quitar duplicados (nodo + edificio del mismo local a < 250 m).
const raw = JSON.parse(readFileSync(join(here, 'sucursales-osm.json'), 'utf8'));
const dist = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 100.5); // km aprox. en Monterrey
const unicas = [];
for (const s of raw) if (!unicas.some((u) => u.tienda === s.tienda && dist(u, s) < 0.25)) unicas.push(s);
out.push('insert into public.sucursales (tienda_id, nombre, direccion, municipio, lat, lng, osm_id) values');
out.push(unicas.map((s) => `(${q(s.tienda)}, ${q(s.nombre)}, ${q(s.dir)}, ${q(s.municipio)}, ${s.lat}, ${s.lng}, ${q(s.osm)})`).join(',\n') + ';');

console.log(out.join('\n'));
console.error(`ofertas: ${ofertas.length} · sucursales: ${unicas.length} de ${raw.length}`);
