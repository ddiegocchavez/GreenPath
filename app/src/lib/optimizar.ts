/**
 * Algoritmo de GreenPath: arma la despensa en cada tienda (o combinación de tiendas),
 * primero lo más barato y, si sobra presupuesto, sube calidad o sustentabilidad
 * donde cada peso extra rinde más. Funciones puras (se prueban con node).
 */
import type { Catalogo, Item, Oferta, Prioridad, Producto, Punto, TiendaId } from './tipos';

export type Eleccion = { item: Item; producto: Producto; oferta: Oferta; paquetes: number; costo: number };
export type Plan = {
  tiendas: TiendaId[];
  elecciones: Eleccion[];
  faltantes: Producto[];
  total: number;
  calidadProm: number | null;
  sustProm: number | null;
  huellaKg: number | null;
  dentroPresupuesto: boolean | null;
  km: number | null;
};
export type Recorte = { producto: Producto; antes: number; despues: number };

const EPS = 1e-9;

export function paquetesNecesarios(cantidad: number, oferta: Oferta) {
  return Math.max(1, Math.ceil(cantidad / oferta.cantidad - EPS));
}

/** Puntos que gana una oferta según la prioridad (4 = mejor nivel, 1 = peor). */
export function puntaje(o: Oferta, prioridad: Prioridad) {
  if (prioridad === 'calidad') return 5 - o.calidad + (5 - o.sustentabilidad) * 0.01;
  if (prioridad === 'sustentabilidad') return 5 - o.sustentabilidad + (5 - o.calidad) * 0.01;
  return 0;
}

type Opcion = { oferta: Oferta; paquetes: number; costo: number };

function opciones(cat: Catalogo, item: Item, tiendas: TiendaId[]): Opcion[] {
  return cat.ofertas
    .filter((o) => o.producto_id === item.productoId && tiendas.includes(o.tienda_id))
    .map((oferta) => {
      const paquetes = paquetesNecesarios(item.cantidad, oferta);
      return { oferta, paquetes, costo: round2(paquetes * oferta.precio) };
    })
    .sort((a, b) => a.costo - b.costo || a.oferta.calidad - b.oferta.calidad);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function armarPlan(
  cat: Catalogo, items: Item[], tiendas: TiendaId[], presupuesto: number | null, prioridad: Prioridad,
): Plan {
  const productos = new Map(cat.productos.map((p) => [p.id, p]));
  const faltantes: Producto[] = [];
  const filas: { item: Item; producto: Producto; ops: Opcion[]; i: number }[] = [];

  for (const item of items) {
    const producto = productos.get(item.productoId);
    if (!producto) continue;
    const ops = opciones(cat, item, tiendas);
    if (ops.length === 0) { faltantes.push(producto); continue; }
    let i = 0; // la más barata
    if (presupuesto == null && prioridad !== 'precio') {
      // Sin presupuesto: el mejor nivel disponible, y la más barata dentro de ese nivel.
      const mejor = Math.max(...ops.map((o) => puntaje(o.oferta, prioridad)));
      i = ops.findIndex((o) => puntaje(o.oferta, prioridad) === mejor);
    }
    filas.push({ item, producto, ops, i });
  }

  const totalDe = () => round2(filas.reduce((a, f) => a + f.ops[f.i].costo, 0));

  // Con presupuesto: mejoras codiciosas por "puntos ganados por peso extra".
  if (presupuesto != null && prioridad !== 'precio') {
    for (;;) {
      const restante = presupuesto - totalDe();
      let mejor: { f: (typeof filas)[number]; j: number; razon: number } | null = null;
      for (const f of filas) {
        const actual = f.ops[f.i];
        const pAct = puntaje(actual.oferta, prioridad);
        f.ops.forEach((o, j) => {
          const gana = puntaje(o.oferta, prioridad) - pAct;
          const extra = o.costo - actual.costo;
          if (gana <= 0.5 || extra > restante + EPS) return;
          const razon = gana / Math.max(extra, 0.01);
          if (!mejor || razon > mejor.razon) mejor = { f, j, razon };
        });
      }
      if (!mejor) break;
      const m = mejor as { f: (typeof filas)[number]; j: number };
      m.f.i = m.j;
    }
  }

  const elecciones: Eleccion[] = filas.map((f) => ({ item: f.item, producto: f.producto, ...f.ops[f.i] }));
  const total = totalDe();
  const prom = (k: 'calidad' | 'sustentabilidad') =>
    elecciones.length ? elecciones.reduce((a, e) => a + e.oferta[k], 0) / elecciones.length : null;

  let huella = 0, conHuella = 0;
  for (const e of elecciones) {
    if (e.producto.huella_kgco2e == null || e.producto.unidad === 'pza') continue;
    huella += e.paquetes * e.oferta.cantidad * e.producto.huella_kgco2e;
    conHuella++;
  }

  return {
    tiendas, elecciones, faltantes, total,
    calidadProm: prom('calidad'), sustProm: prom('sustentabilidad'),
    huellaKg: conHuella ? Math.round(huella * 10) / 10 : null,
    dentroPresupuesto: presupuesto == null ? null : total <= presupuesto + EPS,
    km: null,
  };
}

/** Si ni lo más barato alcanza: quita un paquete del renglón más caro hasta caber. */
export function recortarAPresupuesto(cat: Catalogo, items: Item[], tiendas: TiendaId[], presupuesto: number) {
  let actuales = items.map((x) => ({ ...x }));
  const recortes = new Map<string, Recorte>();
  for (let guard = 0; guard < 200; guard++) {
    const plan = armarPlan(cat, actuales, tiendas, null, 'precio');
    if (plan.total <= presupuesto + EPS || plan.elecciones.length === 0) break;
    const caro = [...plan.elecciones].sort((a, b) => b.oferta.precio - a.oferta.precio)[0];
    const nueva = (caro.paquetes - 1) * caro.oferta.cantidad;
    const previo = recortes.get(caro.producto.id);
    recortes.set(caro.producto.id, { producto: caro.producto, antes: previo?.antes ?? caro.item.cantidad, despues: nueva });
    actuales = nueva > 0
      ? actuales.map((x) => (x.productoId === caro.producto.id ? { ...x, cantidad: nueva } : x))
      : actuales.filter((x) => x.productoId !== caro.producto.id);
  }
  return { items: actuales, recortes: [...recortes.values()] };
}

/** Evalúa cada tienda sola y cada pareja; regresa ordenado del mejor al peor. */
export function evaluar(
  cat: Catalogo, items: Item[], presupuesto: number | null, prioridad: Prioridad,
  distancia?: (t: TiendaId) => number | null,
): Plan[] {
  const ids = cat.tiendas.map((t) => t.id);
  const combos: TiendaId[][] = ids.map((t) => [t]);
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) combos.push([ids[a], ids[b]]);

  const planes = combos.map((ts) => {
    const plan = armarPlan(cat, items, ts, presupuesto, prioridad);
    if (distancia) {
      const ds = ts.map(distancia);
      plan.km = ds.some((d) => d == null) ? null : Math.round((ds as number[]).reduce((a, d) => a + d, 0) * 10) / 10;
    }
    return plan;
  });

  // Nivel promedio según la prioridad (1 = mejor); redondeado para que diferencias mínimas no ganen a un mejor precio.
  const nivel = (p: Plan) => {
    const v = prioridad === 'calidad' ? p.calidadProm : prioridad === 'sustentabilidad' ? p.sustProm : null;
    return v == null ? 0 : Math.round(v * 4) / 4;
  };
  return planes.sort((a, b) =>
    a.faltantes.length - b.faltantes.length
    || Number(b.dentroPresupuesto ?? true) - Number(a.dentroPresupuesto ?? true)
    || nivel(a) - nivel(b)
    || a.total - b.total
    || a.tiendas.length - b.tiendas.length);
}

/** Cantidad típica (la presentación más común) para un producto: se usa al leer un ticket. */
export function cantidadTipica(cat: Catalogo, productoId: string) {
  const cs = cat.ofertas.filter((o) => o.producto_id === productoId).map((o) => o.cantidad).sort((a, b) => a - b);
  if (!cs.length) return 1;
  const freq = new Map<number, number>();
  for (const c of cs) freq.set(c, (freq.get(c) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

/**
 * Si el ticket no dice la presentación (o el OCR la leyó mal), se usa la del catálogo cuyo precio
 * se parece más a lo que se pagó por pieza. Solo si la diferencia es menor al 35 %.
 */
export function presentacionPorPrecio(cat: Catalogo, productoId: string, precioPieza: number | null | undefined) {
  if (!precioPieza) return null;
  let mejor: { cantidad: number; dif: number } | null = null;
  for (const o of cat.ofertas) {
    if (o.producto_id !== productoId) continue;
    const dif = Math.abs(o.precio - precioPieza) / precioPieza;
    if (!mejor || dif < mejor.dif) mejor = { cantidad: o.cantidad, dif };
  }
  return mejor && mejor.dif <= 0.35 ? mejor.cantidad : null;
}

export type EvaluacionAlternativa = {
  id: string; de: string; a: string; motivo: string;
  costoDe: number; costoA: number; ahorro: number;      // pesos (+ = la alternativa es más barata)
  kgDe: number; kgA: number; reduccion: number;          // kg CO2e (+ = la alternativa emite menos)
  tipo: 'gana_gana' | 'menor_huella';
};

/**
 * Para cada sustituto equivalente, compara con la MISMA cantidad y en las mismas tiendas:
 * costo más barato disponible y CO2e (cantidad comprada × factor). Solo devuelve los que bajan emisiones;
 * 'gana_gana' = además bajan el costo. Ordena gana-gana primero, por mayor reducción de CO2e.
 */
export function evaluarAlternativas(
  cat: Catalogo, items: Item[], candidatos: { id: string; de: string; a: string; motivo: string }[], tiendas: TiendaId[],
): EvaluacionAlternativa[] {
  const out: EvaluacionAlternativa[] = [];
  for (const c of candidatos) {
    const item = items.find((i) => i.productoId === c.de);
    const pDe = cat.productos.find((p) => p.id === c.de), pA = cat.productos.find((p) => p.id === c.a);
    if (!item || !pDe || !pA || pDe.unidad !== pA.unidad) continue;
    const de = armarPlan(cat, [item], tiendas, null, 'precio');
    const a = armarPlan(cat, [{ productoId: c.a, cantidad: item.cantidad }], tiendas, null, 'precio');
    if (!de.elecciones.length || !a.elecciones.length || de.huellaKg == null || a.huellaKg == null) continue;
    const ahorro = round2(de.total - a.total);
    const reduccion = Math.round((de.huellaKg - a.huellaKg) * 10) / 10;
    if (reduccion <= 0) continue; // nunca proponer más huella
    out.push({
      id: c.id, de: c.de, a: c.a, motivo: c.motivo, costoDe: de.total, costoA: a.total, ahorro,
      kgDe: de.huellaKg, kgA: a.huellaKg, reduccion, tipo: ahorro >= 0.5 ? 'gana_gana' : 'menor_huella',
    });
  }
  return out.sort((x, y) => (x.tipo === y.tipo ? y.reduccion - x.reduccion : x.tipo === 'gana_gana' ? -1 : 1));
}

export const etiquetaTiendas = (cat: Catalogo, ts: TiendaId[]) =>
  ts.map((t) => cat.tiendas.find((x) => x.id === t)?.nombre ?? t).join(' + ');

export type { Punto };
