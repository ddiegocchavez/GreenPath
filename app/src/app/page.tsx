'use client';
/**
 * Flujo de GreenPath:
 * nombre → ubicación → (lista → presupuesto) | (ticket → revisar → objetivo) → prioridad → resultados.
 * Nada personal sale del teléfono: solo se lee el catálogo público de Supabase.
 */
import { useEffect, useState } from 'react';
import { Encabezado } from '@/components/ui';
import { PasoModo, PasoNombre, PasoUbicacion } from '@/components/pasos/Inicio';
import { PasoLista, PasoPresupuesto } from '@/components/pasos/Lista';
import { PasoObjetivo, PasoRevisar, PasoTicket, type Objetivo } from '@/components/pasos/Ticket';
import { PasoPrioridad } from '@/components/pasos/Prioridad';
import { Resultados } from '@/components/pasos/Resultados';
import { evaluar, recortarAPresupuesto, type Recorte } from '@/lib/optimizar';
import { cargarCatalogo } from '@/lib/supabase';
import type { Catalogo, Item, Prioridad, Punto } from '@/lib/tipos';

type Paso = 'nombre' | 'ubicacion' | 'modo' | 'lista' | 'presupuesto' | 'ticket' | 'revisar' | 'objetivo' | 'prioridad' | 'resultados';
const ORDEN: Paso[] = ['nombre', 'ubicacion', 'modo', 'lista', 'ticket', 'revisar', 'objetivo', 'presupuesto', 'prioridad', 'resultados'];

export default function Home() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [errorCat, setErrorCat] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Paso[]>(['nombre']);
  const paso = historial[historial.length - 1];

  const [nombre, setNombre] = useState('');
  const [punto, setPunto] = useState<Punto | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [totalTicket, setTotalTicket] = useState<number | null>(null);
  const [noReconocidos, setNoReconocidos] = useState<string[]>([]);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [presupuesto, setPresupuesto] = useState<number | null>(null);
  const [prioridad, setPrioridad] = useState<Prioridad>('precio');
  const [final, setFinal] = useState<{ items: Item[]; recortes: Recorte[] } | null>(null);

  useEffect(() => { cargarCatalogo().then(setCat).catch((e) => setErrorCat(String(e.message ?? e))); }, []);

  const ir = (p: Paso) => setHistorial((h) => [...h, p]);
  const atras = () => setHistorial((h) => (h.length > 1 ? h.slice(0, -1) : h));

  const totalDelTicket = () => totalTicket ?? (items.reduce((a, i) => a + (i.precioTicket ?? 0), 0) || null);

  /** Calcula la despensa final (con recorte si ni lo más barato cabe) y muestra resultados. */
  const resolver = (prio: Prioridad, presu: number | null) => {
    if (!cat) return;
    setPrioridad(prio); setPresupuesto(presu);
    let fin = { items, recortes: [] as Recorte[] };
    if (presu != null) {
      const barato = evaluar(cat, items, null, 'precio').sort((a, b) => a.faltantes.length - b.faltantes.length || a.total - b.total)[0];
      if (barato && barato.total > presu) fin = recortarAPresupuesto(cat, items, barato.tiendas, presu);
    }
    setFinal(fin);
    ir('resultados');
  };

  const reiniciar = () => {
    setItems([]); setTotalTicket(null); setNoReconocidos([]); setObjetivo(null); setPresupuesto(null); setFinal(null);
    setHistorial(['nombre', 'ubicacion', 'modo']);
  };

  const idx = ORDEN.indexOf(paso);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      <Encabezado paso={idx + 1} total={ORDEN.length} onAtras={historial.length > 1 ? atras : undefined} />
      {errorCat && <p className="card mb-4 font-bold text-alert">No pudimos cargar los precios: {errorCat}</p>}

      {paso === 'nombre' && <PasoNombre inicial={nombre} onListo={(n) => { setNombre(n); ir('ubicacion'); }} />}
      {paso === 'ubicacion' && <PasoUbicacion nombre={nombre} onListo={(p) => { setPunto(p); ir('modo'); }} />}
      {paso === 'modo' && <PasoModo nombre={nombre} onListo={(m) => ir(m)} />}

      {!cat && ['lista', 'ticket', 'revisar'].includes(paso) && !errorCat && <p className="text-muted">Cargando precios…</p>}

      {cat && paso === 'lista' && <PasoLista cat={cat} items={items} setItems={setItems} onListo={() => ir('presupuesto')} />}
      {cat && paso === 'ticket' && (
        <PasoTicket cat={cat} onLeido={(its, total, nr) => { setItems(its); setTotalTicket(total); setNoReconocidos(nr); ir('revisar'); }} />
      )}
      {cat && paso === 'revisar' && (
        <PasoRevisar cat={cat} items={items} setItems={setItems} total={totalTicket} setTotal={setTotalTicket} noReconocidos={noReconocidos} onListo={() => ir('objetivo')} />
      )}
      {paso === 'objetivo' && (
        <PasoObjetivo nombre={nombre} total={totalDelTicket()} onListo={(o) => {
          setObjetivo(o);
          if (o === 'actual') resolver('precio', null);
          else if (o === 'reducir') { setPresupuesto(totalDelTicket()); ir('prioridad'); }
          else ir('presupuesto');
        }} />
      )}
      {paso === 'presupuesto' && (
        <PasoPresupuesto nombre={nombre} inicial={presupuesto} titulo={objetivo === 'presupuesto' ? '¿Cuál es tu nuevo presupuesto?' : undefined}
          onListo={(p) => { setPresupuesto(p); ir('prioridad'); }} />
      )}
      {paso === 'prioridad' && <PasoPrioridad onListo={(p) => resolver(p, presupuesto)} />}

      {cat && paso === 'resultados' && final && punto && (
        <Resultados cat={cat} nombre={nombre} items={final.items} presupuesto={presupuesto} prioridad={prioridad} punto={punto}
          totalTicket={objetivo ? totalDelTicket() : null} recortes={final.recortes}
          onReiniciar={reiniciar} onEditar={() => setHistorial((h) => h.slice(0, h.lastIndexOf(objetivo ? 'revisar' : 'lista') + 1))} />
      )}
    </main>
  );
}
