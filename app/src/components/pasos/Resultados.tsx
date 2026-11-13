'use client';
/** Resultados: plan recomendado, tiendas ordenadas por precio (mayor↔menor), combinaciones y detalle por producto. */
import { useMemo, useState } from 'react';
import { actualizarAlternativas, guardarOptimizacion, type Estado } from '@/lib/cuenta';
import { mapsUrl, masCercana } from '@/lib/geo';
import { armarPlan, etiquetaTiendas, evaluar, type Plan, type Recorte } from '@/lib/optimizar';
import { alternativasPara, aplicarAlternativas, aplicarPreferencias, type Perfil } from '@/lib/perfil';
import type { Catalogo, Item, Prioridad, Punto, TiendaId } from '@/lib/tipos';
import { InsigniaP, InsigniaS, pesos } from '../ui';

const UNIDAD = { pza: 'pzas', kg: 'kg', l: 'L' } as const;

export function Resultados(props: {
  cat: Catalogo; nombre: string; items: Item[]; presupuesto: number | null; prioridad: Prioridad; punto: Punto;
  totalTicket: number | null; recortes: Recorte[]; onReiniciar: () => void; onEditar: () => void;
  origen: 'lista' | 'ticket'; uid: string | null; perfil: Perfil | null; setPerfil: (p: Perfil) => void;
  estado: Estado | null; setEstado: (e: Estado) => void; onVerValor: () => void;
}) {
  const { nombre, presupuesto, prioridad, punto, totalTicket, recortes, perfil, estado } = props;
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [habitualLocal, setHabitualLocal] = useState<TiendaId | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [idem] = useState(() => crypto.randomUUID());

  // Preferencias del perfil (súper, calidad, restricciones, marcas) y alternativas aceptadas.
  const pref = useMemo(() => aplicarPreferencias(props.cat, props.items, perfil), [props.cat, props.items, perfil]);
  const cat = pref.cat;
  const disponibles = alternativasPara(pref.items, perfil);
  const aceptadas = (perfil?.alternativas_aceptadas ?? []).filter((a) => disponibles.some((d) => d.id === a));
  const claveAceptadas = aceptadas.join();
  const items = aplicarAlternativas(pref.items, claveAceptadas ? claveAceptadas.split(',') : []);

  // Gratis: comparación por tienda a precio más bajo. Plus (con créditos): optimización completa.
  const completo = estado?.plan === 'plus' && estado.saldo > 0;
  const cercanas = useMemo(() => Object.fromEntries(cat.tiendas.map((t) => [t.id, masCercana(cat.sucursales, t.id, punto)])), [cat, punto]);
  const dist = (t: TiendaId) => cercanas[t]?.km ?? null;
  const planesCompletos = evaluar(cat, items, presupuesto, prioridad, dist);
  const planes = completo ? planesCompletos : evaluar(cat, items, presupuesto, 'precio', dist).filter((p) => p.tiendas.length === 1);

  const mejor = planes[0];
  const solas = planes.filter((p) => p.tiendas.length === 1).sort((a, b) =>
    (a.faltantes.length - b.faltantes.length) || (orden === 'asc' ? a.total - b.total : b.total - a.total));
  const combos = completo ? planes.filter((p) => p.tiendas.length > 1).slice(0, 3) : [];
  const vistaPlus = !completo ? planesCompletos[0] : null;

  // Referencia comparable: el ticket, o la MISMA lista (sin alternativas) en tu súper habitual.
  const habitual = (habitualLocal ?? perfil?.supermercados[0] ?? null) as TiendaId | null;
  const ref = (() => {
    if (totalTicket != null) return { tipo: 'ticket' as const, detalle: 'Tu ticket', total: totalTicket, plan: armarPlan(cat, pref.items, cat.tiendas.map((t) => t.id), null, 'precio') };
    if (!habitual || !cat.tiendas.some((t) => t.id === habitual)) return null;
    const plan = armarPlan(cat, pref.items, [habitual], presupuesto, completo ? prioridad : 'precio');
    return { tipo: 'super_habitual' as const, detalle: cat.tiendas.find((t) => t.id === habitual)!.nombre, total: plan.total, plan };
  })();

  if (!mejor) return null;
  const ahorro = ref ? ref.total - mejor.total : null;
  const clave = (p: Plan) => p.tiendas.join('+');

  const decidirAlternativa = async (id: string, acepta: boolean) => {
    if (!perfil || !props.uid) return;
    const ac = acepta ? [...new Set([...perfil.alternativas_aceptadas, id])] : perfil.alternativas_aceptadas.filter((x) => x !== id);
    const re = acepta ? perfil.alternativas_rechazadas.filter((x) => x !== id) : [...new Set([...perfil.alternativas_rechazadas, id])];
    props.setPerfil({ ...perfil, alternativas_aceptadas: ac, alternativas_rechazadas: re });
    await actualizarAlternativas(props.uid, ac, re).catch(() => undefined);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await guardarOptimizacion({
        origen: props.origen, items, presupuesto, prioridad: completo ? prioridad : 'precio',
        referencia_tipo: ref?.tipo ?? 'sin_referencia', referencia_detalle: ref?.detalle ?? null,
        total_referencia: ref?.total ?? null, total_optimizado: mejor.total,
        co2e_referencia: ref?.plan.huellaKg ?? null, co2e_optimizado: mejor.huellaKg ?? null, tiendas: mejor.tiendas,
        ...(completo ? { modo: 'plus' as const } : {}),
      }, idem);
      props.setEstado({ plan: r.plan, saldo: r.saldo, usadas_ciclo: r.usadas_ciclo, ciclo: r.ciclo, plan_desde: r.plan_desde });
      setGuardado(r.repetida ? 'Ya estaba guardada (no se cobró de nuevo).' : r.modo === 'plus' ? `Guardada. Te quedan ${r.saldo} optimizaciones este mes.` : 'Guardada en tu historial.');
    } catch (e) { setGuardado(e instanceof Error ? e.message : String(e)); }
    setGuardando(false);
  };

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
        {ahorro != null && ref && (
          <p className="mt-1 text-lg font-extrabold text-sun">
            {Math.abs(ahorro) < 0.5 ? `Igual que ${ref.tipo === 'ticket' ? 'tu ticket' : `comprar todo en ${ref.detalle}`}`
              : ahorro > 0 ? `Ahorro potencial: ${pesos(ahorro)} vs ${ref.tipo === 'ticket' ? 'tu ticket' : ref.detalle}`
              : `Cuesta ${pesos(-ahorro)} más que ${ref.tipo === 'ticket' ? 'tu ticket' : ref.detalle}`}
          </p>
        )}
        <p className="mt-1 text-xs text-sprout">{completo ? `Optimización completa (Plus) · prioridad ${prioridad}` : 'Comparación Gratis: precio más bajo por tienda'}</p>
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

      {pref.avisos.length > 0 && (
        <section className="card !p-4 text-sm">
          <p className="font-extrabold text-forest">Respetamos tus preferencias</p>
          <ul className="mt-1 space-y-1">{pref.avisos.map((a) => <li key={a.texto}>• {a.texto}</li>)}</ul>
        </section>
      )}

      {/* Lista habitual vs optimizada */}
      <section className="card">
        <p className="font-extrabold text-forest">Tu lista habitual vs optimizada</p>
        {!ref ? (
          <div className="mt-2">
            <p className="text-sm text-muted">¿Dónde compras normalmente? Lo usamos como referencia para medir tu ahorro.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {cat.tiendas.map((t) => <button key={t.id} onClick={() => setHabitualLocal(t.id)} className="rounded-full border border-mint bg-white px-3 py-1 font-bold text-forest">{t.nombre}</button>)}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <span />
              <span className="font-bold text-muted">{ref.tipo === 'ticket' ? 'Tu ticket' : `Todo en ${ref.detalle}`}</span>
              <span className="font-bold text-leaf">Optimizada</span>
              <span className="text-left font-bold">Costo</span>
              <span className="font-black">{pesos(ref.total)}</span>
              <span className="font-black text-forest">{pesos(mejor.total)}</span>
              <span className="text-left font-bold">CO₂e</span>
              <span>{ref.plan.huellaKg != null ? `${ref.plan.huellaKg} kg` : '—'}</span>
              <span className="text-forest">{mejor.huellaKg != null ? `${mejor.huellaKg} kg` : '—'}</span>
            </div>
            <p className="mt-2 text-sm">
              Diferencia: <b>{pesos(ref.total - mejor.total)}</b>
              {ref.plan.huellaKg != null && mejor.huellaKg != null && <> · <b>{(ref.plan.huellaKg - mejor.huellaKg).toFixed(1)} kg CO₂e</b></>}
            </p>
            <p className="mt-1 text-xs text-muted">
              Estimado con precios consultados en línea. Será <b>ahorro comprobado</b> cuando registres lo que pagaste en Mi valor.
              La huella es una reducción potencial (cantidad × factor), no emisiones evitadas comprobadas.
              {ref.tipo === 'ticket' && ' La huella del ticket se estima con los mismos productos.'}
            </p>
          </>
        )}
      </section>

      {disponibles.length > 0 && (
        <section className="card border-leaf bg-mint">
          <p className="font-extrabold text-forest">🌱 Alternativas equivalentes</p>
          <ul className="mt-2 space-y-3">
            {disponibles.map((a) => {
              const pDe = cat.productos.find((p) => p.id === a.de), pA = cat.productos.find((p) => p.id === a.a);
              const cant = pref.items.find((i) => i.productoId === a.de)?.cantidad ?? 0;
              const evita = pDe?.huella_kgco2e != null && pA?.huella_kgco2e != null ? Math.round(cant * (pDe.huella_kgco2e - pA.huella_kgco2e) * 10) / 10 : null;
              const acepto = aceptadas.includes(a.id);
              return (
                <li key={a.id} className="text-sm">
                  <p><b>{pDe?.nombre} → {pA?.nombre}</b>. {a.motivo}</p>
                  {evita != null && <p className="text-muted">≈ {evita} kg CO₂e menos ({pDe?.huella_kgco2e} vs {pA?.huella_kgco2e} kg CO₂e/kg, {pDe?.huella_fuente}).</p>}
                  {perfil && (
                    <div className="mt-1 flex gap-2">
                      <button onClick={() => decidirAlternativa(a.id, !acepto)} className={`rounded-full px-3 py-1 font-bold ${acepto ? 'bg-leaf text-white' : 'border border-leaf bg-white text-forest'}`}>{acepto ? '✓ Aceptada' : 'Aceptar'}</button>
                      {!acepto && <button onClick={() => decidirAlternativa(a.id, false)} className="rounded-full border border-mint bg-white px-3 py-1 font-bold text-muted">No me interesa</button>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {vistaPlus && vistaPlus.total < mejor.total - 0.5 && (
        <section className="card border-2 border-dashed border-leaf">
          <p className="text-sm font-bold uppercase tracking-wide text-leaf">Vista previa Plus</p>
          <p className="mt-1">Combinando <b>{etiquetaTiendas(cat, vistaPlus.tiendas)}</b> tu lista costaría <b>{pesos(vistaPlus.total)}</b> ({pesos(mejor.total - vistaPlus.total)} menos), calculado con los mismos precios.</p>
          <button className="mt-2 rounded-full bg-leaf px-4 py-2 font-bold text-white" onClick={props.onVerValor}>Conocer Plus</button>
        </section>
      )}

      {props.uid && (
        <section className="card">
          <button className="btn btn-primary" onClick={guardar} disabled={guardando || !!guardado}>
            {guardando ? 'Guardando…' : guardado ? 'Guardada ✓' : completo ? `Guardar optimización (usa 1 de ${estado?.saldo})` : 'Guardar en mi historial (gratis)'}
          </button>
          {guardado && <p className="mt-2 text-sm font-bold text-pine">{guardado} <button className="underline" onClick={props.onVerValor}>Ver Mi valor</button></p>}
        </section>
      )}

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
        Precios consultados en línea el 12 y 13-nov-2026 en walmart.com.mx, heb.com.mx (sucursal Gonzalitos) y costco.com.mx; en tienda pueden variar.
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

