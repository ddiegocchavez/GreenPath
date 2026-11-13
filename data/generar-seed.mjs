// Genera la migración con el catálogo: tiendas, sucursales (OSM), productos y ofertas clasificadas.
// Uso: node data/generar-seed.mjs > supabase/migrations/<timestamp>_datos_catalogo.sql
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OWID, productos } from './productos.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CAPTURA = '2026-11-12';

const tiendas = [
  ['walmart', 'Walmart', 'https://www.walmart.com.mx', false, 'Precio en línea de walmart.com.mx; en tienda puede variar.', (q) => `https://www.walmart.com.mx/search?q=${q}`],
  ['heb', 'H-E-B', 'https://www.heb.com.mx', false, 'Precio en línea de heb.com.mx con la sucursal HEB Gonzalitos (Monterrey).', (q) => `https://www.heb.com.mx/search?q=${q}`],
  ['costco', 'Costco', 'https://www.costco.com.mx', true, 'Requiere membresía. En línea solo hay abarrotes en presentaciones grandes.', (q) => `https://www.costco.com.mx/search?text=${q}`],
];



// ---- Reglas de clasificación (documentadas en data/README.md) ----
const ORGANICO = /org[aá]nic/i;
const ATRIBUTO_SUST = /libre (de )?(pastoreo|jaula)|agroecol|biodegradable|nacional/i;
const PREMIUM = /libre (de )?(pastoreo|jaula)|selecto|seleccionado|premium|gourmet|artesano|griego|sirloin|supreme|extra virgen|albacora|basmati|24 kilates/i;
const MARCA_ECONOMICA = /^(Great Value|Aurrera|HCF|Mi Tienda)$/i;
const MARCA_PROPIA = /^(Great Value|Aurrera|HCF|Mi Tienda|HEB|Marketside|Kirkland Signature)$/i;

function calidad(titulo, marca) {
  if (ORGANICO.test(titulo)) return [1, 'Calidad premium: producto orgánico.'];
  const m = titulo.match(PREMIUM);
  if (m) return [2, `Calidad superior: atributo de valor declarado ("${m[0]}").`];
  if (marca && MARCA_ECONOMICA.test(marca)) return [4, `Calidad estándar: marca propia básica (${marca}).`];
  return [3, marca ? `Calidad normal: marca reconocida (${marca}).` : 'Calidad normal: producto sin atributos adicionales.'];
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
const filas = readdirSync(join(here, 'capturas')).filter((f) => f.endsWith('.tsv')).sort().flatMap((f) =>
  readFileSync(join(here, 'capturas', f), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => [...l.split('\t'), f.slice(0, 10)]));
const ofertas = filas.map(([producto, tienda, titulo, marca, cantidad, precio, fecha]) => {
  const p = prodById[producto];
  if (!p) throw new Error(`Producto desconocido: ${producto}`);
  const [cal, calM] = calidad(titulo, marca);
  const [sus, susM] = sustentabilidad(titulo, p[5]);
  const url = tiendaById[tienda][5](encodeURIComponent(p[6]));
  const propia = !!marca && MARCA_PROPIA.test(marca);
  return `(${q(producto)}, ${q(tienda)}, ${q(titulo)}, ${q(marca)}, ${propia}, ${Number(cantidad)}, ${Number(precio)}, ${cal}, ${q(calM)}, ${sus}, ${q(susM)}, ${q(url)}, '${fecha}')`;
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
