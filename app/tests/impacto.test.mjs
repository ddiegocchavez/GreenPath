// Pruebas del desglose por producto, el acumulado del dashboard y la rotación de tips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desglose, acumularPorProducto, tipsPara, siguienteTip, huella } from '../src/lib/impacto.ts';
import { armarPlan } from '../src/lib/optimizar.ts';
import { aplicarAlternativas } from '../src/lib/perfil.ts';

const P = (id, unidad, h = null) => ({ id, nombre: id[0].toUpperCase() + id.slice(1), categoria: 'x', unidad, sinonimos: [id], huella_kgco2e: h, huella_fuente: h ? 'OWID' : null });
const O = (id, producto_id, tienda_id, cantidad, precio) => ({ id, producto_id, tienda_id, titulo: producto_id, marca: null, marca_propia: false, cantidad, precio, precio_unitario: precio / cantidad, calidad: 3, calidad_motivo: '', sustentabilidad: 3, sustentabilidad_motivo: '', url: '', consultado_el: '2026-11-13' });
const cat = {
  tiendas: [{ id: 'walmart', nombre: 'Walmart' }, { id: 'heb', nombre: 'H-E-B' }], sucursales: [],
  productos: [P('res', 'kg', 99.48), P('frijol', 'kg', 1.79), P('leche', 'l', 3.15), P('huevo', 'pza', 4.67), P('papa', 'kg', 0.46), P('arroz', 'kg', 4.45), P('leche_vegetal', 'l', 0.9)],
  ofertas: [O(1, 'res', 'heb', 0.5, 112), O(2, 'frijol', 'walmart', 1, 30), O(3, 'leche', 'heb', 1, 30), O(4, 'leche', 'walmart', 1, 20), O(5, 'huevo', 'walmart', 12, 32)],
};

test('huella: kg × factor; piezas sin huella', () => {
  assert.equal(huella(cat.productos[0], 0.5), 49.74);
  assert.equal(huella(cat.productos[3], 12), null);
});

test('desglose por producto con súper habitual y alternativa aceptada', () => {
  const items = [{ productoId: 'res', cantidad: 0.5 }, { productoId: 'leche', cantidad: 2 }, { productoId: 'huevo', cantidad: 12 }];
  const ref = armarPlan(cat, items, ['heb'], null, 'precio'); // res 112, leche 60, huevo no hay en H-E-B
  const opt = armarPlan(cat, aplicarAlternativas(items, ['res_frijol']), ['heb', 'walmart'], null, 'precio');
  const d = desglose(cat, items, ref, opt, [{ de: 'res', a: 'frijol' }], false);
  const res = d.find((f) => f.productoId === 'res');
  assert.equal(res.nombre, 'Res → Frijol');
  assert.deepEqual([res.ref_mxn, res.opt_mxn, res.ref_kg, res.opt_kg], [112, 30, 49.74, 1.79]);
  const leche = d.find((f) => f.productoId === 'leche');
  assert.deepEqual([leche.ref_mxn, leche.opt_mxn, leche.ref_kg, leche.opt_kg], [60, 40, 6.3, 6.3]);
  const huevo = d.find((f) => f.productoId === 'huevo');
  assert.deepEqual([huevo.ref_mxn, huevo.opt_mxn, huevo.ref_kg], [null, 32, null]); // sin referencia: no se inventa ahorro
});

test('desglose con ticket usa lo que pagaste', () => {
  const items = [{ productoId: 'leche', cantidad: 2, precioTicket: 70 }];
  const opt = armarPlan(cat, items, ['heb', 'walmart'], null, 'precio');
  const [f] = desglose(cat, items, null, opt, [], true);
  assert.deepEqual([f.ref_mxn, f.opt_mxn, f.ref_kg], [70, 40, 6.3]);
});

test('acumulado por producto en varias despensas', () => {
  const a = acumularPorProducto([
    { detalle: [{ productoId: 'leche', nombre: 'Leche', ref_mxn: 60, opt_mxn: 40, ref_kg: 6.3, opt_kg: 6.3 }, { productoId: 'res', nombre: 'Res', cambio: 'Res → Frijol', ref_mxn: 112, opt_mxn: 30, ref_kg: 49.74, opt_kg: 1.79 }] },
    { detalle: [{ productoId: 'leche', nombre: 'Leche', ref_mxn: 30, opt_mxn: 20, ref_kg: 3.15, opt_kg: 3.15 }, { productoId: 'huevo', nombre: 'Huevo', ref_mxn: null, opt_mxn: 32, ref_kg: null, opt_kg: null }] },
    { detalle: null },
  ]);
  const leche = a.find((x) => x.productoId === 'leche');
  assert.deepEqual([leche.ahorro_mxn, leche.reduccion_kg, leche.despensas], [30, 0, 2]);
  const res = a.find((x) => x.productoId === 'res');
  assert.deepEqual([res.nombre, res.ahorro_mxn, res.reduccion_kg], ['Res → Frijol', 82, 47.95]);
  assert.equal(a.find((x) => x.productoId === 'huevo').ahorro_mxn, 0);
});

test('tips: primero los de tu lista, con números del catálogo; nunca se repite hasta agotar', () => {
  const pool = tipsPara(cat, [{ productoId: 'res', cantidad: 0.5 }, { productoId: 'arroz', cantidad: 1 }, { productoId: 'leche', cantidad: 2 }]);
  assert.match(pool[0].texto, /res es lo que más CO₂e aporta/);
  assert.ok(pool.some((t) => t.id === 'res_frijol' && /99.48/.test(t.texto) && /56 veces menos/.test(t.texto)));
  assert.ok(pool.some((t) => t.id === 'arroz_papa'));
  assert.ok(pool.every((t) => t.fuente));
  let vistos = [];
  const ids = [];
  for (let i = 0; i < pool.length; i++) { const r = siguienteTip(pool, vistos); vistos = r.vistos; ids.push(r.tip.id); }
  assert.equal(new Set(ids).size, pool.length);
  assert.equal(siguienteTip(pool, vistos).vistos.length, 1); // reinicia al agotar
});

test('comparación justa: un producto sin precio NO cuenta como ahorro', async () => {
  const { compararCubiertos } = await import('../src/lib/impacto.ts');
  const filas = [
    { productoId: 'leche', nombre: 'Leche', ref_mxn: 70, opt_mxn: 40, ref_kg: 6.3, opt_kg: 6.3 },
    { productoId: 'fresa', nombre: 'Fresa', ref_mxn: 69.95, opt_mxn: null, ref_kg: 0.8, opt_kg: null }, // sin precio en línea
    { productoId: 'huevo', nombre: 'Huevo', ref_mxn: null, opt_mxn: 32, ref_kg: null, opt_kg: null },  // sin referencia
  ];
  const c = compararCubiertos(filas);
  assert.deepEqual([c.ref, c.opt, c.ahorro, c.comparables], [70, 40, 30, 1]);
  assert.deepEqual(c.excluidos, ['Fresa', 'Huevo']);
  assert.deepEqual([c.refKg, c.optKg], [6.3, 6.3]);
});

test('distribución del presupuesto por categoría, sobrante y faltante', async () => {
  const { distribuirPresupuesto } = await import('../src/lib/impacto.ts');
  const cat2 = { ...cat, productos: cat.productos.map((p) => ({ ...p, categoria: p.id === 'res' ? 'Carnes' : 'Lácteos' })) };
  const plan = armarPlan(cat2, [{ productoId: 'res', cantidad: 0.5 }, { productoId: 'leche', cantidad: 2 }], ['heb', 'walmart'], null, 'precio');
  const d = distribuirPresupuesto(cat2, plan, 200);
  assert.equal(d.total, 152);
  assert.deepEqual(d.categorias.map((c) => [c.categoria, c.total, c.pct]), [['Carnes', 112, 74], ['Lácteos', 40, 26]]);
  assert.deepEqual([d.sobrante, d.falta], [48, null]);
  assert.deepEqual([distribuirPresupuesto(cat2, plan, 100).falta, distribuirPresupuesto(cat2, plan, null).sobrante], [52, null]);
});

test('Gratis vs Plus con los mismos datos: Plus nunca sale peor y el extra es medible', async () => {
  const { compararCubiertos } = await import('../src/lib/impacto.ts');
  const { evaluar } = await import('../src/lib/optimizar.ts');
  // leche más barata en Walmart, res solo en H-E-B: lo básico (una tienda) no puede tener ambas baratas
  const items = [{ productoId: 'res', cantidad: 0.5 }, { productoId: 'leche', cantidad: 2 }];
  const basico = evaluar(cat, items, null, 'precio').filter((p) => p.tiendas.length === 1).sort((a, b) => a.faltantes.length - b.faltantes.length || a.total - b.total)[0];
  const plus = evaluar(cat, items, null, 'precio')[0];
  const c = compararCubiertos(desglose(cat, items, basico, plus, [], false));
  assert.deepEqual(basico.tiendas, ['heb']);           // res 112 + leche 2×30 = 172
  assert.deepEqual(plus.tiendas.sort(), ['heb', 'walmart']); // res 112 + leche 2×20 = 152
  assert.deepEqual([c.ref, c.opt, c.ahorro, c.comparables], [172, 152, 20, 2]);
});

test('compra incompleta: un producto que no se puede comprar NO es ahorro', async () => {
  const { compararCubiertos } = await import('../src/lib/impacto.ts');
  const cat2 = { ...cat, productos: [...cat.productos, { id: 'fresa', nombre: 'Fresa', categoria: 'x', unidad: 'kg', sinonimos: [], huella_kgco2e: 1.53, huella_fuente: 'OWID' }] };
  const ticket = [{ productoId: 'leche', cantidad: 2, precioTicket: 70 }, { productoId: 'fresa', cantidad: 0.45, precioTicket: 69.95 }];
  const opt = armarPlan(cat2, ticket, ['heb', 'walmart'], null, 'precio');
  assert.equal(opt.faltantes[0].id, 'fresa');
  const c = compararCubiertos(desglose(cat2, ticket, null, opt, [], true));
  assert.equal(c.ahorro, 30);                 // 70 → 40 en leche; la fresa no suma $69.95 de "ahorro"
  assert.deepEqual(c.excluidos, ['Fresa']);
});

test('ajuste a presupuesto: la comparación usa la misma lista ajustada en ambos lados', async () => {
  const { compararCubiertos } = await import('../src/lib/impacto.ts');
  const { recortarAPresupuesto } = await import('../src/lib/optimizar.ts');
  const items = [{ productoId: 'leche', cantidad: 4 }];
  const ajuste = recortarAPresupuesto(cat, items, ['walmart'], 50);            // 4 L × $20 = 80 > 50 → 2 L
  assert.equal(ajuste.items[0].cantidad, 2);
  const ref = armarPlan(cat, ajuste.items, ['heb'], null, 'precio');            // súper habitual, misma lista ajustada
  const opt = armarPlan(cat, ajuste.items, ['walmart'], null, 'precio');
  const c = compararCubiertos(desglose(cat, ajuste.items, ref, opt, [], false));
  assert.deepEqual([c.ref, c.opt, c.ahorro], [60, 40, 20]);                     // no 80 → 40
});

test('equivalencia de despensas: ambas listas cubren los mismos productos con al menos la cantidad pedida', async () => {
  const { evaluar } = await import('../src/lib/optimizar.ts');
  const items = [{ productoId: 'res', cantidad: 0.7 }, { productoId: 'leche', cantidad: 3 }, { productoId: 'huevo', cantidad: 18 }];
  const planes = evaluar(cat, items, null, 'precio');
  const basico = planes.filter((p) => p.tiendas.length === 1).sort((a, b) => a.faltantes.length - b.faltantes.length || a.total - b.total)[0];
  const avanzado = planes[0];
  for (const plan of [basico, avanzado]) {
    for (const e of plan.elecciones) assert.ok(e.paquetes * e.oferta.cantidad >= e.item.cantidad, `${e.producto.id} cubre lo pedido`);
  }
  // Solo se comparan productos presentes en ambas; lo que falta en una no es ahorro.
  const filas = desglose(cat, items, basico, avanzado, [], false);
  for (const f of filas.filter((x) => x.ref_mxn != null && x.opt_mxn != null)) {
    assert.ok(basico.elecciones.some((e) => e.producto.id === f.productoId) && avanzado.elecciones.some((e) => e.producto.id === f.productoId));
  }
});
