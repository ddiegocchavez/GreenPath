/**
 * Impacto por producto (para el dashboard) y tips para reducir el CO₂e de los alimentos.
 * CO₂e = cantidad (kg o L) × factor del tipo de alimento (Poore & Nemecek 2018, vía OWID).
 * Los productos por pieza (huevo, papel…) o sin factor no tienen huella: se muestran en pesos.
 */
import type { Plan } from './optimizar';
import type { Catalogo, Item, Producto } from './tipos';

export type FilaDetalle = {
  productoId: string; nombre: string;
  ref_mxn: number | null; opt_mxn: number | null;
  ref_kg: number | null; opt_kg: number | null;
  cambio?: string; // "Carne molida de res → Frijol" si se aceptó una alternativa
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function huella(p: Producto | undefined, cantidad: number): number | null {
  if (!p || p.huella_kgco2e == null || p.unidad === 'pza') return null;
  return r2(cantidad * p.huella_kgco2e);
}

/**
 * Desglose por producto: referencia (ticket o súper habitual) contra la optimizada.
 * `cambios` = alternativas aceptadas (de → a); el renglón queda con el producto original.
 */
export function desglose(
  cat: Catalogo, originales: Item[], refPlan: Plan | null, optPlan: Plan, cambios: { de: string; a: string }[],
  esTicket: boolean,
): FilaDetalle[] {
  const prod = (id: string) => cat.productos.find((p) => p.id === id);
  const eleccion = (plan: Plan | null, id: string) => plan?.elecciones.find((e) => e.producto.id === id);

  return originales.map((i) => {
    const p = prod(i.productoId);
    const cambio = cambios.find((c) => c.de === i.productoId);
    const destino = cambio ? cambio.a : i.productoId;
    const eRef = eleccion(refPlan, i.productoId);
    const eOpt = eleccion(optPlan, destino);
    // Si el destino ya era parte de la lista, su costo se reparte por cantidad entre ambos renglones.
    let opt_mxn: number | null = eOpt ? eOpt.costo : null;
    let opt_kg: number | null = eOpt ? huella(prod(destino), eOpt.paquetes * eOpt.oferta.cantidad) : null;
    if (eOpt && cambio) {
      const parte = i.cantidad / Math.max(i.cantidad, eOpt.item.cantidad);
      opt_mxn = r2(eOpt.costo * parte);
      opt_kg = opt_kg == null ? null : r2(opt_kg * parte);
    }
    return {
      productoId: i.productoId,
      nombre: cambio ? `${p?.nombre ?? i.productoId} → ${prod(destino)?.nombre ?? destino}` : p?.nombre ?? i.productoId,
      ref_mxn: esTicket ? i.precioTicket ?? null : eRef?.costo ?? null,
      opt_mxn,
      ref_kg: esTicket ? huella(p, i.cantidad) : eRef ? huella(p, eRef.paquetes * eRef.oferta.cantidad) : null,
      opt_kg,
      ...(cambio ? { cambio: `${p?.nombre} → ${prod(destino)?.nombre}` } : {}),
    };
  });
}

export type Acumulado = { productoId: string; nombre: string; ahorro_mxn: number; reduccion_kg: number; despensas: number };

/** Suma por producto en todas las despensas (solo diferencias con dato en ambos lados). */
export function acumularPorProducto(despensas: { detalle: FilaDetalle[] | null }[]): Acumulado[] {
  const m = new Map<string, Acumulado>();
  for (const d of despensas) {
    for (const f of d.detalle ?? []) {
      const nombre = f.cambio ?? f.nombre;
      const a = m.get(f.productoId) ?? { productoId: f.productoId, nombre, ahorro_mxn: 0, reduccion_kg: 0, despensas: 0 };
      if (f.ref_mxn != null && f.opt_mxn != null) a.ahorro_mxn = r2(a.ahorro_mxn + (f.ref_mxn - f.opt_mxn));
      if (f.ref_kg != null && f.opt_kg != null) a.reduccion_kg = r2(a.reduccion_kg + (f.ref_kg - f.opt_kg));
      a.despensas += 1;
      m.set(f.productoId, a);
    }
  }
  return [...m.values()];
}

// ---------- Tips para reducir CO₂e en alimentos ----------
export type Tip = { id: string; texto: string; fuente: string };
const OWID = 'Poore & Nemecek (2018), vía Our World in Data';

/** Comparaciones con factores del catálogo: solo se ofrecen si el producto está en tu lista. */
const COMPARACIONES: { id: string; de: string; a: string; idea: string }[] = [
  { id: 'res_frijol', de: 'res', a: 'frijol', idea: 'Prueba sustituir parte de la carne de res por frijol en guisos, tacos o chili.' },
  { id: 'res_lentejas', de: 'res', a: 'lentejas', idea: 'Una sopa o guiso de lentejas puede reemplazar una comida con carne de res.' },
  { id: 'res_pollo', de: 'res', a: 'pollo', idea: 'Si no quieres dejar la carne, cambiar res por pollo ya reduce mucho.' },
  { id: 'queso_frijol', de: 'queso', a: 'frijol', idea: 'El queso tiene una huella alta por kg: úsalo como acento, no como base del platillo.' },
  { id: 'leche_vegetal', de: 'leche', a: 'leche_vegetal', idea: 'Alternar leche de vaca con bebida de avena en café o cereal reduce tu huella.' },
  { id: 'arroz_papa', de: 'arroz', a: 'papa', idea: 'El arroz emite metano al cultivarse; alternarlo con papa baja la huella de tu guarnición.' },
  { id: 'pollo_frijol', de: 'pollo', a: 'frijol', idea: 'Un día a la semana sin carne: frijoles con arroz dan proteína completa.' },
];

const GENERALES: Tip[] = [
  { id: 'local', texto: 'Qué comes importa más que de dónde viene: en promedio el transporte es una parte pequeña (cerca del 6 %) de las emisiones de un alimento.', fuente: OWID },
  { id: 'desperdicio', texto: 'El desperdicio de alimentos causa alrededor del 6 % de las emisiones mundiales de gases de efecto invernadero. Usa la revisión del periodo para ajustar cantidades.', fuente: 'Our World in Data (2020), con datos de Poore & Nemecek (2018)' },
  { id: 'empaque', texto: 'El empaque suele ser una parte menor de la huella de un alimento; cambiar el tipo de alimento reduce mucho más que cambiar el empaque.', fuente: OWID },
  { id: 'leguminosas', texto: 'Las leguminosas (frijol, lentejas) están entre las proteínas con menor huella por kg: alrededor de 1.8 kg CO₂e/kg frente a casi 100 de la res.', fuente: OWID },
  { id: 'cafe', texto: 'El café tiene una de las huellas por kg más altas de la despensa: prepara solo lo que vas a tomar y no lo tires.', fuente: OWID },
  { id: 'sobrantes', texto: 'Cocina primero lo que está por caducar y congela porciones: lo que no se tira ya no genera emisiones de más.', fuente: 'Our World in Data (2020): desperdicio de alimentos' },
];

/** Tips relevantes a tu lista primero (con números del catálogo), luego generales. */
export function tipsPara(cat: Catalogo, items: Item[]): Tip[] {
  const prod = (id: string) => cat.productos.find((p) => p.id === id);
  const ids = new Set(items.map((i) => i.productoId));
  const propios: Tip[] = [];

  // El producto que más CO₂e aporta en tu lista.
  const aportes = items
    .map((i) => ({ p: prod(i.productoId), kg: huella(prod(i.productoId), i.cantidad) }))
    .filter((x): x is { p: Producto; kg: number } => !!x.p && x.kg != null && x.kg > 0)
    .sort((a, b) => b.kg - a.kg);
  const total = aportes.reduce((s, x) => s + x.kg, 0);
  if (aportes.length >= 2 && total > 0) {
    const top = aportes[0];
    propios.push({
      id: `mayor_${top.p.id}`,
      texto: `En tu lista, ${top.p.nombre.toLowerCase()} es lo que más CO₂e aporta: ≈ ${top.kg.toFixed(1)} kg, el ${Math.round((top.kg / total) * 100)} % de la huella estimada de tu despensa.`,
      fuente: OWID,
    });
  }
  for (const c of COMPARACIONES) {
    const de = prod(c.de), a = prod(c.a);
    if (!ids.has(c.de) || de?.huella_kgco2e == null || a?.huella_kgco2e == null) continue;
    const veces = de.huella_kgco2e / a.huella_kgco2e;
    propios.push({
      id: c.id,
      texto: `${c.idea} Por kg, ${de.nombre.toLowerCase()} emite ${de.huella_kgco2e} kg CO₂e y ${a.nombre.toLowerCase()} ${a.huella_kgco2e} (${veces >= 2 ? `≈ ${Math.round(veces)} veces menos` : 'menos'}).`,
      fuente: OWID,
    });
  }
  return [...propios, ...GENERALES];
}

/** Siguiente tip que no hayas visto; si ya viste todos, vuelve a empezar. */
export function siguienteTip(pool: Tip[], vistos: string[]): { tip: Tip; vistos: string[] } {
  const nuevo = pool.find((t) => !vistos.includes(t.id));
  if (nuevo) return { tip: nuevo, vistos: [...vistos, nuevo.id] };
  return { tip: pool[0], vistos: [pool[0].id] };
}

// ---------- Comparación justa ----------
export type Comparacion = {
  ref: number; opt: number; ahorro: number;            // pesos, solo productos cubiertos en ambas listas
  refKg: number | null; optKg: number | null;          // CO2e, solo productos con factor en ambas
  comparables: number; excluidos: string[];            // nombres que no se pudieron comparar
};

/**
 * Totales SOLO con productos que aparecen (con precio) en las dos listas.
 * Un producto sin precio o sin referencia NO cuenta como ahorro: se lista en `excluidos`.
 */
export function compararCubiertos(filas: FilaDetalle[]): Comparacion {
  const ok = filas.filter((f) => f.ref_mxn != null && f.opt_mxn != null);
  const conKg = ok.filter((f) => f.ref_kg != null && f.opt_kg != null);
  const ref = r2(ok.reduce((s, f) => s + (f.ref_mxn as number), 0));
  const opt = r2(ok.reduce((s, f) => s + (f.opt_mxn as number), 0));
  return {
    ref, opt, ahorro: r2(ref - opt),
    refKg: conKg.length ? r2(conKg.reduce((s, f) => s + (f.ref_kg as number), 0)) : null,
    optKg: conKg.length ? r2(conKg.reduce((s, f) => s + (f.opt_kg as number), 0)) : null,
    comparables: ok.length,
    excluidos: filas.filter((f) => f.ref_mxn == null || f.opt_mxn == null).map((f) => f.cambio ?? f.nombre),
  };
}

// ---------- Distribución del presupuesto (Plus) ----------
export type Distribucion = {
  categorias: { categoria: string; total: number; pct: number }[];
  total: number; presupuesto: number | null; sobrante: number | null; falta: number | null;
};

export function distribuirPresupuesto(cat: Catalogo, plan: Plan, presupuesto: number | null): Distribucion {
  const m = new Map<string, number>();
  for (const e of plan.elecciones) {
    const c = cat.productos.find((p) => p.id === e.producto.id)?.categoria ?? 'Otros';
    m.set(c, r2((m.get(c) ?? 0) + e.costo));
  }
  const total = r2(plan.total);
  const categorias = [...m.entries()].map(([categoria, t]) => ({ categoria, total: t, pct: total ? Math.round((t / total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
  return {
    categorias, total, presupuesto,
    sobrante: presupuesto != null && presupuesto >= total ? r2(presupuesto - total) : null,
    falta: presupuesto != null && presupuesto < total ? r2(total - presupuesto) : null,
  };
}
