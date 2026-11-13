// Prueba E2E contra Supabase: cuentas anónimas, perfil, Plus demo, créditos sin doble cobro, compensación y RLS.
// Uso (desde app/): node ../supabase/tests/planes_e2e.mjs   (lee NEXT_PUBLIC_SUPABASE_URL/KEY de app/.env.local)
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync(new URL('../../app/.env.local', import.meta.url), 'utf8').trim().split(/\r?\n/).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const nuevo = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_KEY, { auth: { persistSession: false } });
let ok = 0, fallas = 0;
const check = (cond, msg) => { if (cond) { ok++; console.log('✔', msg); } else { fallas++; console.log('✖', msg); } };

const a = nuevo(), b = nuevo();
const { data: sa, error: ea } = await a.auth.signInAnonymously();
const { data: sb } = await b.auth.signInAnonymously();
check(!ea && sa.user?.is_anonymous, 'cuenta anónima A');
const uidA = sa.user.id;

const { error: ep } = await a.from('perfiles').insert({ user_id: uidA, nombre: 'Prueba', uso: 'hogar', personas: 4, frecuencia: 'mensual', frecuencia_dias: 30, gasto_por_despensa: 4000, problemas: ['se_terminan'], encuesta_completada_en: new Date().toISOString() });
check(!ep, `perfil creado ${ep?.message ?? ''}`);
const { error: eplan } = await a.from('perfiles').update({ plan: 'plus' }).eq('user_id', uidA);
check(!!eplan, 'no se puede cambiar el plan directo (solo por función)');

let { data: est } = await a.rpc('mi_estado');
check(est.plan === 'gratis' && est.saldo === 0, 'empieza en Gratis con 0 créditos');

const opt = { origen: 'lista', items: [{ productoId: 'huevo', cantidad: 12 }], presupuesto: 500, prioridad: 'precio', referencia_tipo: 'super_habitual', referencia_detalle: 'H-E-B', total_referencia: 120, total_optimizado: 110, co2e_referencia: 1, co2e_optimizado: 1, tiendas: ['walmart'] };
let { data: g0 } = await a.rpc('guardar_optimizacion', { p: opt, p_idem: 'prueba-gratis-1' });
check(g0.modo === 'gratis' && g0.saldo === 0, 'en Gratis se guarda sin consumir créditos');

({ data: est } = await a.rpc('cambiar_plan_demo', { p_plan: 'plus' }));
check(est.plan === 'plus' && est.saldo === 4, 'Plus demo asigna 4 optimizaciones');
({ data: est } = await a.rpc('mi_estado'));
check(est.saldo === 4, 'la asignación del ciclo no se duplica');

const { data: g1 } = await a.rpc('guardar_optimizacion', { p: opt, p_idem: 'prueba-plus-1' });
const { data: g1b } = await a.rpc('guardar_optimizacion', { p: opt, p_idem: 'prueba-plus-1' });
check(g1.modo === 'plus' && g1.saldo === 3, 'optimización Plus consume 1 crédito');
check(g1b.repetida === true && g1b.saldo === 3, 'mismo idem_key no cobra dos veces');

const { data: c1 } = await a.rpc('evaluar_compensacion', { p_id: g1.id });
const { data: c2 } = await a.rpc('evaluar_compensacion', { p_id: g1.id });
check(c1.cumple && c1.otorgado && !c2.otorgado, `compensación una sola vez (ahorro $${c1.ahorro_estimado} < umbral $${c1.umbral})`);
({ data: est } = await a.rpc('mi_estado'));
check(est.saldo === 4, 'saldo tras compensación: 4');

for (let i = 2; i <= 5; i++) await a.rpc('guardar_optimizacion', { p: opt, p_idem: `prueba-plus-${i}` });
({ data: est } = await a.rpc('mi_estado'));
check(est.saldo === 0, 'saldo llega a 0');
const { error: sinSaldo } = await a.rpc('guardar_optimizacion', { p: { ...opt, modo: 'plus' }, p_idem: 'prueba-plus-6' });
check(!!sinSaldo, 'sin créditos no permite optimización Plus');

await a.rpc('registrar_gasto_real', { p_id: g1.id, p_monto: 105 });
const { data: o1 } = await a.from('optimizaciones').select('gasto_real').eq('id', g1.id).single();
check(Number(o1.gasto_real) === 105, 'ahorro comprobado: gasto real registrado');

const { data: ajenas } = await b.from('optimizaciones').select('id');
const { data: perfAjeno } = await b.from('perfiles').select('user_id');
check(ajenas.length === 0 && perfAjeno.length === 0, 'RLS: B no ve datos de A');
const { error: eRegAjeno } = await b.rpc('registrar_gasto_real', { p_id: g1.id, p_monto: 1 });
check(!!eRegAjeno, 'RLS: B no puede modificar optimizaciones de A');

({ data: est } = await a.rpc('cambiar_plan_demo', { p_plan: 'gratis' }));
const { data: hist } = await a.from('optimizaciones').select('id');
check(est.plan === 'gratis' && hist.length >= 5, 'cancelar Plus conserva el historial');

await a.rpc('borrar_mis_datos');
const { data: tras } = await a.from('optimizaciones').select('id');
const { data: pTras } = await a.from('perfiles').select('user_id');
check(tras.length === 0 && pTras.length === 0, 'borrar mis datos elimina todo');
await b.rpc('borrar_mis_datos');

console.log(`\n${ok} ok · ${fallas} fallas`);
process.exit(fallas ? 1 : 0);
