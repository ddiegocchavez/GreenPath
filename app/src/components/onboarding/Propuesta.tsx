'use client';
/**
 * Diagnóstico + plan recomendado entre 4 modalidades (Gratis, Individual, Flex, Plus).
 * El ahorro adicional se calcula con TU lista habitual y precios reales (modelo avanzado vs básico);
 * si no hay datos o no hay beneficio neto, se recomienda Gratis. Sin urgencia artificial ni ahorros prometidos.
 */
import type { Plan, Suscripcion } from '@/lib/cuenta';
import { diagnosticar, recomendarPlan, type Perfil, type PlanConfig, type PlanId } from '@/lib/perfil';
import type { Catalogo } from '@/lib/tipos';
import { extraAvanzado } from '@/lib/valor';
import { pesos, Titulo } from '../ui';

const QUE_INCLUYE: Record<PlanId, string> = {
  gratis: 'Diagnóstico y comparación básica: la tienda más barata para toda tu lista, precios reales y huella estimada.',
  individual: 'Un análisis completo cuando lo necesites: combina tiendas, alternativas ganar-ganar, presupuesto y detalle por producto.',
  flex: 'Dos análisis completos al mes, historial y ajuste de cantidades con tu revisión del periodo.',
  plus: 'Cuatro análisis completos al mes, historial, ajuste de cantidades, distribución del presupuesto y dashboard.',
};
const NOMBRE: Record<string, string> = {
  gratis: 'Gratis', individual: 'Individual', flex: 'Flex', plus: 'Plus', eventos: 'Análisis de evento', negocios: 'GreenPath Negocios',
};

export function Propuesta({ perfil, planes, cat, onElegir }: {
  perfil: Perfil; planes: Plan[]; cat: Catalogo; onElegir: (plan: Suscripcion) => void;
}) {
  const d = diagnosticar(perfil);
  const { extra, alternativas } = extraAvanzado(cat, perfil.lista_habitual ?? [], perfil);
  const r = recomendarPlan(perfil, planes as PlanConfig[], extra);
  const especial = r.plan === 'eventos' || r.plan === 'negocios';
  const precio = (id: PlanId) => planes.find((p) => p.id === id)?.precio_mxn ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-4 pb-8">
      <Titulo>{perfil.nombre}, este es tu diagnóstico</Titulo>

      <section className="rounded-3xl bg-forest p-5 text-white">
        <p className="text-lg font-bold">{d.resumen}</p>
        {d.problemaPrincipal && <p className="mt-2 text-sprout">Tu principal preocupación: <b className="text-white">{d.problemaPrincipal.toLowerCase()}</b>.</p>}
      </section>

      {d.oportunidades.length > 0 && (
        <section className="card">
          <p className="font-extrabold text-forest">Qué puede hacer GreenPath por ti</p>
          <ul className="mt-2 space-y-2">{d.oportunidades.map((o) => <li key={o} className="flex gap-2"><span aria-hidden>🌱</span><span>{o}</span></li>)}</ul>
        </section>
      )}

      {!especial && (
        <section className="card">
          <p className="font-extrabold text-forest">Lo que calculamos con tu lista habitual</p>
          {extra && extra.comparables > 0 ? (
            <p className="mt-1 text-sm">
              El análisis completo ahorra <b>{pesos(extra.mxn)}</b> más por compra que el básico
              {extra.kg != null && extra.kg > 0 && <> y <b>{extra.kg} kg CO₂e</b> menos</>}
              {alternativas > 0 && <> ({alternativas} {alternativas === 1 ? 'alternativa ganar-ganar' : 'alternativas ganar-ganar'})</>}.
              <span className="block text-xs text-muted">{extra.comparables} productos, mismos precios reales; solo productos con precio en ambos análisis.</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Sin tu lista habitual no podemos calcular el ahorro con precios reales. Puedes agregarla desde «Editar mis respuestas».</p>
          )}
        </section>
      )}

      <section className="card border-2 border-leaf">
        <p className="text-sm font-bold uppercase tracking-wide text-leaf">Te recomendamos</p>
        <p className="text-2xl font-black text-forest">GreenPath {NOMBRE[r.plan]}</p>
        <ul className="mt-2 space-y-1 text-sm">{r.razones.map((x) => <li key={x}>• {x}</li>)}</ul>
        {especial && <p className="mt-2 rounded-2xl bg-mint p-3 text-sm font-bold text-forest">Este módulo llega pronto a la versión web. Mientras, puedes usar GreenPath para tu despensa.</p>}
      </section>

      {!especial && (
        <section className="card overflow-x-auto">
          <p className="mb-2 font-extrabold text-forest">Compara los planes con tus datos (por mes)</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-semibold">Plan</th><th className="text-right font-semibold">Costo</th><th className="text-right font-semibold">Análisis</th>
                <th className="text-right font-semibold">Ahorro extra</th><th className="text-right font-semibold">Neto</th><th className="text-right font-semibold">CO₂e −</th>
              </tr>
            </thead>
            <tbody>
              <tr className={`border-t border-mint ${r.plan === 'gratis' ? 'bg-mint font-bold' : ''}`}>
                <td className="py-1">Gratis</td><td className="text-right">{pesos(0)}</td><td className="text-right">básico</td><td className="text-right">—</td><td className="text-right">{pesos(0)}</td><td className="text-right">—</td>
              </tr>
              {r.opciones.map((o) => (
                <tr key={o.id} className={`border-t border-mint ${r.plan === o.id ? 'bg-mint font-bold' : ''} ${o.aplica ? '' : 'text-muted'}`} title={o.motivo}>
                  <td className="py-1">{NOMBRE[o.id]}{o.id === 'individual' ? ` (${pesos(precio('individual'))} c/u)` : ''}</td>
                  <td className="text-right">{pesos(o.costoMes)}</td>
                  <td className="text-right">{o.analisisMes}</td>
                  <td className="text-right">{o.ahorroExtraMes != null ? pesos(o.ahorroExtraMes) : '—'}</td>
                  <td className={`text-right ${o.beneficioNeto != null && o.beneficioNeto < 0 ? 'text-alert' : ''}`}>{o.beneficioNeto != null ? pesos(o.beneficioNeto) : '—'}</td>
                  <td className="text-right">{o.co2Mes != null ? `${o.co2Mes} kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">
            Estimado: supone que tus compras se parecen a tu lista habitual. Neto = ahorro adicional − costo. «—» = sin datos suficientes; no lo inventamos.
            {r.opciones.some((o) => !o.aplica) && ' Compras una vez al mes: no te recomendamos suscripciones.'}
          </p>
          <ul className="mt-3 space-y-1 text-xs">
            {(['gratis', 'individual', 'flex', 'plus'] as PlanId[]).map((id) => <li key={id}><b>{NOMBRE[id]}:</b> {QUE_INCLUYE[id]}</li>)}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        <button className={`btn ${r.plan === 'gratis' || r.plan === 'individual' || especial ? 'btn-primary' : 'btn-light'}`} onClick={() => onElegir('gratis')}>
          {r.plan === 'individual' ? 'Continuar sin suscripción (pagas Individual cuando lo uses)' : 'Continuar gratis'}
        </button>
        {!especial && (['flex', 'plus'] as const).map((id) => (
          <button key={id} className={`btn ${r.plan === id ? 'btn-primary' : 'btn-light'}`} onClick={() => onElegir(id)}>
            Probar {NOMBRE[id]} · {pesos(precio(id))}/mes (demo, sin cobro)
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted">Modo demostración: no se realiza ningún cobro ni se piden datos de pago. Cancela cuando quieras sin perder tu historial.</p>
    </div>
  );
}
