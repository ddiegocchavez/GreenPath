// Pruebas de encuesta → diagnóstico → plan, preferencias, alternativas y revisión de periodo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diagnosticar, recomendarPlan, gastoMensual, comprasPorMes, aplicarPreferencias, alternativasPara, aplicarAlternativas, ajustarPorRevision,
} from '../src/lib/perfil.ts';
import { armarPlan } from '../src/lib/optimizar.ts';

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

test('plan: Plus solo con compras frecuentes, costo ≤ 5 % y problemas de planeación', () => {
  const plus = recomendarPlan({ ...base, frecuencia: 'semanal', frecuencia_dias: 7, gasto_por_despensa: 1200, problemas: ['se_terminan'] });
  assert.equal(plus.plan, 'plus');
  assert.ok(plus.costoPctGasto <= 5);
  assert.equal(recomendarPlan({ ...base, frecuencia: 'semanal', frecuencia_dias: 7, gasto_por_despensa: 1200, problemas: ['huella'] }).plan, 'gratis');
  assert.equal(recomendarPlan({ ...base, frecuencia: 'semanal', frecuencia_dias: 7, gasto_por_despensa: 300, problemas: ['se_terminan'] }).plan, 'gratis');
  assert.equal(recomendarPlan({ ...base, problemas: ['se_terminan'] }).plan, 'analisis_individual');
  assert.equal(recomendarPlan({ ...base, gasto_por_despensa: null }).plan, 'gratis');
  assert.equal(recomendarPlan({ ...base, uso: 'evento' }).plan, 'eventos');
  assert.equal(recomendarPlan({ ...base, uso: 'negocio' }).plan, 'negocios');
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
  assert.deepEqual(alternativasPara(items, { ...base }).map((a) => a.id), ['res_frijol', 'res_pollo']);
  assert.deepEqual(alternativasPara(items, { ...base, alternativas_rechazadas: ['res_frijol'] }).map((a) => a.id), ['res_pollo']);
  assert.deepEqual(alternativasPara(items, { ...base, restricciones: ['vegetariano'] }).map((a) => a.id), ['res_frijol']);
  const nuevo = aplicarAlternativas(items, ['res_frijol']);
  assert.deepEqual(nuevo, [{ productoId: 'frijol', cantidad: 1.9 }]);
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
