'use client';
/**
 * Dashboard: lo que disminuiste por producto en cada despensa guardada.
 * Dos gráficas de barras horizontales de una sola serie (pesos y kg CO₂e por separado: nunca dos ejes),
 * cifras en tinta de texto, y la tabla por despensa como vista accesible de los mismos datos.
 * Todo es ESTIMADO (precios consultados y factores por tipo de alimento), salvo que registres lo que pagaste.
 */
import { useState } from 'react';
import type { Optimizacion } from '@/lib/cuenta';
import { acumularPorProducto, type Acumulado } from '@/lib/impacto';
import { pesos } from './ui';

const MAX_BARRAS = 8;
const fecha = (s: string) => new Date(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
const kg = (n: number) => `${n.toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg`;

function Barras({ titulo, filas, valor, formato }: {
  titulo: string; filas: Acumulado[]; valor: (a: Acumulado) => number; formato: (n: number) => string;
}) {
  const ordenadas = filas.filter((f) => valor(f) > 0).sort((a, b) => valor(b) - valor(a));
  if (!ordenadas.length) return <p className="text-sm text-muted">{titulo}: aún sin reducciones registradas.</p>;
  const visibles = ordenadas.slice(0, MAX_BARRAS);
  const resto = ordenadas.slice(MAX_BARRAS).reduce((s, f) => s + valor(f), 0);
  const max = Math.max(...visibles.map(valor), resto);
  const filasVis = resto > 0 ? [...visibles.map((f) => ({ n: f.nombre, v: valor(f) })), { n: 'Otros', v: resto }] : visibles.map((f) => ({ n: f.nombre, v: valor(f) }));
  return (
    <figure>
      <figcaption className="mb-2 font-extrabold text-forest">{titulo}</figcaption>
      <ul className="space-y-2" role="list">
        {filasVis.map((f) => (
          <li key={f.n} className="group" title={`${f.n}: ${formato(f.v)}`}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-ink">{f.n}</span>
              <span className="shrink-0 font-bold text-ink">{formato(f.v)}</span>
            </div>
            <div className="mt-1 h-2.5 w-full rounded-r bg-mist" aria-hidden>
              <div className="h-full rounded-r-[4px] bg-leaf transition-opacity group-hover:opacity-80" style={{ width: `${Math.max(2, (f.v / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function Dashboard({ opts }: { opts: Optimizacion[] }) {
  const conDetalle = opts.filter((o) => o.detalle?.length);
  const [abierta, setAbierta] = useState<string | null>(null);
  if (!conDetalle.length) {
    return (
      <section className="card">
        <p className="font-extrabold text-forest">Tu reducción por producto</p>
        <p className="mt-1 text-sm text-muted">Guarda una despensa para ver aquí cuánto bajaste por producto, en pesos y en CO₂e.</p>
      </section>
    );
  }
  const acumulado = acumularPorProducto(conDetalle);
  const totalMxn = acumulado.reduce((s, a) => s + Math.max(0, a.ahorro_mxn), 0);
  const totalKg = acumulado.reduce((s, a) => s + Math.max(0, a.reduccion_kg), 0);

  return (
    <section className="card space-y-5">
      <div>
        <p className="text-xl font-black text-forest">Tu reducción por producto</p>
        <p className="text-xs text-muted">Estimado en {conDetalle.length} despensa(s) guardada(s): referencia (tu ticket o tu súper habitual) contra lo optimizado.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-mist p-3"><p className="text-sm text-muted">Ahorro estimado</p><p className="text-2xl font-black text-forest">{pesos(totalMxn)}</p></div>
        <div className="rounded-2xl bg-mist p-3"><p className="text-sm text-muted">CO₂e reducido</p><p className="text-2xl font-black text-forest">{kg(totalKg)}</p></div>
      </div>

      <Barras titulo="Pesos ahorrados por producto" filas={acumulado} valor={(a) => a.ahorro_mxn} formato={pesos} />
      <Barras titulo="kg CO₂e reducidos por producto" filas={acumulado} valor={(a) => a.reduccion_kg} formato={kg} />

      <div>
        <p className="mb-2 font-extrabold text-forest">Por despensa</p>
        <ul className="space-y-2">
          {conDetalle.map((o) => {
            const ah = (o.detalle ?? []).reduce((s, f) => s + (f.ref_mxn != null && f.opt_mxn != null ? f.ref_mxn - f.opt_mxn : 0), 0);
            const co = (o.detalle ?? []).reduce((s, f) => s + (f.ref_kg != null && f.opt_kg != null ? f.ref_kg - f.opt_kg : 0), 0);
            return (
              <li key={o.id} className="rounded-2xl border border-mint">
                <button className="flex w-full items-center justify-between gap-2 p-3 text-left" onClick={() => setAbierta(abierta === o.id ? null : o.id)} aria-expanded={abierta === o.id}>
                  <span className="font-bold text-forest">{fecha(o.creada_en)} · {o.detalle?.length} productos</span>
                  <span className="text-sm text-ink"><b>{pesos(ah)}</b> · <b>{kg(co)}</b> {abierta === o.id ? '▲' : '▼'}</span>
                </button>
                {abierta === o.id && (
                  <div className="overflow-x-auto px-3 pb-3">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted"><th className="py-1 font-semibold">Producto</th><th className="text-right font-semibold">Antes</th><th className="text-right font-semibold">Después</th><th className="text-right font-semibold">CO₂e −</th></tr></thead>
                      <tbody>
                        {(o.detalle ?? []).map((f) => (
                          <tr key={f.productoId} className="border-t border-mint">
                            <td className="py-1 pr-2">{f.cambio ?? f.nombre}</td>
                            <td className="text-right">{f.ref_mxn != null ? pesos(f.ref_mxn) : '—'}</td>
                            <td className="text-right">{f.opt_mxn != null ? pesos(f.opt_mxn) : 'Sin precio'}</td>
                            <td className="text-right">{f.ref_kg != null && f.opt_kg != null ? kg(f.ref_kg - f.opt_kg) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-1 text-xs text-muted">— = sin referencia o sin factor de emisión (no inventamos ese dato).</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
