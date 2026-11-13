/** Cuenta anónima, perfil, plan (demo), créditos, historial y revisiones en Supabase (todo protegido por RLS). */
import { supabase } from './supabase';
import type { Perfil, Revision } from './perfil';
import type { Item } from './tipos';

export type Estado = { plan: 'gratis' | 'plus'; saldo: number; usadas_ciclo: number; ciclo: string; plan_desde?: string | null };
export type Plan = { id: 'gratis' | 'plus'; nombre: string; precio_mxn: number; optimizaciones_incluidas: number; umbral_compensacion_mxn: number | null };
export type Optimizacion = {
  id: string; creada_en: string; modo: 'gratis' | 'plus'; origen: 'lista' | 'ticket'; items: Item[];
  presupuesto: number | null; prioridad: string | null; referencia_tipo: string; referencia_detalle: string | null;
  total_referencia: number | null; total_optimizado: number; co2e_referencia: number | null; co2e_optimizado: number | null;
  tiendas: string[]; gasto_real: number | null;
};
export type Movimiento = { id: number; creado_en: string; tipo: string; cantidad: number; detalle: string | null };
export type RevisionGuardada = Revision & { id: string; optimizacion_id: string | null; creada_en: string; costo_desperdicio: number | null };

function sb() { if (!supabase) throw new Error('Supabase no configurado'); return supabase; }
const num = (v: unknown) => (v == null ? null : Number(v));

/** Garantiza una sesión: si no hay, crea una cuenta anónima (sin correo ni contraseña). */
export async function asegurarSesion(): Promise<string> {
  const { data } = await sb().auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: d, error } = await sb().auth.signInAnonymously();
  if (error || !d.user) throw new Error(error?.message ?? 'No se pudo iniciar sesión');
  return d.user.id;
}

export async function leerPerfil(): Promise<Perfil | null> {
  const { data, error } = await sb().from('perfiles').select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...data, gasto_por_despensa: num(data.gasto_por_despensa) } as Perfil : null;
}

export async function guardarPerfil(uid: string, p: Perfil) {
  const fila = {
    user_id: uid, nombre: p.nombre, uso: p.uso, personas: p.personas, frecuencia: p.frecuencia, frecuencia_dias: p.frecuencia_dias,
    gasto_por_despensa: p.gasto_por_despensa, problemas: p.problemas, no_cambiar: p.no_cambiar, no_cambiar_detalle: p.no_cambiar_detalle,
    restricciones: p.restricciones, supermercados: p.supermercados, alternativas_aceptadas: p.alternativas_aceptadas,
    alternativas_rechazadas: p.alternativas_rechazadas, encuesta_completada_en: p.encuesta_completada_en ?? new Date().toISOString(),
  };
  const existe = await sb().from('perfiles').select('user_id').eq('user_id', uid).maybeSingle();
  const r = existe.data
    ? await sb().from('perfiles').update({ ...fila, user_id: undefined, actualizado_en: new Date().toISOString() }).eq('user_id', uid)
    : await sb().from('perfiles').insert(fila);
  if (r.error) throw new Error(r.error.message);
}

export async function actualizarAlternativas(uid: string, aceptadas: string[], rechazadas: string[]) {
  const { error } = await sb().from('perfiles').update({ alternativas_aceptadas: aceptadas, alternativas_rechazadas: rechazadas, actualizado_en: new Date().toISOString() }).eq('user_id', uid);
  if (error) throw new Error(error.message);
}

export async function leerPlanes(): Promise<Plan[]> {
  const { data, error } = await sb().from('planes').select('*');
  if (error) throw new Error(error.message);
  return data.map((x) => ({ ...x, precio_mxn: Number(x.precio_mxn), umbral_compensacion_mxn: num(x.umbral_compensacion_mxn) }));
}

export async function miEstado(): Promise<Estado> {
  const { data, error } = await sb().rpc('mi_estado');
  if (error) throw new Error(error.message);
  return data as Estado;
}

export async function cambiarPlanDemo(plan: 'gratis' | 'plus'): Promise<Estado> {
  const { data, error } = await sb().rpc('cambiar_plan_demo', { p_plan: plan });
  if (error) throw new Error(error.message);
  return data as Estado;
}

export type NuevaOptimizacion = Omit<Optimizacion, 'id' | 'creada_en' | 'modo' | 'gasto_real'> & { modo?: 'plus' };
export async function guardarOptimizacion(o: NuevaOptimizacion, idem: string): Promise<{ id: string; repetida: boolean; modo: 'gratis' | 'plus' } & Estado> {
  const { data, error } = await sb().rpc('guardar_optimizacion', { p: o, p_idem: idem });
  if (error) throw new Error(error.message);
  return data;
}

export async function historial(): Promise<{ optimizaciones: Optimizacion[]; movimientos: Movimiento[]; revisiones: RevisionGuardada[] }> {
  const [o, m, r] = await Promise.all([
    sb().from('optimizaciones').select('*').order('creada_en', { ascending: false }).limit(50),
    sb().from('movimientos_credito').select('id, creado_en, tipo, cantidad, detalle').order('creado_en', { ascending: false }).limit(50),
    sb().from('revisiones').select('*').order('creada_en', { ascending: false }).limit(50),
  ]);
  const err = o.error ?? m.error ?? r.error;
  if (err) throw new Error(err.message);
  return {
    optimizaciones: (o.data ?? []).map((x) => ({
      ...x, presupuesto: num(x.presupuesto), total_referencia: num(x.total_referencia), total_optimizado: Number(x.total_optimizado),
      co2e_referencia: num(x.co2e_referencia), co2e_optimizado: num(x.co2e_optimizado), gasto_real: num(x.gasto_real),
    })),
    movimientos: m.data ?? [],
    revisiones: (r.data ?? []).map((x) => ({ ...x, costo_desperdicio: num(x.costo_desperdicio) })),
  };
}

export async function registrarGastoReal(id: string, monto: number) {
  const { error } = await sb().rpc('registrar_gasto_real', { p_id: id, p_monto: monto });
  if (error) throw new Error(error.message);
}

export async function evaluarCompensacion(id: string): Promise<{ cumple: boolean; otorgado: boolean; ahorro_estimado: number; umbral: number | null }> {
  const { data, error } = await sb().rpc('evaluar_compensacion', { p_id: id });
  if (error) throw new Error(error.message);
  return data;
}

export async function guardarRevision(uid: string, optimizacionId: string, r: Revision, costo: number | null) {
  const { error } = await sb().from('revisiones').insert({ user_id: uid, optimizacion_id: optimizacionId, ...r, costo_desperdicio: costo });
  if (error) throw new Error(error.message);
}

export async function borrarMisDatos() {
  const { error } = await sb().rpc('borrar_mis_datos');
  if (error) throw new Error(error.message);
  await sb().auth.signOut();
}
