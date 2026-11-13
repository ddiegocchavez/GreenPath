// Pruebas de encuesta → diagnóstico → plan, preferencias, alternativas y revisión de periodo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diagnosticar, recomendarPlan, gastoMensual, comprasPorMes, aplicarPreferencias, alternativasPara, aplicarAlternativas, ajustarPorRevision,
} from '../src/lib/perfil.ts';
import { armarPlan, evaluarAlternativas } from '../src/lib/optimizar.ts';

const base = {
  nombre: 'Ana', uso: 'hogar', personas: 4, frecuencia: 'mensual', frecuencia_dias: 30, gasto_por_despensa: 4000,
  problemas: [], no_cambiar: [], no_cambiar_detalle: null, restricciones: [], supermercados: [], alternativas_aceptadas: [], alternativas_rechazadas: [],
};

test('gasto mensual y compras por mes', () => {
  assert.equal(gastoMensual({ gasto_por_despensa: 1000, frecuencia_dias: 7 }), 4286);
  assert.equal(gastoMensual({ gasto_por_despensa: 2000, frecuencia_dias: 15 }), 4000);
  assert.equal(gastoMensual({ gasto_por_despensa: null, frecuencia_dias: 30 }), null);
  assert.equal(comprasPorMes({ frecuencia_dias: 7 }), 4.3);
});

test('diagnóstico: resumen, problema principal y sin cifras inventadas', () => {
  const d = diagnosticar({ ...base, problemas: ['huella', 'se_terminan', 'desperdicio'] });
  assert.match(d.resumen, /cada mes para 4 personas/);
  assert.match(d.resumen, /4,000/);
  assert.equal(d.problemaPrincipal, 'Algunos productos se terminan antes de tiempo');
  assert.equal(d.oportunidades.length, 3);
  assert.ok(d.datosFaltantes.some((x) => /ticket/.test(x)));
  assert.ok(!d.oportunidades.join(' ').match(/\$\d/), 'las oportunidades no traen montos');
});

const PLANES = [
  { id: 'gratis', precio_mxn: 0, optimizaciones_incluidas: 0, tipo: 'gratis' },
  { id: 'individual', precio_mxn: 29, optimizaciones_incluidas: 1, tipo: 'pago_unico' },
  { id: 'flex', precio_mxn: 59, optimizaciones_incluidas: 2, tipo: 'suscripcion' },
  { id: 'plus', precio_mxn: 99, optimizaciones_incluidas: 4, tipo: 'suscripcion' },
];
const semanal = { ...base, frecuencia: 'semanal', frecuencia_dias: 7 };     // 4.3 compras/mes
const quincenal = { ...base, frecuencia: 'quincenal', frecuencia_dias: 15 }; // 2 compras/mes
const op = (r, id) => r.opciones.find((o) => o.id === id);

test('plan: sin datos verificables (sin lista) → Gratis, nunca pagar a ciegas', () => {
  const r = recomendarPlan(semanal, PLANES, null);
  assert.equal(r.plan, 'gratis');
  assert.equal(op(r, 'plus').ahorroExtraMes, null);
  assert.equal(recomendarPlan(semanal, PLANES, { mxn: 50, kg: 1, comparables: 0 }).plan, 'gratis');
});

test('plan: despensa mensual estable → Individual o Gratis, nunca suscripción', () => {
  const r = recomendarPlan(base, PLANES, { mxn: 80, kg: 10, comparables: 5 }); // ahorra 80 > 29
  assert.equal(r.plan, 'individual');
  assert.equal(op(r, 'individual').beneficioNeto, 51);
  assert.equal(op(r, 'plus').aplica, false);
  assert.equal(recomendarPlan(base, PLANES, { mxn: 20, kg: 1, comparables: 5 }).plan, 'gratis'); // 20 < 29
});

test('plan: quincenal compara Individual vs Flex por beneficio neto (precios configurables)', () => {
  const r = recomendarPlan(quincenal, PLANES, { mxn: 40, kg: 5, comparables: 6 }); // 2 análisis × $40 = $80
  assert.deepEqual([op(r, 'individual').beneficioNeto, op(r, 'flex').beneficioNeto, op(r, 'plus').beneficioNeto], [22, 21, -19]);
  // Con $29 / $59, dos Individuales ($58) cuestan menos que Flex ($59): Flex nunca gana y no se recomienda.
  assert.equal(r.plan, 'individual');
  // Si Flex se configura a $49, ya conviene más que pagar dos Individuales.
  const conFlex49 = PLANES.map((p) => (p.id === 'flex' ? { ...p, precio_mxn: 49 } : p));
  assert.equal(recomendarPlan(quincenal, conFlex49, { mxn: 40, kg: 5, comparables: 6 }).plan, 'flex');
});

test('plan: semanal con ahorro alto → Plus; con ahorro bajo → Gratis', () => {
  const r = recomendarPlan(semanal, PLANES, { mxn: 60, kg: 8, comparables: 6 });
  // individual 4.3×(60−29)=133.3 · flex 120−59=61 · plus 4×60−99=141 → Plus
  assert.equal(r.plan, 'plus');
  assert.equal(op(r, 'plus').beneficioNeto, 141);
  assert.equal(op(r, 'plus').co2Mes, 32);
  assert.equal(recomendarPlan(semanal, PLANES, { mxn: 10, kg: 1, comparables: 6 }).plan, 'gratis');
  assert.equal(recomendarPlan({ ...base, uso: 'evento' }, PLANES, null).plan, 'eventos');
  assert.equal(recomendarPlan({ ...base, uso: 'negocio' }, PLANES, null).plan, 'negocios');
});

const P = (id, unidad, huella = null) => ({ id, nombre: id, categoria: 'x', unidad, sinonimos: [id], huella_kgco2e: huella, huella_fuente: huella ? 'OWID' : null });
const O = (id, producto_id, tienda_id, cantidad, precio, calidad, titulo = producto_id, marca = null) =>
  ({ id, producto_id, tienda_id, titulo, marca, marca_propia: false, cantidad, precio, precio_unitario: precio / cantidad, calidad, calidad_motivo: '', sustentabilidad: 3, sustentabilidad_motivo: '', url: '', consultado_el: '2026-11-13' });
const cat = {
  tiendas: [{ id: 'walmart', nombre: 'Walmart' }, { id: 'heb', nombre: 'H-E-B' }],
  sucursales: [],
  productos: [P('leche', 'l', 3.15), P('res', 'kg', 99.48), P('frijol', 'kg', 1.79), P('pollo', 'kg', 9.87)],
  ofertas: [
    O(1, 'leche', 'walmart', 1, 20, 4, 'Leche Great Value entera 1 l', 'Great Value'), O(2, 'leche', 'heb', 1, 36, 3, 'Santa Clara Leche Deslactosada 1 L', 'Santa Clara'),
    O(3, 'leche', 'walmart', 1, 34, 3, 'Leche Lala entera 1 l', 'Lala'), O(4, 'res', 'heb', 0.5, 112, 3), O(5, 'frijol', 'walmart', 0.9, 25, 4), O(6, 'pollo', 'heb', 1, 94, 3),
  ],
};

test('preferencias: supermercados, calidad, sin lactosa, vegetariano y marca', () => {
  const items = [{ productoId: 'leche', cantidad: 1 }, { productoId: 'res', cantidad: 0.5 }];
  const sup = aplicarPreferencias(cat, items, { ...base, no_cambiar: ['supermercados'], supermercados: ['heb'] });
  assert.ok(sup.cat.ofertas.every((o) => o.tienda_id === 'heb'));
  const cal = aplicarPreferencias(cat, items, { ...base, no_cambiar: ['calidad'] });
  assert.ok(cal.cat.ofertas.every((o) => o.calidad <= 3));
  const lac = aplicarPreferencias(cat, items, { ...base, restricciones: ['sin_lactosa'] });
  assert.deepEqual(lac.cat.ofertas.filter((o) => o.producto_id === 'leche').map((o) => o.id), [2]);
  const veg = aplicarPreferencias(cat, items, { ...base, restricciones: ['vegetariano'] });
  assert.deepEqual(veg.items.map((i) => i.productoId), ['leche']);
  assert.ok(veg.avisos.some((a) => /vegetariana/.test(a.texto)));
  const marca = aplicarPreferencias(cat, items, { ...base, no_cambiar: ['marcas'], no_cambiar_detalle: 'Lala' });
  assert.deepEqual(marca.cat.ofertas.filter((o) => o.producto_id === 'leche').map((o) => o.id), [3]);
  // y el plan respeta la marca aunque haya una más barata
  assert.equal(armarPlan(marca.cat, [{ productoId: 'leche', cantidad: 1 }], ['walmart'], null, 'precio').total, 34);
});

test('alternativas: no repite rechazadas y cambia producto con la misma cantidad', () => {
  const items = [{ productoId: 'res', cantidad: 1 }, { productoId: 'frijol', cantidad: 0.9 }];
  const ids = (p) => alternativasPara(items, p).filter((a) => a.de === 'res').map((a) => a.id).sort();
  assert.deepEqual(ids({ ...base }), ['res_frijol', 'res_jamon', 'res_lentejas', 'res_pollo', 'res_salchicha']);
  assert.ok(!ids({ ...base, alternativas_rechazadas: ['res_frijol'] }).includes('res_frijol'));
  assert.deepEqual(ids({ ...base, restricciones: ['vegetariano'] }), ['res_frijol', 'res_lentejas']);
  assert.deepEqual(ids({ ...base, alternativas_aceptadas: ['res_frijol'] }), ['res_frijol']); // una por producto
  const nuevo = aplicarAlternativas(items, ['res_frijol']);
  assert.deepEqual(nuevo, [{ productoId: 'frijol', cantidad: 1.9 }]);
});

test('algoritmo ganar-ganar: propone lo que baja costo y CO₂e; nunca más huella', () => {
  const items = [{ productoId: 'res', cantidad: 1 }, { productoId: 'pollo', cantidad: 1 }];
  const ev = evaluarAlternativas(cat, items, alternativasPara(items, { ...base }), ['walmart', 'heb']);
  // res 1 kg = 2 × $112 = $224, 99.5 kg → frijol 2 × $25 = $50, 3.2 kg: gana-gana
  const rf = ev.find((e) => e.id === 'res_frijol');
  assert.deepEqual([rf.tipo, rf.ahorro, rf.reduccion], ['gana_gana', 174, 96.3]);
  // pollo $94 → res: más huella → nunca se propone
  assert.ok(!ev.some((e) => e.id === 'pollo_res'));
  // pollo $94 → frijol $50: gana-gana
  assert.equal(ev.find((e) => e.id === 'pollo_frijol').tipo, 'gana_gana');
  // orden: primero gana-gana por mayor reducción
  assert.equal(ev[0].id, 'res_frijol');
  assert.ok(ev.every((e) => e.reduccion > 0));
});

test('algoritmo: si es más caro pero baja huella, se marca como menor_huella', () => {
  const caro = { ...cat, ofertas: [...cat.ofertas.filter((o) => o.producto_id !== 'frijol'), O(9, 'frijol', 'walmart', 0.9, 300, 3)] };
  const items = [{ productoId: 'pollo', cantidad: 1 }];
  const ev = evaluarAlternativas(caro, items, alternativasPara(items, { ...base }), ['walmart', 'heb']);
  assert.equal(ev.find((e) => e.id === 'pollo_frijol').tipo, 'menor_huella');
});

test('CO₂e: cambiar 1 kg de res por frijol baja la huella estimada', () => {
  const antes = armarPlan(cat, [{ productoId: 'res', cantidad: 1 }], ['heb', 'walmart'], null, 'precio').huellaKg;
  const despues = armarPlan(cat, aplicarAlternativas([{ productoId: 'res', cantidad: 1 }], ['res_frijol']), ['heb', 'walmart'], null, 'precio').huellaKg;
  assert.equal(antes, 99.5);
  assert.equal(despues, 3.2); // 2 bolsas de 0.9 kg × 1.79
});

test('revisión del periodo ajusta la siguiente lista', () => {
  const items = [{ productoId: 'leche', cantidad: 3 }, { productoId: 'frijol', cantidad: 1 }, { productoId: 'res', cantidad: 0.5 }];
  const r = ajustarPorRevision(cat, items, { agotados: ['leche'], desperdiciados: ['frijol'], sobrantes: ['res'] });
  assert.deepEqual(r.items.map((i) => i.cantidad), [4, 0.5, 0.5]); // res ya está en el mínimo
  assert.equal(r.cambios.length, 2);
});
