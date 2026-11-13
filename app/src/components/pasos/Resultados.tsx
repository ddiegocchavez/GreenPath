'use client';
/** Resultados: plan recomendado, tiendas ordenadas por precio (mayor↔menor), combinaciones y detalle por producto. */
import { useMemo, useState } from 'react';
import { mapsUrl, masCercana } from '@/lib/geo';
import { etiquetaTiendas, evaluar, type Plan, type Recorte } from '@/lib/optimizar';
import type { Catalogo, Item, Prioridad, Punto, TiendaId } from '@/lib/tipos';
import { InsigniaP, InsigniaS, pesos } from '../ui';

const UNIDAD = { pza: 'pzas', kg: 'kg', l: 'L' } as const;

export function Resultados(props: {
  cat: Catalogo; nombre: string; items: Item[]; presupuesto: number | null; prioridad: Prioridad; punto: Punto;
  totalTicket: number | null; recortes: Recorte[]; onReiniciar: () => void; onEditar: () => void;
}) {
  const { cat, nombre, items, presupuesto, prioridad, punto, totalTicket, recortes } = props;
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc');
  const [abierto, setAbierto] = useState<string | null>(null);

  const cercanas = useMemo(() => Object.fromEntries(cat.tiendas.map((t) => [t.id, masCercana(cat.sucursales, t.id, punto)])), [cat, punto]);
  const planes = useMemo(
    () => evaluar(cat, items, presupuesto, prioridad, (t) => cercanas[t]?.km ?? null),
    [cat, items, presupuesto, prioridad, cercanas]);

  const mejor = planes[0];
  const solas = planes.filter((p) => p.tiendas.length === 1).sort((a, b) =>
    (a.faltantes.length - b.faltantes.length) || (orden === 'asc' ? a.total - b.total : b.total - a.total));
  const combos = planes.filter((p) => p.tiendas.length > 1).slice(0, 3);

  if (!mejor) return null;
  const ahorro = totalTicket != null ? totalTicket - mejor.total : null;
  const clave = (p: Plan) => p.tiendas.join('+');

  return (
    <div className="flex flex-1 flex-col gap-4 pb-8">
      <h1 className="text-3xl font-black text-forest">{nombre}, esto encontramos</h1>

      {/* Recomendado */}
      <section className="rounded-3xl bg-forest p-5 text-white">
        <p className="text-sm font-bold uppercase tracking-wide text-sprout">Recomendado</p>
        <p className="text-2xl font-black">{etiquetaTiendas(cat, mejor.tiendas)}</p>
        <p className="mt-2 text-5xl font-black">{pesos(mejor.total)}</p>
        {presupuesto != null && (
          <p className={`mt-1 font-bold ${mejor.dentroPresupuesto ? 'text-sprout' : 'text-sun'}`}>
            {mejor.dentroPresupuesto ? `Dentro de tu presupuesto (te sobran ${pesos(presupuesto - mejor.total)})` : `Se pasa ${pesos(mejor.total - presupuesto)} de tu presupuesto`}
          </p>
        )}
        {ahorro != null && (
          <p className="mt-1 text-lg font-extrabold text-sun">
            {ahorro > 0 ? `Ahorras ${pesos(ahorro)} frente a tu ticket` : `Cuesta ${pesos(-ahorro)} más que tu ticket`}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {mejor.calidadProm != null && <span className="rounded-full bg-white/15 px-3 py-1">Calidad promedio P{mejor.calidadProm.toFixed(1)}</span>}
          {mejor.sustProm != null && <span className="rounded-full bg-white/15 px-3 py-1">Sustentabilidad S{mejor.sustProm.toFixed(1)}</span>}
          {mejor.huellaKg != null && <span className="rounded-full bg-white/15 px-3 py-1">≈ {mejor.huellaKg} kg CO₂e</span>}
        </div>
        {mejor.faltantes.length > 0 && <p className="mt-2 text-sun">No encontramos: {mejor.faltantes.map((f) => f.nombre).join(', ')}</p>}
        <ul className="mt-3 space-y-1">
          {mejor.tiendas.map((t) => <Sucursal key={t} cat={cat} t={t} c={cercanas[t]} claro />)}
        </ul>
        <button className="mt-4 w-full rounded-2xl bg-white/15 py-3 font-extrabold" onClick={() => setAbierto(abierto === clave(mejor) ? null : clave(mejor))}>
          {abierto === clave(mejor) ? 'Ocultar productos' : 'Ver productos'}
        </button>
        {abierto === clave(mejor) && <Detalle cat={cat} plan={mejor} oscuro />}
      </section>

      {recortes.length > 0 && (
        <section className="card">
          <p className="font-extrabold text-forest">Para entrar en tu presupuesto ajustamos:</p>
          <ul className="mt-2 space-y-1">
            {recortes.map((r) => (
              <li key={r.producto.id}>
                {r.producto.nombre}: {+r.antes.toFixed(2)} → {r.despues > 0 ? `${+r.despues.toFixed(2)} ${UNIDAD[r.producto.unidad]}` : 'lo quitamos'}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Sugerencia cat={cat} items={items} />

      {/* Tiendas, ordenables */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-black text-forest">Por tienda</h2>
          <button className="rounded-full border border-mint bg-white px-3 py-1 text-sm font-bold text-forest" onClick={() => setOrden(orden === 'asc' ? 'desc' : 'asc')}>
            {orden === 'asc' ? 'Menor → mayor ↑' : 'Mayor → menor ↓'}
          </button>
        </div>
        <ul className="space-y-2">
          {solas.map((p) => <FilaPlan key={clave(p)} cat={cat} plan={p} presupuesto={presupuesto} abierto={abierto === clave(p)} onToggle={() => setAbierto(abierto === clave(p) ? null : clave(p))} cerca={cercanas[p.tiendas[0]]} />)}
        </ul>
      </section>

      {combos.length > 0 && (
        <section>
          <h2 className="mb-2 text-xl font-black text-forest">Combinando 2 tiendas</h2>
          <ul className="space-y-2">
            {combos.map((p) => <FilaPlan key={clave(p)} cat={cat} plan={p} presupuesto={presupuesto} abierto={abierto === clave(p)} onToggle={() => setAbierto(abierto === clave(p) ? null : clave(p))} />)}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted">
        Precios consultados en línea el 12-nov-2026 en walmart.com.mx, heb.com.mx (sucursal Gonzalitos) y costco.com.mx; en tienda pueden variar.
        Costco requiere membresía. Calidad P1–P4 y sustentabilidad S1–S4 son clasificación de GreenPath según lo que dice cada producto, no pruebas de laboratorio.
        Huella por tipo de alimento: Poore &amp; Nemecek (2018) vía Our World in Data. Sucursales: © colaboradores de OpenStreetMap.
      </p>

      <div className="space-y-3">
        <button className="btn btn-light" onClick={props.onEditar}>Editar mi despensa</button>
        <button className="btn btn-primary" onClick={props.onReiniciar}>Empezar de nuevo</button>
      </div>
    </div>
  );
}

function Sucursal({ cat, t, c, claro }: { cat: Catalogo; t: TiendaId; c: ReturnType<typeof masCercana>; claro?: boolean }) {
  const tienda = cat.tiendas.find((x) => x.id === t);
  if (!c) return null;
  return (
    <li className={`text-sm ${claro ? 'text-sprout' : 'text-muted'}`}>
      📍 {tienda?.nombre} más cercano a {c.km.toFixed(1)} km · <a className="underline" href={mapsUrl(c.sucursal)} target="_blank" rel="noreferrer">Abrir mapa</a>
      {tienda?.requiere_membresia && ' · requiere membresía'}
    </li>
  );
}

function FilaPlan({ cat, plan, presupuesto, abierto, onToggle, cerca }: {
  cat: Catalogo; plan: Plan; presupuesto: number | null; abierto: boolean; onToggle: () => void; cerca?: ReturnType<typeof masCercana>;
}) {
  return (
    <li className="card !p-4">
      <button className="flex w-full items-center gap-3 text-left" onClick={onToggle}>
        <div className="flex-1">
          <p className="text-lg font-extrabold text-forest">{etiquetaTiendas(cat, plan.tiendas)}</p>
          <p className="text-sm text-muted">
            {plan.elecciones.length} productos{plan.faltantes.length ? ` · faltan ${plan.faltantes.length}` : ''}
            {plan.km != null ? ` · ${plan.km} km` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-forest">{pesos(plan.total)}</p>
          {presupuesto != null && <p className={`text-xs font-bold ${plan.dentroPresupuesto ? 'text-leaf' : 'text-alert'}`}>{plan.dentroPresupuesto ? 'Te alcanza' : 'No alcanza'}</p>}
        </div>
      </button>
      {abierto && (
        <>
          {cerca && <ul className="mt-2"><Sucursal cat={cat} t={plan.tiendas[0]} c={cerca} /></ul>}
          {plan.faltantes.length > 0 && <p className="mt-2 text-sm text-alert">No hay en línea: {plan.faltantes.map((f) => f.nombre).join(', ')}</p>}
          <Detalle cat={cat} plan={plan} />
        </>
      )}
    </li>
  );
}

function Detalle({ cat, plan, oscuro }: { cat: Catalogo; plan: Plan; oscuro?: boolean }) {
  return (
    <ul className="mt-3 space-y-2">
      {plan.elecciones.map((e) => {
        const tienda = cat.tiendas.find((t) => t.id === e.oferta.tienda_id);
        const dif = e.item.precioTicket != null ? e.item.precioTicket - e.costo : null;
        return (
          <li key={e.producto.id} className={`rounded-2xl p-3 ${oscuro ? 'bg-white text-ink' : 'bg-mist'}`}>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="font-bold">{e.oferta.titulo}</p>
                <p className="text-xs text-muted">{tienda?.nombre} · {e.paquetes} × {pesos(e.oferta.precio)}</p>
              </div>
              <p className="font-black text-forest">{pesos(e.costo)}</p>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <InsigniaP n={e.oferta.calidad} motivo={e.oferta.calidad_motivo} />
              <InsigniaS n={e.oferta.sustentabilidad} motivo={e.oferta.sustentabilidad_motivo} />
              {dif != null && <span className={`text-xs font-bold ${dif >= 0 ? 'text-leaf' : 'text-alert'}`}>{dif >= 0 ? `−${pesos(dif)} vs ticket` : `+${pesos(-dif)} vs ticket`}</span>}
              <a href={e.oferta.url} target="_blank" rel="noreferrer" className="ml-auto text-xs font-bold text-pine underline">Ver en tienda</a>
            </div>
            <details className="mt-1 text-xs text-muted"><summary className="cursor-pointer">¿Por qué estos niveles?</summary><p>{e.oferta.calidad_motivo}</p><p>{e.oferta.sustentabilidad_motivo}</p></details>
          </li>
        );
      })}
    </ul>
  );
}

/** Cambio de alto impacto con dato y fuente: res → frijol (Poore & Nemecek vía OWID). */
function Sugerencia({ cat, items }: { cat: Catalogo; items: Item[] }) {
  const res = items.find((i) => i.productoId === 'res');
  const pRes = cat.productos.find((p) => p.id === 'res');
  const pFri = cat.productos.find((p) => p.id === 'frijol');
  if (!res || !pRes?.huella_kgco2e || !pFri?.huella_kgco2e) return null;
  const evita = Math.round(res.cantidad * (pRes.huella_kgco2e - pFri.huella_kgco2e) * 10) / 10;
  return (
    <section className="card border-leaf bg-mint">
      <p className="font-extrabold text-forest">🌱 Idea para reducir tu huella</p>
      <p className="mt-1 text-sm">
        Cambiar {+res.cantidad.toFixed(2)} kg de carne de res por frijol evitaría ≈ {evita} kg CO₂e
        ({pRes.huella_kgco2e} vs {pFri.huella_kgco2e} kg CO₂e por kg). Fuente: {pRes.huella_fuente}.
      </p>
    </section>
  );
}
