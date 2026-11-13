'use client';
/** Editor de la despensa: buscar producto, ajustar cantidad, quitar. Lo usan la lista escrita y la revisión del ticket. */
import { useMemo, useState } from 'react';
import { cantidadTipica } from '@/lib/optimizar';
import { normalizar } from '@/lib/ticket';
import type { Catalogo, Item } from '@/lib/tipos';
import { pesos, Titulo } from '../ui';

const UNIDAD = { pza: 'pzas', kg: 'kg', l: 'L' } as const;
const PASO = { pza: 6, kg: 0.5, l: 1 } as const;

export function EditorItems({ cat, items, setItems, conPrecio = false }: {
  cat: Catalogo; items: Item[]; setItems: (x: Item[]) => void; conPrecio?: boolean;
}) {
  const [q, setQ] = useState('');
  const sugerencias = useMemo(() => {
    const n = normalizar(q);
    if (!n) return [];
    return cat.productos
      .filter((p) => !items.some((i) => i.productoId === p.id))
      .filter((p) => normalizar(p.nombre).includes(n) || p.sinonimos.some((s) => normalizar(s).startsWith(n)))
      .slice(0, 6);
  }, [q, cat.productos, items]);

  const agregar = (id: string) => { setItems([...items, { productoId: id, cantidad: cantidadTipica(cat, id) }]); setQ(''); };
  const cambiar = (id: string, cambio: Partial<Item>) => setItems(items.map((i) => (i.productoId === id ? { ...i, ...cambio } : i)));

  return (
    <div>
      <div className="relative">
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Agregar producto: huevo, leche, frijol…" />
        {sugerencias.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-mint bg-white shadow-lg">
            {sugerencias.map((p) => (
              <li key={p.id}><button className="w-full px-4 py-3 text-left font-bold hover:bg-mint" onClick={() => agregar(p.id)}>{p.nombre} <span className="text-sm font-normal text-muted">· {p.categoria}</span></button></li>
            ))}
          </ul>
        )}
      </div>
      {!q && items.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {cat.productos.slice(0, 10).map((p) => (
            <button key={p.id} onClick={() => agregar(p.id)} className="rounded-full border border-mint bg-white px-3 py-1 text-sm font-bold text-forest">+ {p.nombre}</button>
          ))}
        </div>
      )}
      <ul className="mt-4 space-y-2">
        {items.map((it) => {
          const p = cat.productos.find((x) => x.id === it.productoId)!;
          const paso = PASO[p.unidad];
          return (
            <li key={it.productoId} className="card !p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="font-extrabold text-forest">{p.nombre}</p>
                  {it.textoTicket && <p className="text-xs text-muted">Ticket: “{it.textoTicket}”</p>}
                </div>
                <button aria-label="Menos" className="h-9 w-9 rounded-full bg-mint font-black" onClick={() => cambiar(it.productoId, { cantidad: Math.max(paso, +(it.cantidad - paso).toFixed(3)) })}>−</button>
                <span className="w-16 text-center font-bold">{+it.cantidad.toFixed(2)} {UNIDAD[p.unidad]}</span>
                <button aria-label="Más" className="h-9 w-9 rounded-full bg-mint font-black" onClick={() => cambiar(it.productoId, { cantidad: +(it.cantidad + paso).toFixed(3) })}>+</button>
                <button aria-label={`Quitar ${p.nombre}`} className="ml-1 text-muted" onClick={() => setItems(items.filter((x) => x.productoId !== it.productoId))}>✕</button>
              </div>
              {conPrecio && (
                <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                  Pagaste
                  <input inputMode="decimal" className="w-28 rounded-xl border border-mint px-2 py-1 text-ink" value={it.precioTicket ?? ''}
                    onChange={(e) => cambiar(it.productoId, { precioTicket: e.target.value ? Number(e.target.value.replace(',', '.')) : undefined })} placeholder="$0.00" />
                </label>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PasoLista({ cat, items, setItems, onListo }: { cat: Catalogo; items: Item[]; setItems: (x: Item[]) => void; onListo: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <Titulo sub="Agrega lo que necesitas. Usamos la presentación más común; ajusta la cantidad.">Tu lista de despensa</Titulo>
      <EditorItems cat={cat} items={items} setItems={setItems} />
      <div className="mt-auto pt-6"><button className="btn btn-primary" disabled={!items.length} onClick={onListo}>Listo ({items.length})</button></div>
    </div>
  );
}

export function PasoPresupuesto({ nombre, titulo, inicial, onListo }: { nombre: string; titulo?: string; inicial: number | null; onListo: (p: number | null) => void }) {
  const [v, setV] = useState(inicial ? String(inicial) : '');
  const n = Number(v.replace(/[^\d.]/g, ''));
  return (
    <form className="flex flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (n > 0) onListo(n); }}>
      <Titulo sub="Con tu presupuesto decidimos dónde vale la pena subir calidad o sustentabilidad.">{titulo ?? `${nombre}, ¿cuánto quieres gastar?`}</Titulo>
      <div className="flex items-center gap-2 text-3xl font-black text-forest">
        $<input autoFocus inputMode="decimal" className="field !text-3xl !font-black" value={v} onChange={(e) => setV(e.target.value)} placeholder="1000" />
      </div>
      <div className="mt-3 flex gap-2">
        {[500, 1000, 1500, 2000].map((x) => (
          <button type="button" key={x} onClick={() => setV(String(x))} className="flex-1 rounded-full border border-mint bg-white py-2 font-bold text-forest">{pesos(x).replace('.00', '')}</button>
        ))}
      </div>
      <div className="mt-auto space-y-3 pt-6">
        <button className="btn btn-primary" disabled={!(n > 0)}>Continuar</button>
        <button type="button" className="btn btn-light" onClick={() => onListo(null)}>Sin presupuesto fijo</button>
      </div>
    </form>
  );
}
