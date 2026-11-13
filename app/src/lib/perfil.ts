/**
 * Perfil del usuario (encuesta), diagnóstico, recomendación de plan, preferencias aplicadas al catálogo
 * y ajuste de la lista por la revisión del periodo. Todo por reglas transparentes (sin IA generativa)
 * y sin inventar ahorros: los montos solo salen de precios reales o de lo que el usuario registra.
 */
import type { Catalogo, Item } from './tipos';

export type Uso = 'hogar' | 'evento' | 'negocio';
export type Frecuencia = 'semanal' | 'quincenal' | 'mensual' | 'otra';
export type Problema = 'se_terminan' | 'desperdicio' | 'gasto_mas' | 'ahorrar_calidad' | 'distribuir' | 'huella';
export type NoCambiar = 'marcas' | 'calidad' | 'preferencias' | 'restricciones' | 'supermercados' | 'otros';
export type Restriccion = 'vegetariano' | 'sin_lactosa';

export type Perfil = {
  user_id?: string;
  nombre: string;
  uso: Uso;
  personas: number;
  frecuencia: Frecuencia;
  frecuencia_dias: number;
  gasto_por_despensa: number | null;
  problemas: Problema[];
  no_cambiar: NoCambiar[];
  no_cambiar_detalle: string | null;
  restricciones: Restriccion[];
  supermercados: string[];
  alternativas_aceptadas: string[];
  alternativas_rechazadas: string[];
  lista_habitual?: Item[];
  plan?: 'gratis' | 'flex' | 'plus';
  encuesta_completada_en?: string | null;
};

export const DIAS: Record<Frecuencia, number> = { semanal: 7, quincenal: 15, mensual: 30, otra: 30 };

export const PROBLEMAS: Record<Problema, string> = {
  se_terminan: 'Algunos productos se terminan antes de tiempo',
  desperdicio: 'Desperdicio frutas o verduras',
  gasto_mas: 'Gasto más de lo planeado',
  ahorrar_calidad: 'Quiero ahorrar sin sacrificar calidad',
  distribuir: 'No sé cómo distribuir mi presupuesto',
  huella: 'Quiero reducir mi huella de carbono',
};
export const NO_CAMBIAR: Record<NoCambiar, string> = {
  marcas: 'Determinadas marcas', calidad: 'Calidad de los productos', preferencias: 'Preferencias alimentarias',
  restricciones: 'Restricciones alimentarias', supermercados: 'Supermercados habituales', otros: 'Otros',
};
export const RESTRICCIONES: Record<Restriccion, string> = { vegetariano: 'Vegetariano (sin carne ni pescado)', sin_lactosa: 'Sin lactosa' };

/** Qué puede hacer GreenPath por cada problema (cualitativo, sin cifras inventadas). */
const OPORTUNIDAD: Record<Problema, string> = {
  se_terminan: 'Calcular cuánto comprar por periodo y reservar presupuesto para reponer lo que se acaba.',
  desperdicio: 'Ajustar las cantidades de perecederos con tu revisión de fin de periodo (qué se tiró, qué sobró).',
  gasto_mas: 'Comparar tu lista en Walmart, H-E-B y Costco con precios reales antes de comprar.',
  ahorrar_calidad: 'Buscar el menor precio sin bajar del nivel de calidad que elijas (premium, superior, normal o estándar).',
  distribuir: 'Ajustar tu lista a un presupuesto y decirte qué recortar primero si no alcanza.',
  huella: 'Estimar la huella de tu lista con fuente científica y proponer alternativas de menor impacto.',
};
const ORDEN_PROBLEMAS: Problema[] = ['se_terminan', 'desperdicio', 'gasto_mas', 'distribuir', 'ahorrar_calidad', 'huella'];

export const comprasPorMes = (p: Pick<Perfil, 'frecuencia_dias'>) => Math.round((30 / p.frecuencia_dias) * 10) / 10;
export const gastoMensual = (p: Pick<Perfil, 'gasto_por_despensa' | 'frecuencia_dias'>) =>
  p.gasto_por_despensa ? Math.round((p.gasto_por_despensa * 30) / p.frecuencia_dias) : null;

const pesos = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const FREC_TXT: Record<Frecuencia, string> = { semanal: 'cada semana', quincenal: 'cada quincena', mensual: 'cada mes', otra: 'con otra frecuencia' };

export type Diagnostico = {
  resumen: string;
  problemaPrincipal: string | null;
  oportunidades: string[];
  datosFaltantes: string[];
  gastoMensual: number | null;
  comprasMes: number;
};

export function diagnosticar(p: Perfil): Diagnostico {
  const gm = gastoMensual(p);
  const cm = comprasPorMes(p);
  const personas = `${p.personas} ${p.personas === 1 ? 'persona' : 'personas'}`;
  let resumen: string;
  if (p.uso === 'evento') resumen = 'Quieres organizar un evento.';
  else if (p.uso === 'negocio') resumen = 'Quieres usar GreenPath para tu negocio.';
  else {
    resumen = `Compras despensa ${FREC_TXT[p.frecuencia]} para ${personas}`;
    resumen += p.gasto_por_despensa ? ` y gastas alrededor de ${pesos(p.gasto_por_despensa)} por compra (≈ ${pesos(gm!)} al mes).` : '.';
  }
  const prob = ORDEN_PROBLEMAS.filter((x) => p.problemas.includes(x));
  const faltan: string[] = [];
  if (p.uso === 'hogar' && !p.gasto_por_despensa) faltan.push('Tu gasto aproximado por despensa, para calcular tu presupuesto mensual.');
  faltan.push('Tu lista o la foto de un ticket, para calcular cantidades y ahorro con precios reales de hoy.');
  return {
    resumen,
    problemaPrincipal: prob[0] ? PROBLEMAS[prob[0]] : null,
    oportunidades: prob.map((x) => OPORTUNIDAD[x]),
    datosFaltantes: faltan,
    gastoMensual: gm,
    comprasMes: cm,
  };
}

export type PlanId = 'gratis' | 'individual' | 'flex' | 'plus';
export type PlanSugerido = PlanId | 'eventos' | 'negocios';
export type PlanConfig = { id: PlanId; nombre?: string; precio_mxn: number; optimizaciones_incluidas: number; tipo: 'gratis' | 'pago_unico' | 'suscripcion' };
/** Ahorro adicional del modelo avanzado frente al básico en UNA compra (lista habitual, precios reales, productos cubiertos). */
export type ExtraPorAnalisis = { mxn: number; kg: number | null; comparables: number } | null;
export type OpcionPlan = {
  id: PlanId; costoMes: number; analisisMes: number;
  ahorroExtraMes: number | null; beneficioNeto: number | null; co2Mes: number | null;
  aplica: boolean; motivo?: string;
};
export type Recomendacion = { plan: PlanSugerido; razones: string[]; opciones: OpcionPlan[] };

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Recomienda el plan con mayor BENEFICIO NETO mensual verificable:
 *   ahorro adicional por análisis (modelo avanzado − básico, con tu lista y precios reales) × análisis que usarías − costo.
 * - Despensa mensual estable (≤ 1 compra/mes): solo Gratis o Individual; nunca una suscripción innecesaria.
 * - Sin datos verificables (sin lista) o sin beneficio positivo: Gratis.
 */
export function recomendarPlan(p: Perfil, planes: PlanConfig[], extra: ExtraPorAnalisis): Recomendacion {
  if (p.uso === 'evento') return { plan: 'eventos', razones: ['Un análisis de evento (presupuesto, cantidades, desperdicio y CO₂e) se paga por evento; no necesitas suscripción.'], opciones: [] };
  if (p.uso === 'negocio') return { plan: 'negocios', razones: ['Los negocios necesitan inventario, proveedores y reportes; ese plan está en preparación.'], opciones: [] };

  const n = comprasPorMes(p);
  const estable = n <= 1;
  const conDatos = !!extra && extra.comparables > 0;
  const opciones: OpcionPlan[] = (['individual', 'flex', 'plus'] as PlanId[]).flatMap((id) => {
    const cfg = planes.find((x) => x.id === id);
    if (!cfg) return [];
    const analisisMes = cfg.tipo === 'pago_unico' ? n : Math.min(cfg.optimizaciones_incluidas, n);
    const costoMes = r2(cfg.tipo === 'pago_unico' ? cfg.precio_mxn * analisisMes : cfg.precio_mxn);
    const ahorroExtraMes = conDatos ? r2(extra!.mxn * analisisMes) : null;
    const aplica = !(estable && cfg.tipo === 'suscripcion');
    return [{
      id, costoMes, analisisMes, ahorroExtraMes,
      beneficioNeto: ahorroExtraMes == null ? null : r2(ahorroExtraMes - costoMes),
      co2Mes: conDatos && extra!.kg != null ? Math.round(extra!.kg * analisisMes * 10) / 10 : null,
      aplica, motivo: aplica ? undefined : 'Compras una vez al mes: no necesitas una suscripción.',
    }];
  });

  const razones: string[] = [];
  if (!conDatos) {
    razones.push('Sin tu lista habitual no podemos calcular con precios reales cuánto ahorrarías de más; no te recomendamos pagar a ciegas.');
    razones.push('Empieza gratis: cuando escribas tu lista o subas un ticket verás el ahorro de cada plan.');
    return { plan: 'gratis', razones, opciones };
  }
  const candidatas = opciones.filter((o) => o.aplica && (o.beneficioNeto ?? 0) >= 1)
    .sort((a, b) => (b.beneficioNeto! - a.beneficioNeto!) || (a.costoMes - b.costoMes));
  const frase = n <= 1 ? 'compras una vez al mes' : `haces ≈ ${n} compras al mes`;
  if (!candidatas.length) {
    razones.push(`Con tu lista, el análisis completo ahorra ${pesos(extra!.mxn)} más por compra que el básico; como ${frase}, eso no cubre el costo de ningún plan.`);
    razones.push('El plan Gratis te da más valor. Si tu despensa cambia, te volveremos a calcular.');
    return { plan: 'gratis', razones, opciones };
  }
  const mejor = candidatas[0];
  const cfg = planes.find((x) => x.id === mejor.id)!;
  razones.push(`Con tu lista habitual, el análisis completo ahorra ${pesos(extra!.mxn)} más por compra que el básico (mismos productos y precios).`);
  razones.push(`Como ${frase}, ${cfg.tipo === 'pago_unico' ? `pagar ${pesos(cfg.precio_mxn)} por análisis` : `${cfg.optimizaciones_incluidas} análisis por ${pesos(cfg.precio_mxn)} al mes`} te deja un beneficio neto estimado de ${pesos(mejor.beneficioNeto!)} al mes.`);
  if (p.problemas.some((x) => x === 'se_terminan' || x === 'desperdicio')) {
    razones.push('Además ajusta tus cantidades con tu revisión de fin de periodo (eso no está sumado al ahorro porque aún no tenemos tu historial).');
  }
  return { plan: mejor.id, razones, opciones };
}

// ---------- Preferencias aplicadas al catálogo ----------
const CARNES = ['res', 'pollo', 'jamon', 'salchicha', 'atun'];
const LACTEOS = ['leche', 'queso', 'crema', 'yogurt', 'mantequilla'];
const SIN_LACTOSA = /deslactosad|sin lactosa|vegetal|avena/i;

export type Aviso = { productoId?: string; texto: string };

export function aplicarPreferencias(cat: Catalogo, items: Item[], p: Perfil | null): { cat: Catalogo; items: Item[]; avisos: Aviso[] } {
  if (!p) return { cat, items, avisos: [] };
  const avisos: Aviso[] = [];
  let ofertas = cat.ofertas;
  let tiendas = cat.tiendas;
  let its = items;

  if (p.no_cambiar.includes('supermercados') && p.supermercados.length) {
    tiendas = tiendas.filter((t) => p.supermercados.includes(t.id));
    ofertas = ofertas.filter((o) => p.supermercados.includes(o.tienda_id));
    avisos.push({ texto: `Solo comparamos tus supermercados: ${tiendas.map((t) => t.nombre).join(', ')}.` });
  }
  if (p.no_cambiar.includes('calidad')) {
    ofertas = ofertas.filter((o) => o.calidad <= 3);
    avisos.push({ texto: 'No bajamos la calidad: excluimos productos de calidad estándar.' });
  }
  if (p.restricciones.includes('vegetariano')) {
    const quitados = its.filter((i) => CARNES.includes(i.productoId));
    its = its.filter((i) => !CARNES.includes(i.productoId));
    for (const q of quitados) avisos.push({ productoId: q.productoId, texto: `Quitamos ${nombre(cat, q.productoId)} por tu restricción vegetariana.` });
  }
  if (p.restricciones.includes('sin_lactosa')) {
    ofertas = ofertas.filter((o) => !LACTEOS.includes(o.producto_id) || SIN_LACTOSA.test(o.titulo));
    for (const i of its) {
      if (LACTEOS.includes(i.productoId) && !ofertas.some((o) => o.producto_id === i.productoId)) {
        avisos.push({ productoId: i.productoId, texto: `No encontramos ${nombre(cat, i.productoId)} sin lactosa en el catálogo.` });
      }
    }
  }
  const marcas = p.no_cambiar.includes('marcas') && p.no_cambiar_detalle
    ? p.no_cambiar_detalle.split(/[,;\n]/).map((m) => m.trim().toLowerCase()).filter((m) => m.length >= 2) : [];
  if (marcas.length) {
    for (const pid of new Set(its.map((i) => i.productoId))) {
      const deMarca = ofertas.filter((o) => o.producto_id === pid && marcas.some((m) => `${o.marca ?? ''} ${o.titulo}`.toLowerCase().includes(m)));
      if (deMarca.length) {
        ofertas = ofertas.filter((o) => o.producto_id !== pid || deMarca.includes(o));
        avisos.push({ productoId: pid, texto: `${nombre(cat, pid)}: respetamos tu marca (${deMarca[0].marca ?? deMarca[0].titulo}).` });
      }
    }
  }
  return { cat: { ...cat, tiendas, ofertas }, items: its, avisos };
}

const nombre = (cat: Catalogo, id: string) => cat.productos.find((x) => x.id === id)?.nombre ?? id;

// ---------- Alternativas equivalentes ----------
// Sustitutos con la MISMA función en el platillo, comparados con la misma cantidad (kg o L).
// El algoritmo (optimizar.evaluarAlternativas) solo propone los que bajan emisiones; destaca los que
// además bajan el costo. Nunca propone una alternativa de mayor huella.
export type Alternativa = { id: string; de: string; a: string; grupo: string; motivo: string };
const GRUPOS: { nombre: string; productos: string[]; motivo: string }[] = [
  { nombre: 'proteína', productos: ['res', 'pollo', 'jamon', 'salchicha', 'frijol', 'lentejas'], motivo: 'Misma función (la proteína del platillo), misma cantidad en kg.' },
  { nombre: 'bebida', productos: ['leche', 'leche_vegetal'], motivo: 'Mismo uso (café, cereal, licuados), misma cantidad en litros.' },
  { nombre: 'guarnición', productos: ['arroz', 'papa', 'sopa'], motivo: 'Misma función de guarnición, misma cantidad en kg.' },
  { nombre: 'tortilla', productos: ['tortilla', 'tortilla_harina'], motivo: 'Mismo uso, misma cantidad en kg.' },
];
export const ALTERNATIVAS: Alternativa[] = GRUPOS.flatMap((g) => g.productos.flatMap((de) =>
  g.productos.filter((a) => a !== de).map((a) => ({ id: `${de}_${a}`, de, a, grupo: g.nombre, motivo: g.motivo }))));

/** Candidatos para tu lista: no rechazados, respetando restricciones; una sola alternativa aceptada por producto. */
export function alternativasPara(items: Item[], p: Perfil | null) {
  const rechazadas = new Set(p?.alternativas_rechazadas ?? []);
  const veg = p?.restricciones.includes('vegetariano');
  const aceptadas = new Set(p?.alternativas_aceptadas ?? []);
  const deAceptados = new Set(ALTERNATIVAS.filter((a) => aceptadas.has(a.id)).map((a) => a.de));
  const enLista = new Set(items.map((i) => i.productoId));
  return ALTERNATIVAS.filter((a) => enLista.has(a.de) && !rechazadas.has(a.id) && !(veg && CARNES.includes(a.a))
    && (!deAceptados.has(a.de) || aceptadas.has(a.id)));
}

/** Cambia en la lista los productos de las alternativas aceptadas (misma cantidad). */
export function aplicarAlternativas(items: Item[], aceptadas: string[]): Item[] {
  let out = items.map((i) => ({ ...i }));
  for (const a of ALTERNATIVAS.filter((x) => aceptadas.includes(x.id))) {
    const de = out.find((i) => i.productoId === a.de);
    if (!de) continue;
    const yaA = out.find((i) => i.productoId === a.a);
    out = out.filter((i) => i.productoId !== a.de);
    if (yaA) yaA.cantidad += de.cantidad; else out.push({ productoId: a.a, cantidad: de.cantidad });
  }
  return out;
}

// ---------- Personalización progresiva: revisión del periodo ----------
export type Revision = { agotados: string[]; desperdiciados: string[]; sobrantes: string[] };
export const PASO: Record<'pza' | 'kg' | 'l', number> = { pza: 6, kg: 0.5, l: 1 };

/** Siguiente lista: +1 paso a lo que se acabó; −1 paso a lo que se tiró o sobró (nunca menos de 1 paso). */
export function ajustarPorRevision(cat: Catalogo, items: Item[], r: Revision): { items: Item[]; cambios: string[] } {
  const cambios: string[] = [];
  const out = items.map((i) => {
    const p = cat.productos.find((x) => x.id === i.productoId);
    if (!p) return i;
    const paso = PASO[p.unidad];
    if (r.agotados.includes(i.productoId)) {
      cambios.push(`${p.nombre}: +${paso} ${p.unidad} porque se terminó antes de tiempo.`);
      return { ...i, cantidad: +(i.cantidad + paso).toFixed(3) };
    }
    if (r.desperdiciados.includes(i.productoId) || r.sobrantes.includes(i.productoId)) {
      const nueva = Math.max(paso, +(i.cantidad - paso).toFixed(3));
      if (nueva < i.cantidad) cambios.push(`${p.nombre}: −${paso} ${p.unidad} porque ${r.desperdiciados.includes(i.productoId) ? 'se tiró' : 'sobró'}.`);
      return { ...i, cantidad: nueva };
    }
    return i;
  });
  return { items: out, cambios };
}
