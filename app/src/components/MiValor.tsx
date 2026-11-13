'use client';
/**
 * Mi valor GreenPath: separa lo ESTIMADO (precios de catálogo) de lo COMPROBADO (lo que el usuario
 * registró que pagó) y de lo DEMOSTRATIVO (costo de Plus en modo demo). Créditos, plan y datos personales.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  borrarMisDatos, cambiarPlanDemo, evaluarCompensacion, guardarRevision, historial, miEstado, registrarGastoReal,
  type Estado, type Movimiento, type Optimizacion, type Plan, type RevisionGuardada,
} from '@/lib/cuenta';
import type { Catalogo } from '@/lib/tipos';
import { Dashboard } from './Dashboard';
import { pesos, Titulo } from './ui';

const ETIQUETA = {
  estimado: 'bg-sun/30 text-forest', comprobado: 'bg-leaf text-white', demo: 'bg-mint text-muted', tuyo: 'bg-sprout text-forest',
} as const;
function Etiqueta({ t, children }: { t: keyof typeof ETIQUETA; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${ETIQUETA[t]}`}>{children}</span>;
}
function Dato({ titulo, valor, t, nota }: { titulo: string; valor: string; t: keyof typeof ETIQUETA; nota?: string }) {
  return (
    <div className="rounded-2xl bg-mist p-3">
      <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted">{titulo}</p><Etiqueta t={t}>{{ estimado: 'Estimado', comprobado: 'Comprobado', demo: 'Demostración', tuyo: 'Registrado por ti' }[t]}</Etiqueta></div>
      <p className="text-2xl font-black text-forest">{valor}</p>
      {nota && <p className="text-xs text-muted">{nota}</p>}
    </div>
  );
}

const MESES_DEMO = (desde?: string | null) => (desde ? Math.max(1, Math.ceil((Date.now() - new Date(desde).getTime()) / (30 * 864e5))) : 0);
const fecha = (s: string) => new Date(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

export function MiValor({ uid, cat, planes, estado, setEstado, onEditarPerfil, onNuevaLista, onBorrado }: {
  uid: string; cat: Catalogo; planes: Plan[]; estado: Estado | null; setEstado: (e: Estado) => void;
  onEditarPerfil: () => void; onNuevaLista: (o: Optimizacion, r: RevisionGuardada | null) => void; onBorrado: () => void;
}) {
  const [opts, setOpts] = useState<Optimizacion[]>([]);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [revs, setRevs] = useState<RevisionGuardada[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [revisando, setRevisando] = useState<string | null>(null);
  const actual = planes.find((p) => p.id === (estado?.plan ?? 'gratis'));

  const cargar = useCallback(() => Promise.all([historial(), miEstado()])
    .then(([h, e]) => { setOpts(h.optimizaciones); setMovs(h.movimientos); setRevs(h.revisiones); setEstado(e); })
    .catch((e) => setMsg(e instanceof Error ? e.message : String(e))), [setEstado]);
  useEffect(() => {
    let vivo = true;
    Promise.all([historial(), miEstado()])
      .then(([h, e]) => { if (vivo) { setOpts(h.optimizaciones); setMovs(h.movimientos); setRevs(h.revisiones); setEstado(e); } })
      .catch((e) => vivo && setMsg(e instanceof Error ? e.message : String(e)));
    return () => { vivo = false; };
  }, [setEstado]);

  const conRef = opts.filter((o) => o.total_referencia != null);
  const ref = conRef.reduce((a, o) => a + (o.total_referencia ?? 0), 0);
  const optTot = conRef.reduce((a, o) => a + o.total_optimizado, 0);
  const potencial = ref - optTot;
  const comprobadas = opts.filter((o) => o.gasto_real != null && o.total_referencia != null);
  const comprobado = comprobadas.reduce((a, o) => a + ((o.total_referencia ?? 0) - (o.gasto_real ?? 0)), 0);
  const gastoReal = comprobadas.reduce((a, o) => a + (o.gasto_real ?? 0), 0);
  const desperdicio = revs.reduce((a, r) => a + (r.costo_desperdicio ?? 0), 0);
  const meses = actual?.tipo === 'suscripcion' ? MESES_DEMO(estado?.plan_desde) : 0;
  const costoPlus = meses * (actual?.precio_mxn ?? 0);
  const pagosAnalisis = opts.reduce((a, o) => a + (o.pagado_demo_mxn ?? 0), 0);
  const conPlus = opts.filter((o) => o.ahorro_adicional_plus != null);
  const extraPlus = conPlus.reduce((a, o) => a + (o.ahorro_adicional_plus ?? 0), 0);
  const excluidos = opts.reduce((a, o) => a + (o.productos_excluidos?.length ?? 0), 0);
  const costo = costoPlus + pagosAnalisis;
  const co2Ref = opts.reduce((a, o) => a + (o.co2e_referencia ?? 0), 0);
  const co2Opt = opts.reduce((a, o) => a + (o.co2e_optimizado ?? 0), 0);

  const accion = async (f: () => Promise<unknown>, ok: string) => {
    try { await f(); setMsg(ok); await cargar(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 pb-8">
      <Titulo sub="Separamos lo estimado de lo que ya comprobaste.">Mi valor GreenPath</Titulo>
      {msg && <p className="card !p-3 font-bold text-pine">{msg}</p>}

      {/* Plan y créditos */}
      <section className="rounded-3xl bg-forest p-5 text-white">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-black">GreenPath {actual?.nombre?.replace('GreenPath ', '') ?? 'Gratis'}</p>
          <Etiqueta t="demo">Demo</Etiqueta>
        </div>
        {actual && actual.tipo === 'suscripcion' ? (
          <p className="mt-1 text-sprout">{estado?.saldo} análisis disponibles · usaste {estado?.usadas_ciclo} de {actual.optimizaciones_incluidas} este mes ({estado?.ciclo}) · {pesos(actual.precio_mxn)}/mes</p>
        ) : (
          <p className="mt-1 text-sprout">Sin suscripción. Análisis completo cuando lo necesites: Individual {pesos(planes.find((p) => p.id === 'individual')?.precio_mxn ?? 29)}.</p>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['gratis', 'flex', 'plus'] as const).map((id) => {
            const cfg = planes.find((p) => p.id === id);
            const es = (estado?.plan ?? 'gratis') === id;
            return (
              <button key={id} disabled={es} onClick={() => accion(async () => setEstado(await cambiarPlanDemo(id)), id === 'gratis' ? 'Cancelaste tu suscripción. Tu historial se conserva.' : `${cfg?.nombre} activado en modo demostración (sin cobro).`)}
                className={`rounded-2xl py-2 text-sm font-extrabold ${es ? 'bg-white text-forest' : 'bg-white/15'}`}>
                {id === 'gratis' ? 'Gratis' : `${id === 'flex' ? 'Flex' : 'Plus'} ${pesos(cfg?.precio_mxn ?? 0)}`}{es ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      </section>

      <Dashboard opts={opts} />

      {/* Resumen económico y ambiental */}
      <section className="card">
        <p className="mb-3 font-extrabold text-forest">Tu dinero</p>
        {opts.length === 0 ? (
          <p className="text-muted">Aún no guardas optimizaciones. Haz tu lista o sube un ticket y toca «Guardar».</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            <Dato titulo="Gasto de referencia" valor={pesos(ref)} t="estimado" nota="Tu ticket o tu súper habitual, con la misma lista." />
            <Dato titulo="Costo optimizado" valor={pesos(optTot)} t="estimado" />
            <Dato titulo="Ahorro potencial" valor={pesos(potencial)} t="estimado" nota={`Si compras lo recomendado a los precios consultados. Solo productos con precio en ambas listas${excluidos ? ` (${excluidos} sin comparar)` : ""}.`} />
            {conPlus.length > 0 && <Dato titulo="Ahorro adicional del análisis completo" valor={pesos(extraPlus)} t="estimado" nota={`Frente al modelo básico (Gratis) con la misma lista y precios, en ${conPlus.length} análisis completo(s).`} />}
            <Dato titulo="Ahorro comprobado" valor={comprobadas.length ? pesos(comprobado) : 'Sin datos'} t="comprobado"
              nota={comprobadas.length ? `Pagaste ${pesos(gastoReal)} en ${comprobadas.length} compra(s) registradas.` : 'Registra lo que pagaste en una optimización.'} />
            <Dato titulo="Dinero perdido por desperdicio" valor={revs.length ? pesos(desperdicio) : 'Sin datos'} t="tuyo" />
            {meses > 0 && <Dato titulo="Costo de suscripción" valor={pesos(costoPlus)} t="demo" nota={`${meses} mes(es) de ${actual?.nombre} en modo demostración.`} />}
            {pagosAnalisis > 0 && <Dato titulo="Análisis Individuales pagados" valor={pesos(pagosAnalisis)} t="demo" nota="Modo demostración (no se cobró)." />}
            {costo > 0 && <Dato titulo="Beneficio neto estimado" valor={pesos(potencial - costo)} t="estimado" nota="Ahorro potencial menos lo pagado (Plus y análisis)." />}
            {costo > 0 && comprobadas.length > 0 && <Dato titulo="Beneficio neto comprobado" valor={pesos(comprobado - costo)} t="comprobado" />}
          </div>
        )}
      </section>

      {opts.some((o) => o.co2e_referencia != null) && (
        <section className="card">
          <p className="mb-3 font-extrabold text-forest">Tu huella</p>
          <div className="grid grid-cols-2 gap-2">
            <Dato titulo="Referencia" valor={`${co2Ref.toFixed(1)} kg`} t="estimado" />
            <Dato titulo="Alternativa" valor={`${co2Opt.toFixed(1)} kg`} t="estimado" />
          </div>
          <p className="mt-2 text-xs text-muted">CO₂e = cantidad × factor (Poore &amp; Nemecek 2018, vía OWID). Es una reducción potencial, no emisiones evitadas comprobadas.</p>
        </section>
      )}

      {/* Historial */}
      {opts.length > 0 && (
        <section>
          <h2 className="mb-2 text-xl font-black text-forest">Historial</h2>
          <ul className="space-y-2">
            {opts.map((o) => (
              <FilaHistorial key={o.id} o={o} cat={cat} revision={revs.find((r) => r.optimizacion_id === o.id) ?? null}
                revisando={revisando === o.id} setRevisando={(v) => setRevisando(v ? o.id : null)}
                onGastoReal={(m) => accion(() => registrarGastoReal(o.id, m), 'Registramos lo que pagaste.')}
                onCompensacion={() => accion(async () => {
                  const r = await evaluarCompensacion(o.id);
                  setMsg(r.cumple ? (r.otorgado ? `Ahorro estimado ${pesos(r.ahorro_estimado)} < ${pesos(r.umbral ?? 0)}: te devolvimos 1 crédito (demo).` : 'Esta compensación ya se había otorgado.')
                    : `No aplica: el ahorro estimado (${pesos(r.ahorro_estimado)}) supera el umbral de ${pesos(r.umbral ?? 0)}.`);
                }, '')}
                onRevision={(rv, costo) => accion(() => guardarRevision(uid, o.id, rv, costo), 'Guardamos tu revisión: la usaremos en tu próxima lista.')}
                onNuevaLista={() => onNuevaLista(o, revs.find((r) => r.optimizacion_id === o.id) ?? null)} />
            ))}
          </ul>
        </section>
      )}

      {movs.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-extrabold text-forest">Movimientos de créditos ({movs.length})</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {movs.map((m) => <li key={m.id} className="flex justify-between gap-2"><span>{fecha(m.creado_en)} · {m.detalle ?? m.tipo}</span><b className={m.cantidad > 0 ? 'text-leaf' : 'text-alert'}>{m.cantidad > 0 ? '+' : ''}{m.cantidad}</b></li>)}
          </ul>
        </details>
      )}

      <section className="card space-y-3">
        <p className="font-extrabold text-forest">Tus datos</p>
        <button className="btn btn-light" onClick={onEditarPerfil}>Editar mis respuestas</button>
        <button className="btn btn-light !text-alert" onClick={() => { if (confirm('¿Borrar tu perfil, historial y créditos? No se puede deshacer.')) void accion(async () => { await borrarMisDatos(); onBorrado(); }, 'Borramos tus datos.'); }}>Borrar todos mis datos</button>
        <p className="text-xs text-muted">Cuenta anónima: no pedimos correo ni datos de pago. Tu ticket se lee en el teléfono y no se sube.</p>
      </section>
    </div>
  );
}

function FilaHistorial({ o, cat, revision, revisando, setRevisando, onGastoReal, onCompensacion, onRevision, onNuevaLista }: {
  o: Optimizacion; cat: Catalogo; revision: RevisionGuardada | null; revisando: boolean; setRevisando: (v: boolean) => void;
  onGastoReal: (m: number) => void; onCompensacion: () => void; onRevision: (r: { agotados: string[]; desperdiciados: string[]; sobrantes: string[] }, costo: number | null) => void;
  onNuevaLista: () => void;
}) {
  const [real, setReal] = useState('');
  const [rv, setRv] = useState({ agotados: [] as string[], desperdiciados: [] as string[], sobrantes: [] as string[] });
  const [costo, setCosto] = useState('');
  const nombre = (id: string) => cat.productos.find((p) => p.id === id)?.nombre ?? id;
  const tiendas = o.tiendas.map((t) => cat.tiendas.find((x) => x.id === t)?.nombre ?? t).join(' + ');
  const alternar = (k: keyof typeof rv, id: string) => setRv({ ...rv, [k]: rv[k].includes(id) ? rv[k].filter((x) => x !== id) : [...rv[k], id] });

  return (
    <li className="card !p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-extrabold text-forest">{fecha(o.creada_en)} · {tiendas}</p>
          <p className="text-xs text-muted">{o.items.length} productos · {o.origen === 'ticket' ? 'desde ticket' : 'lista'} · {{ gratis: 'Gratis', individual: 'Individual', flex: 'Flex', plus: 'Plus' }[o.modo]}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-forest">{pesos(o.total_optimizado)}</p>
          {o.total_referencia != null && <p className="text-xs text-muted">ref. {pesos(o.total_referencia)}</p>}
        </div>
      </div>
      {o.gasto_real != null ? (
        <p className="mt-2 text-sm font-bold text-leaf">Pagaste {pesos(o.gasto_real)}{o.total_referencia != null ? ` · ahorro comprobado ${pesos(o.total_referencia - o.gasto_real)}` : ''}</p>
      ) : (
        <form className="mt-2 flex items-center gap-2 text-sm" onSubmit={(e) => { e.preventDefault(); if (Number(real) > 0) onGastoReal(Number(real)); }}>
          <span className="text-muted">¿Cuánto pagaste?</span>
          <input inputMode="decimal" className="w-24 rounded-xl border border-mint px-2 py-1" value={real} onChange={(e) => setReal(e.target.value.replace(/[^\d.]/g, ''))} placeholder="$0" />
          <button className="rounded-xl bg-leaf px-3 py-1 font-bold text-white" disabled={!(Number(real) > 0)}>Registrar</button>
        </form>
      )}
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        {!revision && <button className="rounded-full border border-mint bg-white px-3 py-1 font-bold text-forest" onClick={() => setRevisando(!revisando)}>Revisión del periodo</button>}
        {revision && <span className="rounded-full bg-mint px-3 py-1 font-bold text-forest">✓ Revisión guardada</span>}
        <button className="rounded-full border border-mint bg-white px-3 py-1 font-bold text-forest" onClick={onNuevaLista}>Repetir lista{revision ? ' (ajustada)' : ''}</button>
        {(o.modo === 'plus' || o.modo === 'flex') && <button className="rounded-full border border-mint bg-white px-3 py-1 font-bold text-forest" onClick={onCompensacion}>¿Aplica compensación?</button>}
      </div>
      {revisando && (
        <div className="mt-3 space-y-3 rounded-2xl bg-mist p-3 text-sm">
          {([['agotados', '¿Qué se terminó antes de tiempo?'], ['desperdiciados', '¿Qué tuviste que tirar?'], ['sobrantes', '¿Qué te sobró?']] as const).map(([k, q]) => (
            <div key={k}>
              <p className="font-bold text-forest">{q}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {o.items.map((i) => (
                  <button key={i.productoId} onClick={() => alternar(k, i.productoId)}
                    className={`rounded-full border px-2 py-1 ${rv[k].includes(i.productoId) ? 'border-leaf bg-mint font-bold' : 'border-mint bg-white'}`}>{nombre(i.productoId)}</button>
                ))}
              </div>
            </div>
          ))}
          <label className="flex items-center gap-2">¿Cuánto dinero calculas que se tiró? <input inputMode="decimal" className="w-24 rounded-xl border border-mint px-2 py-1" value={costo} onChange={(e) => setCosto(e.target.value.replace(/[^\d.]/g, ''))} placeholder="$0" /></label>
          <button className="btn btn-primary" onClick={() => { onRevision(rv, Number(costo) > 0 ? Number(costo) : null); setRevisando(false); }}>Guardar revisión</button>
        </div>
      )}
    </li>
  );
}
