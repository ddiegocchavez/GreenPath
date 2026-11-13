'use client';
/** Foto del ticket → OCR (en el teléfono) → revisión editable → qué quiere hacer el usuario. */
import { useState } from 'react';
import { cantidadTipica } from '@/lib/optimizar';
import { aprender, analizarTexto, construirIndice, extraerCantidad, extraerPrecio, extraerTotal, leerAprendidas, leerTicket } from '@/lib/ticket';
import type { Catalogo, Item } from '@/lib/tipos';
import { Opcion, pesos, Titulo } from '../ui';
import { EditorItems } from './Lista';

export type Objetivo = 'actual' | 'reducir' | 'presupuesto';

export function PasoTicket({ cat, onLeido }: { cat: Catalogo; onLeido: (items: Item[], total: number | null, noReconocidos: string[]) => void }) {
  const [avance, setAvance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<string | null>(null);

  const procesar = async (f: File) => {
    setError(null); setAvance(0); setVista(URL.createObjectURL(f));
    try {
      const texto = await leerTicket(f, setAvance);
      const renglones = analizarTexto(texto, construirIndice(cat.productos, cat.ofertas, leerAprendidas()));
      const items = new Map<string, Item>();
      const sinProducto: string[] = [];
      for (const r of renglones) {
        if (!r.productoId) { if (r.precio != null) sinProducto.push(r.texto); continue; }
        const previo = items.get(r.productoId);
        const unidad = cat.productos.find((p) => p.id === r.productoId)!.unidad;
        const cant = r.unidades * (extraerCantidad(r.texto, unidad) ?? cantidadTipica(cat, r.productoId));
        items.set(r.productoId, previo
          ? { ...previo, cantidad: previo.cantidad + cant, precioTicket: (previo.precioTicket ?? 0) + (r.precio ?? 0) }
          : { productoId: r.productoId, cantidad: cant, precioTicket: r.precio ?? undefined, textoTicket: r.texto });
      }
      onLeido([...items.values()], extraerTotal(texto), sinProducto);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAvance(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <Titulo sub="La foto se lee en tu teléfono; no se sube a ningún servidor.">Sube la foto de tu ticket</Titulo>
      {vista ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vista} alt="Tu ticket" className="max-h-72 w-full rounded-3xl object-contain bg-white border border-mint" />
      ) : (
        <div className="card text-center text-7xl" aria-hidden>🧾</div>
      )}
      {avance != null && (
        <div className="mt-4">
          <p className="font-bold text-forest">Leyendo ticket… {Math.round(avance * 100)} %</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-mint"><div className="h-full bg-leaf transition-all" style={{ width: `${avance * 100}%` }} /></div>
        </div>
      )}
      {error && <p className="mt-4 font-bold text-alert">No pudimos leer el ticket: {error}</p>}
      <div className="mt-auto space-y-3 pt-6">
        <label className={`btn btn-primary block text-center ${avance != null ? 'pointer-events-none opacity-50' : ''}`}>
          📷 Tomar o elegir foto
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && procesar(e.target.files[0])} />
        </label>
        <p className="text-center text-sm text-muted">Tip: ticket estirado, con buena luz y sin sombras.</p>
      </div>
    </div>
  );
}

export function PasoRevisar({ cat, items, setItems, total, setTotal, noReconocidos, onListo }: {
  cat: Catalogo; items: Item[]; setItems: (x: Item[]) => void; total: number | null; setTotal: (n: number | null) => void;
  noReconocidos: string[]; onListo: () => void;
}) {
  const suma = items.reduce((a, i) => a + (i.precioTicket ?? 0), 0);
  const [pendientes, setPendientes] = useState(noReconocidos);

  /** El usuario dice qué producto es un renglón: se corrige y se recuerda para la próxima. */
  const corregir = (texto: string, productoId: string, desde?: string) => {
    aprender(texto, productoId);
    const base = desde ? items.find((i) => i.productoId === desde) : undefined;
    const resto = items.filter((i) => i.productoId !== desde && i.productoId !== productoId);
    const existente = items.find((i) => i.productoId === productoId);
    const nuevo: Item = {
      productoId,
      cantidad: (existente?.cantidad ?? 0) + (extraerCantidad(texto, cat.productos.find((p) => p.id === productoId)!.unidad) ?? cantidadTipica(cat, productoId)),
      precioTicket: (existente?.precioTicket ?? 0) + (base?.precioTicket ?? extraerPrecio(texto) ?? 0) || undefined,
      textoTicket: texto,
    };
    setItems([...resto, nuevo]);
  };

  return (
    <div className="flex flex-1 flex-col">
      <Titulo sub="El lector puede equivocarse: si un producto no es, cámbialo y GreenPath lo aprende.">Esto leímos de tu ticket</Titulo>
      <EditorItems cat={cat} items={items} setItems={setItems} conPrecio
        alCorregir={(it, id) => it.textoTicket && corregir(it.textoTicket, id, it.productoId)} />
      {pendientes.length > 0 && (
        <section className="card mt-4 !p-4">
          <p className="font-extrabold text-forest">¿Qué es esto? ({pendientes.length})</p>
          <p className="text-sm text-muted">Renglones con precio que no reconocimos. Dinos qué producto es y lo recordaremos.</p>
          <ul className="mt-2 space-y-2">
            {pendientes.slice(0, 12).map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-mono">{t}</span>
                <select className="rounded-xl border border-mint bg-white px-2 py-1" defaultValue=""
                  onChange={(e) => { if (e.target.value) { corregir(t, e.target.value); setPendientes(pendientes.filter((x) => x !== t)); } }}>
                  <option value="">Elegir…</option>
                  {cat.productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <button className="text-muted" aria-label="Ignorar" onClick={() => setPendientes(pendientes.filter((x) => x !== t))}>✕</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <label className="card mt-4 flex items-center justify-between !p-4">
        <span className="font-bold text-forest">Total que pagaste</span>
        <input inputMode="decimal" className="w-32 rounded-xl border border-mint px-2 py-1 text-right text-lg font-black"
          value={total ?? (suma ? suma.toFixed(2) : '')} onChange={(e) => setTotal(e.target.value ? Number(e.target.value.replace(',', '.')) : null)} placeholder="$0.00" />
      </label>
      <div className="mt-auto pt-6"><button className="btn btn-primary" disabled={!items.length} onClick={onListo}>Continuar</button></div>
    </div>
  );
}

export function PasoObjetivo({ nombre, total, onListo }: { nombre: string; total: number | null; onListo: (o: Objetivo) => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Titulo sub={total ? `Pagaste ${pesos(total)}.` : undefined}>{nombre}, ¿qué quieres hacer?</Titulo>
      <Opcion icono="🔎" titulo="Ver precio actual" sub="Cuánto cuesta hoy lo mismo en cada tienda." onClick={() => onListo('actual')} />
      <Opcion icono="✂️" titulo="Reducir mi despensa" sub="Lo mismo, pagando menos." onClick={() => onListo('reducir')} />
      <Opcion icono="🎯" titulo="Adaptar a un nuevo presupuesto" sub="Dinos cuánto quieres gastar y la ajustamos." onClick={() => onListo('presupuesto')} />
    </div>
  );
}
