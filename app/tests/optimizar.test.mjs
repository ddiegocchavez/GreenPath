// Pruebas del algoritmo y del lector de ticket: node --experimental-strip-types --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarPlan, evaluar, recortarAPresupuesto, paquetesNecesarios, cantidadTipica, presentacionPorPrecio } from '../src/lib/optimizar.ts';
import { analizarTexto, extraerPrecio, emparejarProducto, extraerTotal, extraerCantidad } from '../src/lib/ticket.ts';

test('ticket: presentación del renglón', () => {
  assert.equal(extraerCantidad('HUEVO SAN JUAN 18PZ 48.00', 'pza'), 18);
  assert.equal(extraerCantidad('FRIJOL VERDE VALLE 900G 35.00', 'kg'), 0.9);
  assert.equal(extraerCantidad('ARROZ SOS 1KG 36.00', 'kg'), 1);
  assert.equal(extraerCantidad('ACEITE NUTRIOLI 946ML 46.00', 'l'), 0.946);
  assert.equal(extraerCantidad('PAPEL HIG KLEENEX 16R 135.00', 'pza'), 16);
  assert.equal(extraerCantidad('LECHE LALA', 'l'), null);
});

const P = (id, unidad, huella = null, sinonimos = [id]) => ({ id, nombre: id, categoria: 'x', unidad, sinonimos, huella_kgco2e: huella, huella_fuente: huella ? 'OWID' : null });
const O = (id, producto_id, tienda_id, cantidad, precio, calidad, sustentabilidad) =>
  ({ id, producto_id, tienda_id, titulo: `${producto_id} ${id}`, marca: null, marca_propia: false, cantidad, precio, precio_unitario: precio / cantidad, calidad, calidad_motivo: '', sustentabilidad, sustentabilidad_motivo: '', url: '', consultado_el: '2026-11-12' });

const cat = {
  tiendas: [{ id: 'walmart', nombre: 'Walmart' }, { id: 'heb', nombre: 'H-E-B' }],
  sucursales: [],
  productos: [P('huevo', 'pza', 4.67, ['huevo', 'huevos']), P('frijol', 'kg', 1.79), P('res', 'kg', 99.48, ['res', 'carne molida'])],
  ofertas: [
    O(1, 'huevo', 'walmart', 12, 32, 3, 3), O(2, 'huevo', 'walmart', 12, 81, 1, 1), O(3, 'huevo', 'walmart', 18, 43, 4, 3),
    O(4, 'huevo', 'heb', 12, 34, 4, 3), O(5, 'huevo', 'heb', 12, 99, 2, 2),
    O(6, 'frijol', 'walmart', 0.9, 25, 4, 3), O(7, 'frijol', 'walmart', 1, 82, 1, 1),
    O(8, 'frijol', 'heb', 0.75, 16.9, 4, 3),
    O(9, 'res', 'heb', 0.5, 112, 3, 4),
  ],
};

test('paquetes: redondea hacia arriba', () => {
  assert.equal(paquetesNecesarios(12, cat.ofertas[0]), 1);
  assert.equal(paquetesNecesarios(13, cat.ofertas[0]), 2);
  assert.equal(paquetesNecesarios(1.8, cat.ofertas[5]), 2);
});

test('precio: elige lo más barato por tienda', () => {
  const p = armarPlan(cat, [{ productoId: 'huevo', cantidad: 12 }], ['walmart'], null, 'precio');
  assert.equal(p.total, 32);
});

test('calidad con presupuesto: sube solo si alcanza', () => {
  const items = [{ productoId: 'huevo', cantidad: 12 }, { productoId: 'frijol', cantidad: 0.9 }];
  const justo = armarPlan(cat, items, ['walmart'], 60, 'calidad');
  assert.equal(justo.total, 57); // 32 + 25, no alcanza para orgánico
  const holgado = armarPlan(cat, items, ['walmart'], 120, 'calidad');
  assert.ok(holgado.total <= 120);
  assert.ok(holgado.calidadProm < justo.calidadProm);
});

test('falta un producto en una tienda: queda en faltantes y la combinación lo cubre', () => {
  const items = [{ productoId: 'huevo', cantidad: 12 }, { productoId: 'res', cantidad: 0.5 }];
  const planes = evaluar(cat, items, null, 'precio');
  assert.equal(planes[0].faltantes.length, 0);
  const soloWalmart = planes.find((p) => p.tiendas.join() === 'walmart');
  assert.equal(soloWalmart.faltantes[0].id, 'res');
});

test('recortar: baja paquetes hasta caber en el presupuesto', () => {
  const items = [{ productoId: 'huevo', cantidad: 36 }, { productoId: 'frijol', cantidad: 0.9 }];
  const r = recortarAPresupuesto(cat, items, ['walmart'], 90);
  const plan = armarPlan(cat, r.items, ['walmart'], null, 'precio');
  assert.ok(plan.total <= 90, `total ${plan.total}`);
  assert.ok(r.recortes.length >= 1);
});

test('huella: suma kg por factor, ignora piezas', () => {
  const p = armarPlan(cat, [{ productoId: 'huevo', cantidad: 12 }, { productoId: 'res', cantidad: 0.5 }], ['heb'], null, 'precio');
  assert.equal(p.huellaKg, 49.7);
});

test('presentación por precio pagado', () => {
  assert.equal(presentacionPorPrecio(cat, 'huevo', 45), 18);   // $43 por 18 pzas es lo más parecido
  assert.equal(presentacionPorPrecio(cat, 'huevo', 500), null); // nada parecido → no adivina
});

test('cantidad típica: presentación más común', () => {
  assert.equal(cantidadTipica(cat, 'huevo'), 12);
});

test('ticket: precio, producto y total', () => {
  assert.equal(extraerPrecio('HUEVO BCO 12PZ    $ 32.50'), 32.5);
  assert.equal(extraerPrecio('FRIJOL PINTO 900G 25,00'), 25);
  assert.equal(emparejarProducto('CARNE MOLIDA RES 500G', cat.productos), 'res');
  const texto = 'WALMART\nHUEVOS SAN JUAN 12 32.00\nFRIJOL VERDE VALLE 35.00\nSUBTOTAL 67.00\nTOTAL 67.00';
  const r = analizarTexto(texto, cat.productos);
  assert.deepEqual(r.map((x) => x.productoId), ['huevo', 'frijol']);
  assert.equal(extraerTotal(texto), 67);
});
