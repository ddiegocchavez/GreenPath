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
