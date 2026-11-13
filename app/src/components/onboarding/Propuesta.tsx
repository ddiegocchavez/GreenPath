'use client';
/** Diagnóstico + plan recomendado + Gratis vs Plus. Sin urgencia artificial ni ahorros prometidos. */
import type { Plan } from '@/lib/cuenta';
import { diagnosticar, recomendarPlan, type Perfil } from '@/lib/perfil';
import { pesos, Titulo } from '../ui';

const GRATIS = [
  'Tu perfil de consumo y diagnóstico',
  'Comparar tu lista por tienda (Walmart, H-E-B, Costco) con precios reales',
  'Huella de CO₂e estimada con fuente científica',
  'Leer tickets y guardar tu historial básico',
];
const PLUS = [
  'Optimización completa: combina tiendas y respeta tu presupuesto',
  'Sube calidad o sustentabilidad donde alcance tu dinero',
  'Ajusta cantidades con tu revisión de fin de periodo',
  'Lista habitual vs optimizada, en pesos y CO₂e',
  'Seguimiento de ahorro potencial y comprobado',
];
const NOMBRE_PLAN = { plus: 'GreenPath Plus', gratis: 'GreenPath Gratis', analisis_individual: 'Análisis individual', eventos: 'Análisis de evento', negocios: 'GreenPath Negocios' };

export function Propuesta({ perfil, planes, onGratis, onPlus }: {
  perfil: Perfil; planes: Plan[]; onGratis: () => void; onPlus: () => void;
}) {
  const plus = planes.find((p) => p.id === 'plus');
  const d = diagnosticar(perfil);
  const r = recomendarPlan(perfil, plus?.precio_mxn ?? 99, plus?.optimizaciones_incluidas ?? 4);
  const especial = r.plan === 'eventos' || r.plan === 'negocios';

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

      <section className="card">
        <p className="font-extrabold text-forest">Para calcular tu ahorro necesitamos</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{d.datosFaltantes.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className="mt-2 text-xs text-muted">Todavía no te mostramos montos de ahorro: los calculamos solo con tus compras y precios reales.</p>
      </section>

      <section className="card border-2 border-leaf">
        <p className="text-sm font-bold uppercase tracking-wide text-leaf">Te recomendamos</p>
        <p className="text-2xl font-black text-forest">{NOMBRE_PLAN[r.plan]}</p>
        <ul className="mt-2 space-y-1 text-sm">{r.razones.map((x) => <li key={x}>• {x}</li>)}</ul>
        {especial && <p className="mt-2 rounded-2xl bg-mint p-3 text-sm font-bold text-forest">Este módulo llega pronto a la versión web. Mientras, puedes usar GreenPath para tu despensa.</p>}
      </section>

      {!especial && (
        <div className="grid grid-cols-1 gap-3">
          <section className={`card ${r.plan !== 'plus' ? 'border-2 border-leaf' : ''}`}>
            <div className="flex items-baseline justify-between"><p className="text-xl font-black text-forest">Gratis</p><p className="font-black text-forest">$0</p></div>
            <ul className="mt-2 space-y-1 text-sm">{GRATIS.map((x) => <li key={x}>✓ {x}</li>)}</ul>
          </section>
          <section className={`card ${r.plan === 'plus' ? 'border-2 border-leaf' : ''}`}>
            <div className="flex items-baseline justify-between">
              <p className="text-xl font-black text-forest">Plus</p>
              <p className="font-black text-forest">{pesos(plus?.precio_mxn ?? 99)}<span className="text-sm font-bold text-muted">/mes</span></p>
            </div>
            <p className="text-sm font-bold text-leaf">{plus?.optimizaciones_incluidas ?? 4} optimizaciones completas al mes · todo lo de Gratis, más:</p>
            <ul className="mt-2 space-y-1 text-sm">{PLUS.map((x) => <li key={x}>✓ {x}</li>)}</ul>
            <p className="mt-2 text-xs text-muted">
              Si una optimización Plus estima un ahorro adicional menor a {pesos(plus?.umbral_compensacion_mxn ?? 25)}, te devolvemos ese crédito.
              Cancela cuando quieras sin perder tu historial.
            </p>
          </section>
        </div>
      )}

      <div className="space-y-3">
        <button className={`btn ${r.plan === 'plus' ? 'btn-light' : 'btn-primary'}`} onClick={onGratis}>Continuar gratis</button>
        {!especial && <button className={`btn ${r.plan === 'plus' ? 'btn-primary' : 'btn-light'}`} onClick={onPlus}>Probar Plus (demostración, sin cobro)</button>}
      </div>
      <p className="text-center text-xs text-muted">Modo demostración: no se realiza ningún cobro ni se piden datos de pago.</p>
    </div>
  );
}
