'use client';
/**
 * Flujo de GreenPath:
 * (primera vez) nombre → encuesta → diagnóstico y plan →
 * ubicación → (lista → presupuesto) | (ticket → revisar → objetivo) → prioridad → resultados.
 * Mi valor (historial, ahorro, créditos, perfil) está siempre a un toque en el encabezado.
 * Cuenta anónima de Supabase: sin correo ni contraseña; el ticket se lee en el teléfono.
 */
import { useEffect, useState } from 'react';
import { Encabezado } from '@/components/ui';
import { PasoModo, PasoNombre, PasoUbicacion } from '@/components/pasos/Inicio';
import { PasoLista, PasoPresupuesto } from '@/components/pasos/Lista';
import { PasoObjetivo, PasoRevisar, PasoTicket, type Objetivo } from '@/components/pasos/Ticket';
import { PasoPrioridad } from '@/components/pasos/Prioridad';
import { Resultados } from '@/components/pasos/Resultados';
import { Encuesta, perfilVacio } from '@/components/onboarding/Encuesta';
import { Propuesta } from '@/components/onboarding/Propuesta';
import { MiValor } from '@/components/MiValor';
import { asegurarSesion, cambiarPlanDemo, cerrarSesion, guardarPerfil, leerPerfil, leerPlanes, miEstado, type Estado, type Plan } from '@/lib/cuenta';
import { evaluar, recortarAPresupuesto, type Recorte } from '@/lib/optimizar';
import { ajustarPorRevision, type Perfil } from '@/lib/perfil';
import { cargarCatalogo } from '@/lib/supabase';
import type { Catalogo, Item, Prioridad, Punto } from '@/lib/tipos';

type Paso = 'cargando' | 'nombre' | 'encuesta' | 'propuesta' | 'ubicacion' | 'modo' | 'lista' | 'presupuesto' | 'ticket' | 'revisar'
  | 'objetivo' | 'prioridad' | 'resultados' | 'mivalor';
const ORDEN: Paso[] = ['nombre', 'encuesta', 'propuesta', 'ubicacion', 'modo', 'lista', 'ticket', 'revisar', 'objetivo', 'presupuesto', 'prioridad', 'resultados'];

export default function Home() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [errorCat, setErrorCat] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Paso[]>(['cargando']);
  const paso = historial[historial.length - 1];

  const [uid, setUid] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [punto, setPunto] = useState<Punto | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [nota, setNota] = useState<string[]>([]);
  const [totalTicket, setTotalTicket] = useState<number | null>(null);
  const [noReconocidos, setNoReconocidos] = useState<string[]>([]);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [presupuesto, setPresupuesto] = useState<number | null>(null);
  const [prioridad, setPrioridad] = useState<Prioridad>('precio');
  const [final, setFinal] = useState<{ items: Item[]; recortes: Recorte[] } | null>(null);

  useEffect(() => { cargarCatalogo().then(setCat).catch((e) => setErrorCat(String(e.message ?? e))); }, []);
  useEffect(() => {
    (async () => {
      try {
        const id = await asegurarSesion();
        const [p, pl] = await Promise.all([leerPerfil(), leerPlanes()]);
        setUid(id); setPlanes(pl);
        if (p?.encuesta_completada_en) {
          setPerfil(p); setNombre(p.nombre ?? '');
          setEstado(await miEstado());
          setHistorial(['ubicacion']);
        } else setHistorial(['nombre']);
      } catch (e) {
        // Sin cuenta, la app sigue funcionando (solo sin historial ni planes).
        setAviso(`Modo sin cuenta: ${e instanceof Error ? e.message : String(e)}`);
        setHistorial(['nombre']);
      }
    })();
  }, []);

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
    setItems([]); setNota([]); setTotalTicket(null); setNoReconocidos([]); setObjetivo(null); setPresupuesto(null); setFinal(null);
    setHistorial(['ubicacion', 'modo']);
  };

  const terminarEncuesta = async (p: Perfil) => {
    const conFecha = { ...p, encuesta_completada_en: p.encuesta_completada_en ?? new Date().toISOString() };
    setPerfil(conFecha);
    if (uid) {
      try { await guardarPerfil(uid, conFecha); setEstado(await miEstado()); }
      catch (e) { setAviso(`No pudimos guardar tu perfil: ${e instanceof Error ? e.message : String(e)}`); }
    }
    ir('propuesta');
  };

  const idx = ORDEN.indexOf(paso);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      <Encabezado paso={idx >= 0 ? idx + 1 : undefined} total={ORDEN.length} onAtras={historial.length > 1 ? atras : undefined}
        onMiValor={perfil && uid && paso !== 'mivalor' ? () => ir('mivalor') : undefined} plan={perfil ? estado?.plan : undefined}
        onCerrarSesion={uid && (paso === 'nombre' || paso === 'ubicacion') ? async () => { await cerrarSesion().catch(() => undefined); location.reload(); } : undefined} />
      {errorCat && <p className="card mb-4 font-bold text-alert">No pudimos cargar los precios: {errorCat}</p>}
      {aviso && <p className="card mb-4 text-sm text-muted">{aviso}</p>}

      {paso === 'cargando' && <p className="text-muted">Cargando…</p>}
      {paso === 'nombre' && <PasoNombre inicial={nombre} onListo={(n) => { setNombre(n); if (perfil?.encuesta_completada_en) ir('ubicacion'); else ir('encuesta'); }} />}
      {paso === 'encuesta' && cat && (
        <Encuesta inicial={perfil ? { ...perfil, nombre } : perfilVacio(nombre)} tiendas={cat.tiendas} onListo={terminarEncuesta}
          onCancelar={historial.length > 1 ? atras : undefined} />
      )}
      {paso === 'propuesta' && perfil && (
        <Propuesta perfil={perfil} planes={planes}
          onGratis={() => ir('ubicacion')}
          onPlus={async () => { if (uid) { try { setEstado(await cambiarPlanDemo('plus')); } catch (e) { setAviso(String(e)); } } ir('ubicacion'); }} />
      )}
      {paso === 'ubicacion' && <PasoUbicacion nombre={nombre} onListo={(p) => { setPunto(p); ir('modo'); }} />}
      {paso === 'modo' && <PasoModo nombre={nombre} onListo={(m) => ir(m)} />}

      {!cat && ['lista', 'ticket', 'revisar', 'encuesta'].includes(paso) && !errorCat && <p className="text-muted">Cargando precios…</p>}

      {cat && paso === 'lista' && (
        <>
          {nota.length > 0 && (
            <section className="card mb-3 !p-4 text-sm">
              <p className="font-extrabold text-forest">Ajustamos tu lista con tu revisión anterior</p>
              <ul className="mt-1 space-y-1">{nota.map((n) => <li key={n}>• {n}</li>)}</ul>
            </section>
          )}
          <PasoLista cat={cat} items={items} setItems={setItems} onListo={() => ir('presupuesto')} />
        </>
      )}
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
        <PasoPresupuesto nombre={nombre} inicial={presupuesto ?? perfil?.gasto_por_despensa ?? null}
          titulo={objetivo === 'presupuesto' ? '¿Cuál es tu nuevo presupuesto?' : undefined}
          onListo={(p) => { setPresupuesto(p); ir('prioridad'); }} />
      )}
      {paso === 'prioridad' && <PasoPrioridad onListo={(p) => resolver(p, presupuesto)} />}

      {cat && paso === 'resultados' && final && punto && (
        <Resultados cat={cat} nombre={nombre} items={final.items} presupuesto={presupuesto} prioridad={prioridad} punto={punto}
          totalTicket={objetivo ? totalDelTicket() : null} recortes={final.recortes}
          origen={objetivo ? 'ticket' : 'lista'} uid={uid} perfil={perfil} setPerfil={setPerfil} estado={estado} setEstado={setEstado}
          onVerValor={() => ir('mivalor')}
          onReiniciar={reiniciar} onEditar={() => setHistorial((h) => h.slice(0, h.lastIndexOf(objetivo ? 'revisar' : 'lista') + 1))} />
      )}

      {cat && paso === 'mivalor' && uid && (
        <MiValor uid={uid} cat={cat} planes={planes} estado={estado} setEstado={setEstado}
          onEditarPerfil={() => ir('encuesta')}
          onNuevaLista={(o, r) => {
            const ajuste = r ? ajustarPorRevision(cat, o.items, r) : { items: o.items, cambios: [] };
            setItems(ajuste.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })));
            setNota(ajuste.cambios); setObjetivo(null); setTotalTicket(null);
            setHistorial(punto ? ['modo', 'lista'] : ['ubicacion']);
          }}
          onBorrado={() => { setPerfil(null); setEstado(null); setUid(null); setNombre(''); setHistorial(['cargando']); location.reload(); }} />
      )}
    </main>
  );
}
