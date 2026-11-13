'use client';
/** Resultados: plan recomendado, tiendas ordenadas por precio (mayor↔menor), combinaciones y detalle por producto. */
import { useMemo, useState } from 'react';
import { actualizarAlternativas, cambiarPlanDemo, guardarOptimizacion, type Estado } from '@/lib/cuenta';
import { mapsUrl, masCercana } from '@/lib/geo';
import { armarPlan, etiquetaTiendas, evaluar, evaluarAlternativas, recortarAPresupuesto, type Plan, type Recorte } from '@/lib/optimizar';
import { ALTERNATIVAS, alternativasPara, aplicarAlternativas, aplicarPreferencias, comprasPorMes, type Perfil } from '@/lib/perfil';
import { compararCubiertos, desglose, distribuirPresupuesto, siguienteTip, tipsPara, type Tip } from '@/lib/impacto';
import type { Catalogo, Item, Prioridad, Punto, TiendaId } from '@/lib/tipos';
import { InsigniaP, InsigniaS, nombreCalidad, pesos } from '../ui';

const UNIDAD = { pza: 'pzas', kg: 'kg', l: 'L' } as const;

export function Resultados(props: {
  cat: Catalogo; nombre: string; items: Item[]; presupuesto: number | null; prioridad: Prioridad; punto: Punto;
  totalTicket: number | null; recortes: Recorte[]; onReiniciar: () => void; onEditar: () => void;
  origen: 'lista' | 'ticket'; uid: string | null; perfil: Perfil | null; setPerfil: (p: Perfil) => void;
  estado: Estado | null; setEstado: (e: Estado) => void; onVerValor: () => void; precioAnalisis?: number | null;
  onAplicarAjuste?: (tiendas: TiendaId[]) => void; notaAjustes?: string[];
}) {
  const { nombre, presupuesto, prioridad, punto, totalTicket, recortes, perfil, estado } = props;
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [habitualLocal, setHabitualLocal] = useState<TiendaId | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [pagado, setPagado] = useState(false);
  const [idem] = useState(() => crypto.randomUUID());

  // Preferencias del perfil (súper, calidad, restricciones, marcas) y alternativas aceptadas.
  const pref = useMemo(() => aplicarPreferencias(props.cat, props.items, perfil), [props.cat, props.items, perfil]);
  const cat = pref.cat;
  const disponibles = alternativasPara(pref.items, perfil);
  // Algoritmo: sustitutos equivalentes que bajan CO2e; primero los que además bajan el costo.
  const evaluadas = evaluarAlternativas(pref.cat, pref.items, disponibles, pref.cat.tiendas.map((t) => t.id));
  const ganaGana = evaluadas.filter((e) => e.tipo === 'gana_gana');
  // Hasta 2 opciones por producto (la aceptada siempre visible).
  const mostrables = evaluadas.filter((e, _, arr) =>
    (perfil?.alternativas_aceptadas ?? []).includes(e.id) || arr.filter((x) => x.de === e.de && x.tipo === e.tipo).indexOf(e) < 2);
  const aceptadas = (perfil?.alternativas_aceptadas ?? []).filter((a) => disponibles.some((d) => d.id === a));
  const claveAceptadas = aceptadas.join();
  // Gratis = modelo básico (tienda más barata, sin alternativas). Plus con créditos = modelo avanzado.
  const completo = estado?.plan === 'plus' && estado.saldo > 0;
  const items = completo ? aplicarAlternativas(pref.items, claveAceptadas ? claveAceptadas.split(',') : []) : pref.items;
  const cercanas = useMemo(() => Object.fromEntries(cat.tiendas.map((t) => [t.id, masCercana(cat.sucursales, t.id, punto)])), [cat, punto]);
  const dist = (t: TiendaId) => cercanas[t]?.km ?? null;
  const planesCompletos = evaluar(cat, items, presupuesto, prioridad, dist);
  const planes = completo ? planesCompletos : evaluar(cat, items, presupuesto, 'precio', dist).filter((p) => p.tiendas.length === 1);

  const mejor = planes[0];
  const solas = planes.filter((p) => p.tiendas.length === 1).sort((a, b) =>
    (a.faltantes.length - b.faltantes.length) || (orden === 'asc' ? a.total - b.total : b.total - a.total));
  const combos = completo ? planes.filter((p) => p.tiendas.length > 1).slice(0, 3) : [];
  // Lo que el modelo avanzado (Plus) encuentra en ESTA lista con los mismos precios:
  // combinar tiendas + la mejor alternativa ganar-ganar por producto + prioridad y presupuesto.
  const mejoresGG = [...new Map(ganaGana.map((e) => [e.de, e] as const)).values()];
  const vistaPlus = !completo ? evaluar(cat, aplicarAlternativas(pref.items, mejoresGG.map((e) => e.id)), presupuesto, prioridad, dist)[0] ?? null : null;
  // Diferencia Gratis → Plus SOLO con productos cubiertos en ambos (nunca cuenta un hueco como ahorro).
  const compVista = vistaPlus && mejor
    ? compararCubiertos(desglose(cat, pref.items, mejor, vistaPlus, mejoresGG.map((e) => ({ de: e.de, a: e.a })), false)) : null;
  const extraMxn = compVista ? compVista.ahorro : 0;
  const extraKg = compVista?.refKg != null && compVista.optKg != null ? Math.round((compVista.refKg - compVista.optKg) * 10) / 10 : 0;
  const comprasMes = perfil ? comprasPorMes(perfil) : null;
  const activarPlus = async () => {
    if (!props.uid) { props.onVerValor(); return; }
    try { props.setEstado(await cambiarPlanDemo('plus')); } catch { props.onVerValor(); }
  };

  // Referencia comparable: el ticket, o la MISMA lista (sin alternativas) en tu súper habitual.
  const habitual = (habitualLocal ?? perfil?.supermercados[0] ?? null) as TiendaId | null;
  const ref = (() => {
    if (totalTicket != null) return { tipo: 'ticket' as const, detalle: 'Tu ticket', total: totalTicket, plan: armarPlan(cat, pref.items, cat.tiendas.map((t) => t.id), null, 'precio') };
    if (!habitual || !cat.tiendas.some((t) => t.id === habitual)) return null;
    const plan = armarPlan(cat, pref.items, [habitual], presupuesto, completo ? prioridad : 'precio');
    return { tipo: 'super_habitual' as const, detalle: cat.tiendas.find((t) => t.id === habitual)!.nombre, total: plan.total, plan };
  })();

  if (!mejor) return null;
  const clave = (p: Plan) => p.tiendas.join('+');

  // Comparación justa contra la referencia: mismos productos, misma cantidad, solo los cubiertos en ambas listas.
  const cambiosAceptados = ALTERNATIVAS.filter((a) => completo && aceptadas.includes(a.id)).map((a) => ({ de: a.de, a: a.a }));
  const filas = desglose(cat, pref.items, ref?.tipo === 'ticket' ? null : ref?.plan ?? null, mejor, cambiosAceptados, ref?.tipo === 'ticket');
  const comp = ref ? compararCubiertos(filas) : null;
  const ahorro = comp && comp.comparables > 0 ? comp.ahorro : null;

  // Plus vs Gratis con los MISMOS datos: el modelo básico sobre la lista original contra el resultado de Plus.
  const basico = evaluar(cat, pref.items, presupuesto, 'precio', dist).filter((p) => p.tiendas.length === 1)[0] ?? null;
  const vsBasico = completo && basico ? compararCubiertos(desglose(cat, pref.items, basico, mejor, cambiosAceptados, false)) : null;
  const dist$ = completo ? distribuirPresupuesto(cat, mejor, presupuesto) : null;

  // Presupuesto insuficiente: se advierte y se PROPONE un ajuste; solo se aplica si el usuario lo acepta.
  const noAlcanza = presupuesto != null && mejor.total > presupuesto + 0.005 && recortes.length === 0;
  const sugerido = noAlcanza ? recortarAPresupuesto(cat, items, mejor.tiendas, presupuesto) : null;

  const decidirAlternativa = async (id: string, acepta: boolean) => {
    if (!perfil || !props.uid) return;
    const ac = acepta ? [...new Set([...perfil.alternativas_aceptadas, id])] : perfil.alternativas_aceptadas.filter((x) => x !== id);
    const re = acepta ? perfil.alternativas_rechazadas.filter((x) => x !== id) : [...new Set([...perfil.alternativas_rechazadas, id])];
    props.setPerfil({ ...perfil, alternativas_aceptadas: ac, alternativas_rechazadas: re });
    await actualizarAlternativas(props.uid, ac, re).catch(() => undefined);
  };

  // En Gratis el detalle por producto (qué comprar y dónde) y guardar el historial se desbloquean pagando el análisis.
  const desbloqueado = completo || pagado;
  const precioAnalisis = props.precioAnalisis ?? 5;

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await guardarOptimizacion({
        origen: props.origen, items, presupuesto, prioridad: completo ? prioridad : 'precio',
        referencia_tipo: ref?.tipo ?? 'sin_referencia', referencia_detalle: ref?.detalle ?? null,
        // Solo productos cubiertos en ambas listas: un faltante nunca se guarda como ahorro.
        total_referencia: comp && comp.comparables > 0 ? comp.ref : null,
        total_optimizado: comp && comp.comparables > 0 ? comp.opt : mejor.total,
        co2e_referencia: comp?.refKg ?? null, co2e_optimizado: comp ? comp.optKg : mejor.huellaKg ?? null, tiendas: mejor.tiendas,
        detalle: filas, productos_excluidos: comp?.excluidos ?? [],
        ahorro_adicional_plus: vsBasico && vsBasico.comparables > 0 ? vsBasico.ahorro : null,
        ...(completo ? { modo: 'plus' as const } : {}),
      }, idem, !completo);
      props.setEstado({ plan: r.plan, saldo: r.saldo, usadas_ciclo: r.usadas_ciclo, ciclo: r.ciclo, plan_desde: r.plan_desde });
      if (!completo) setPagado(true);
      setGuardado(r.repetida ? 'Ya estaba guardada (no se cobró de nuevo).'
        : r.modo === 'plus' ? `Guardada. Te quedan ${r.saldo} optimizaciones este mes.`
        : `Análisis desbloqueado y guardado. Pago de ${pesos(precioAnalisis)} en modo demostración: no se cobró nada.`);
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
        {ahorro != null && ref && comp && (
          <p className="mt-1 text-lg font-extrabold text-sun">
            {Math.abs(ahorro) < 0.5 ? `Igual que ${ref.tipo === 'ticket' ? 'tu ticket' : `comprar todo en ${ref.detalle}`}`
              : ahorro > 0 ? `Ahorro potencial: ${pesos(ahorro)} vs ${ref.tipo === 'ticket' ? 'tu ticket' : ref.detalle}`
              : `Cuesta ${pesos(-ahorro)} más que ${ref.tipo === 'ticket' ? 'tu ticket' : ref.detalle}`}
            {comp.excluidos.length > 0 && <span className="block text-xs font-bold text-sprout">Comparando {comp.comparables} productos con precio en ambas listas</span>}
          </p>
        )}
        <p className="mt-1 text-xs text-sprout">{completo ? `Modelo avanzado (Plus) · prioridad ${prioridad}` : 'Modelo básico (Gratis): la tienda más barata para toda tu lista'}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {mejor.calidadProm != null && <span className="rounded-full bg-white/15 px-3 py-1">Calidad promedio: {nombreCalidad(mejor.calidadProm).toLowerCase()}</span>}
          {mejor.sustProm != null && <span className="rounded-full bg-white/15 px-3 py-1">Sustentabilidad S{mejor.sustProm.toFixed(1)}</span>}
          {mejor.huellaKg != null && <span className="rounded-full bg-white/15 px-3 py-1">≈ {mejor.huellaKg} kg CO₂e</span>}
        </div>
        {mejor.faltantes.length > 0 && <p className="mt-2 text-sun">Precio no disponible en línea: {mejor.faltantes.map((f) => f.nombre).join(', ')} (no se incluye en el total)</p>}
        <ul className="mt-3 space-y-1">
          {mejor.tiendas.map((t) => <Sucursal key={t} cat={cat} t={t} c={cercanas[t]} claro />)}
        </ul>
        <button className="mt-4 w-full rounded-2xl bg-white/15 py-3 font-extrabold" onClick={() => setAbierto(abierto === clave(mejor) ? null : clave(mejor))}>
          {abierto === clave(mejor) ? 'Ocultar productos' : 'Ver productos'}
        </button>
        {abierto === clave(mejor) && (desbloqueado ? <Detalle cat={cat} plan={mejor} oscuro /> : <Bloqueado precio={precioAnalisis} oscuro />)}
      </section>

      {noAlcanza && presupuesto != null && (
        <section className="card border-2 border-alert/40">
          <p className="font-extrabold text-alert">⚠️ Tu presupuesto no alcanza para tu lista completa</p>
          <p className="mt-1 text-sm">Lo más barato que encontramos para <b>toda</b> tu lista cuesta {pesos(mejor.total)}: te faltan <b>{pesos(mejor.total - presupuesto)}</b>. No quitamos nada por ti.</p>
          {sugerido && sugerido.recortes.length > 0 && (
            <>
              <p className="mt-2 text-sm font-bold text-forest">Si quieres caber en {pesos(presupuesto)}, esto es lo que tendrías que comprar de menos:</p>
              <ul className="mt-1 space-y-1 text-sm">
                {sugerido.recortes.map((r) => (
                  <li key={r.producto.id}>• {r.producto.nombre}: {+r.antes.toFixed(2)} → {r.despues > 0 ? `${+r.despues.toFixed(2)} ${UNIDAD[r.producto.unidad]}` : 'no comprarlo'}</li>
                ))}
              </ul>
              {props.onAplicarAjuste && (
                <button className="mt-2 rounded-full border border-alert bg-white px-4 py-2 text-sm font-bold text-alert" onClick={() => props.onAplicarAjuste?.(mejor.tiendas)}>
                  Aplicar este ajuste (compraré menos)
                </button>
              )}
              <p className="mt-1 text-xs text-muted">Comprar menos no es ahorro: si lo aplicas, la comparación usa la lista reducida en ambos lados.</p>
            </>
          )}
        </section>
      )}

      {recortes.length > 0 && (
        <section className="card">
          <p className="font-extrabold text-forest">Ajustaste tu lista a tu presupuesto</p>
          <ul className="mt-2 space-y-1">
            {recortes.map((r) => (
              <li key={r.producto.id}>
                {r.producto.nombre}: {+r.antes.toFixed(2)} → {r.despues > 0 ? `${+r.despues.toFixed(2)} ${UNIDAD[r.producto.unidad]}` : 'no se compra'}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">Todas las comparaciones usan esta misma lista ajustada; la diferencia por comprar menos no se cuenta como ahorro.</p>
        </section>
      )}

      {/* Plus: valor medible con los mismos datos */}
      {completo && vsBasico && vsBasico.comparables > 0 && (
        <section className="card border-2 border-leaf">
          <p className="text-sm font-black uppercase tracking-wide text-leaf">Lo que te dio Plus en esta compra</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
            <span />
            <span className="font-bold text-muted">Modelo básico</span>
            <span className="font-bold text-leaf">Plus</span>
            <span className="text-left font-bold">Costo</span><span>{pesos(vsBasico.ref)}</span><span className="font-black text-forest">{pesos(vsBasico.opt)}</span>
            <span className="text-left font-bold">CO₂e</span><span>{vsBasico.refKg != null ? `${vsBasico.refKg} kg` : '—'}</span><span className="text-forest">{vsBasico.optKg != null ? `${vsBasico.optKg} kg` : '—'}</span>
          </div>
          <p className="mt-2 text-sm">
            {vsBasico.ahorro >= 0.5 ? <>Ahorro adicional por Plus: <b className="text-leaf">{pesos(vsBasico.ahorro)}</b></> : <>Con esta lista Plus no encontró ahorro extra en pesos{vsBasico.ahorro < -0.5 ? ` (subió calidad o sustentabilidad por ${pesos(-vsBasico.ahorro)})` : ''}</>}
            {vsBasico.refKg != null && vsBasico.optKg != null && vsBasico.refKg - vsBasico.optKg > 0.05 && <> · <b className="text-leaf">−{(vsBasico.refKg - vsBasico.optKg).toFixed(1)} kg CO₂e</b></>}
          </p>
          <p className="mt-1 text-xs text-muted">Misma lista ({vsBasico.comparables} productos) y mismos precios: lo básico es la tienda más barata para todo; Plus combina tiendas{cambiosAceptados.length ? ' y aplica tus alternativas' : ''}.</p>
        </section>
      )}

      {completo && dist$ && (
        <section className="card">
          <p className="font-extrabold text-forest">Distribución de tu presupuesto</p>
          <ul className="mt-2 space-y-2">
            {dist$.categorias.map((c) => (
              <li key={c.categoria} title={`${c.categoria}: ${pesos(c.total)} (${c.pct} %)`}>
                <div className="flex justify-between text-sm"><span>{c.categoria}</span><span className="font-bold">{pesos(c.total)} · {c.pct} %</span></div>
                <div className="mt-1 h-2.5 rounded-r bg-mist" aria-hidden><div className="h-full rounded-r-[4px] bg-leaf" style={{ width: `${Math.max(2, c.pct)}%` }} /></div>
              </li>
            ))}
          </ul>
          {dist$.sobrante != null && dist$.sobrante >= 1 && (
            <p className="mt-2 rounded-2xl bg-mint p-3 text-sm text-forest">
              Te sobran <b>{pesos(dist$.sobrante)}</b> de tu presupuesto.
              {perfil?.problemas.includes('se_terminan') ? ' Como algunos productos se te terminan antes de tiempo, guárdalos para reponer a mitad de periodo en lugar de comprar de más hoy.' : ' Puedes guardarlos o subir calidad con la prioridad «Calidad».'}
            </p>
          )}
          {dist$.falta != null && <p className="mt-2 text-sm font-bold text-alert">Te faltan {pesos(dist$.falta)} para la lista completa.</p>}
        </section>
      )}

      {completo && (props.notaAjustes?.length ?? 0) > 0 && (
        <section className="card">
          <p className="font-extrabold text-forest">Prevención de desperdicio</p>
          <p className="text-sm text-muted">Ajustamos cantidades con tu revisión del periodo anterior:</p>
          <ul className="mt-1 space-y-1 text-sm">{props.notaAjustes!.map((n) => <li key={n}>• {n}</li>)}</ul>
        </section>
      )}

      {vistaPlus && extraMxn >= 1 && (
        <section className="rounded-3xl border-2 border-leaf bg-white p-5">
          <p className="text-sm font-black uppercase tracking-wide text-leaf">¿Quieres ahorrar más?</p>
          <p className="mt-1 text-2xl font-black leading-tight text-forest">Estás dejando {pesos(extraMxn)} sobre la mesa en esta compra</p>
          {extraKg > 0 && <p className="mt-1 font-bold text-pine">y {extraKg.toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg de CO₂e que podrías evitar.</p>}
          <p className="mt-3 text-sm font-bold text-forest">El modelo avanzado de Plus hace lo que el básico no:</p>
          <ul className="mt-1 space-y-1 text-sm">
            {vistaPlus.tiendas.length > 1 && <li>✓ Combina <b>{etiquetaTiendas(cat, vistaPlus.tiendas)}</b>: cada producto donde está más barato.</li>}
            {mejoresGG.map((e) => (
              <li key={e.id}>🔒 {cat.productos.find((p) => p.id === e.de)?.nombre} → <b>alternativa ganar-ganar</b>: ahorra {pesos(e.ahorro)} y {e.reduccion} kg CO₂e</li>
            ))}
            <li>✓ Sube calidad o sustentabilidad con lo que te sobre del presupuesto.</li>
            <li>✓ Aprende de tus revisiones para que no te sobre ni te falte.</li>
          </ul>
          {comprasMes != null && comprasMes > 1 && (
            <p className="mt-2 rounded-2xl bg-mint p-3 text-sm text-forest">
              Si repites esta compra {comprasMes} veces al mes, son ≈ <b>{pesos(extraMxn * comprasMes)}</b> al mes contra {pesos(99)} de Plus (estimado).
            </p>
          )}
          <button className="btn btn-primary mt-4" onClick={activarPlus}>Activar Plus y ver mi ahorro completo</button>
          <p className="mt-2 text-xs text-muted">Calculado con los mismos precios reales de tu lista. Modo demostración: sin cobro.</p>
        </section>
      )}

      <TipCO2 cat={cat} items={pref.items} />

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
              <span className="font-black">{comp ? pesos(comp.ref) : '—'}</span>
              <span className="font-black text-forest">{comp ? pesos(comp.opt) : '—'}</span>
              <span className="text-left font-bold">CO₂e</span>
              <span>{comp?.refKg != null ? `${comp.refKg} kg` : '—'}</span>
              <span className="text-forest">{comp?.optKg != null ? `${comp.optKg} kg` : '—'}</span>
            </div>
            <p className="mt-2 text-sm">
              Diferencia: <b>{comp ? pesos(comp.ahorro) : '—'}</b>
              {comp?.refKg != null && comp.optKg != null && <> · <b>{(comp.refKg - comp.optKg).toFixed(1)} kg CO₂e</b></>}
              {comp && comp.excluidos.length > 0 && <span className="block text-xs text-muted">No se comparan (sin precio en una de las dos listas): {comp.excluidos.join(', ')}.</span>}
            </p>
            {completo && aceptadas.length > 0 && (
              <p className="mt-1 text-sm font-bold text-pine">
                La optimizada incluye {aceptadas.length === 1 ? 'la alternativa' : 'las alternativas'} que aceptaste
                ({aceptadas.map((a) => a.replace('_', ' → ')).join(', ')}); la referencia es tu lista original.
              </p>
            )}
            <p className="mt-1 text-xs text-muted">
              Estimado con precios consultados en línea. Será <b>ahorro comprobado</b> cuando registres lo que pagaste en Mi valor.
              La huella es una reducción potencial (cantidad × factor), no emisiones evitadas comprobadas.
              {ref.tipo === 'ticket' && ' La huella del ticket se estima con los mismos productos.'}
            </p>
          </>
        )}
      </section>

      {completo && evaluadas.length > 0 && (
        <section className="card border-leaf bg-mint">
          <p className="font-extrabold text-forest">🌱 Alternativas equivalentes</p>
          {ganaGana.length > 0 && <p className="mt-1 text-sm font-bold text-pine">Encontramos {ganaGana.length} {ganaGana.length === 1 ? 'cambio que baja' : 'cambios que bajan'} tu costo y tus emisiones a la vez{mostrables.length < evaluadas.length ? '; te mostramos los mejores por producto' : ''}.</p>}
          {([['gana_gana', '💚 Ahorras y reduces CO₂e'], ['menor_huella', '🌍 Reducen CO₂e (cuestan más)']] as const).map(([tipo, titulo]) => {
            const lista = mostrables.filter((e) => e.tipo === tipo);
            if (!lista.length) return null;
            return (
              <div key={tipo} className="mt-3">
                <p className="text-sm font-extrabold text-forest">{titulo}</p>
                <ul className="mt-1 space-y-3">
                  {lista.map((e) => {
                    const pDe = cat.productos.find((p) => p.id === e.de), pA = cat.productos.find((p) => p.id === e.a);
                    const acepto = aceptadas.includes(e.id);
                    return (
                      <li key={e.id} className="text-sm">
                        <p><b>{pDe?.nombre} → {pA?.nombre}</b>. {e.motivo}</p>
                        <p className="mt-0.5">
                          {e.ahorro >= 0.5 ? <b className="text-leaf">Ahorras {pesos(e.ahorro)}</b> : <b>Cuesta {pesos(-e.ahorro)} más</b>}
                          {' · '}<b className="text-leaf">−{e.reduccion} kg CO₂e</b>
                          <span className="text-muted"> ({pesos(e.costoDe)} → {pesos(e.costoA)}; {e.kgDe} → {e.kgA} kg)</span>
                        </p>
                        <p className="text-xs text-muted">Precio más bajo disponible en tus tiendas; huella: {pDe?.huella_kgco2e} vs {pA?.huella_kgco2e} kg CO₂e por kg ({pDe?.huella_fuente}).</p>
                        {perfil && (
                          <div className="mt-1 flex gap-2">
                            <button onClick={() => decidirAlternativa(e.id, !acepto)} className={`rounded-full px-3 py-1 font-bold ${acepto ? 'bg-leaf text-white' : 'border border-leaf bg-white text-forest'}`}>{acepto ? '✓ Aceptada' : 'Aceptar'}</button>
                            {!acepto && <button onClick={() => decidirAlternativa(e.id, false)} className="rounded-full border border-mint bg-white px-3 py-1 font-bold text-muted">No me interesa</button>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}


      {props.uid && (
        <section className="card">
          {!completo && !guardado && (
            <p className="mb-3 text-sm text-muted">
              En Gratis ves los totales por tienda. Para ver <b>qué producto comprar en cada tienda</b> y guardar este análisis en tu historial,
              desbloquéalo por {pesos(precioAnalisis)} o usa Plus.
            </p>
          )}
          <button className="btn btn-primary" onClick={guardar} disabled={guardando || !!guardado}>
            {guardando ? 'Procesando…' : guardado ? (completo ? 'Guardada ✓' : 'Desbloqueado ✓')
              : completo ? `Guardar optimización (usa 1 de ${estado?.saldo})` : `Desbloquear y guardar · ${pesos(precioAnalisis)} (demo, sin cobro)`}
          </button>
          {!completo && !guardado && <button className="btn btn-light mt-3" onClick={props.onVerValor}>Conocer Plus</button>}
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
          {solas.map((p) => <FilaPlan key={clave(p)} cat={cat} plan={p} presupuesto={presupuesto} desbloqueado={desbloqueado} precio={precioAnalisis} abierto={abierto === clave(p)} onToggle={() => setAbierto(abierto === clave(p) ? null : clave(p))} cerca={cercanas[p.tiendas[0]]} />)}
        </ul>
      </section>

      {combos.length > 0 && (
        <section>
          <h2 className="mb-2 text-xl font-black text-forest">Combinando 2 tiendas</h2>
          <ul className="space-y-2">
            {combos.map((p) => <FilaPlan key={clave(p)} cat={cat} plan={p} presupuesto={presupuesto} desbloqueado={desbloqueado} precio={precioAnalisis} abierto={abierto === clave(p)} onToggle={() => setAbierto(abierto === clave(p) ? null : clave(p))} />)}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted">
        Precios consultados en línea el 12 y 13-nov-2026 en walmart.com.mx, heb.com.mx (sucursal Gonzalitos) y costco.com.mx; en tienda pueden variar.
        Costco requiere membresía. La calidad (premium, superior, normal, estándar) y la sustentabilidad S1–S4 son clasificación de GreenPath según lo que dice cada producto, no pruebas de laboratorio.
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

function FilaPlan({ cat, plan, presupuesto, abierto, onToggle, cerca, desbloqueado, precio }: {
  cat: Catalogo; plan: Plan; presupuesto: number | null; abierto: boolean; onToggle: () => void; cerca?: ReturnType<typeof masCercana>;
  desbloqueado: boolean; precio: number;
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
          {plan.faltantes.length > 0 && <p className="mt-2 text-sm text-alert">Precio no disponible en línea: {plan.faltantes.map((f) => f.nombre).join(', ')}</p>}
          {desbloqueado ? <Detalle cat={cat} plan={plan} /> : <Bloqueado precio={precio} />}
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


/** Candado del detalle por producto (Gratis sin pagar el análisis). */
function Bloqueado({ precio, oscuro }: { precio: number; oscuro?: boolean }) {
  return (
    <div className={`mt-3 rounded-2xl p-4 text-center ${oscuro ? 'bg-white text-ink' : 'bg-mist'}`}>
      <p className="text-2xl" aria-hidden>🔒</p>
      <p className="font-extrabold text-forest">Detalle por producto bloqueado</p>
      <p className="text-sm text-muted">Qué marca y presentación comprar en cada tienda. Desbloquéalo por {pesos(precio)} (demo) o con Plus.</p>
    </div>
  );
}

/** Un tip distinto cada vez que se generan resultados (no se repite hasta ver todos; se recuerda en el teléfono). */
const LLAVE_TIPS = 'greenpath.tips.vistos';
function TipCO2({ cat, items }: { cat: Catalogo; items: Item[] }) {
  const pool = tipsPara(cat, items);
  const [tip, setTip] = useState<Tip | null>(() => {
    if (typeof window === 'undefined') return null;
    let vistos: string[] = [];
    try { vistos = JSON.parse(localStorage.getItem(LLAVE_TIPS) ?? '[]'); } catch { /* sin almacenamiento */ }
    const r = siguienteTip(pool, vistos);
    try { localStorage.setItem(LLAVE_TIPS, JSON.stringify(r.vistos)); } catch { /* sin almacenamiento */ }
    return r.tip;
  });
  const otro = () => {
    let vistos: string[] = [];
    try { vistos = JSON.parse(localStorage.getItem(LLAVE_TIPS) ?? '[]'); } catch { /* sin almacenamiento */ }
    const r = siguienteTip(pool, vistos);
    try { localStorage.setItem(LLAVE_TIPS, JSON.stringify(r.vistos)); } catch { /* sin almacenamiento */ }
    setTip(r.tip);
  };
  if (!tip) return null;
  return (
    <section className="card border-leaf">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>💡</span>
        <div className="flex-1">
          <p className="font-extrabold text-forest">Tip para reducir tu CO₂ en alimentos</p>
          <p className="mt-1">{tip.texto}</p>
          <p className="mt-1 text-xs text-muted">Fuente: {tip.fuente}</p>
        </div>
      </div>
      <button onClick={otro} className="mt-2 rounded-full border border-mint bg-white px-3 py-1 text-sm font-bold text-forest">Otro tip</button>
    </section>
  );
}
