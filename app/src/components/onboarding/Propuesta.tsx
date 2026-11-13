'use client';
/**
 * Diagnóstico y elección manual de plan, sin recomendación automática ni comparación mensual.
 * El ahorro adicional del diagnóstico usa la lista habitual y precios reales.
 */
import type { Plan, Suscripcion } from '@/lib/cuenta';
import { diagnosticar, type Perfil, type PlanId } from '@/lib/perfil';
import type { Catalogo } from '@/lib/tipos';
import { extraAvanzado } from '@/lib/valor';
import { pesos, Titulo } from '../ui';

const NOMBRE: Record<string, string> = {
  gratis: 'Gratis', individual: 'Individual', flex: 'Flex', plus: 'Plus', eventos: 'Análisis de evento', negocios: 'GreenPath Negocios',
};

export function Propuesta({ perfil, planes, cat, onElegir }: {
  perfil: Perfil; planes: Plan[]; cat: Catalogo; onElegir: (plan: Suscripcion) => void;
}) {
  const d = diagnosticar(perfil);
  const { extra, alternativas } = extraAvanzado(cat, perfil.lista_habitual ?? [], perfil);
  const especial = perfil.uso === 'evento' || perfil.uso === 'negocio';
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

      {especial && <p className="rounded-2xl bg-mint p-3 text-sm text-forest">Este módulo llega pronto a la versión web. Mientras, puedes usar GreenPath para tu despensa.</p>}

      <div className="space-y-3">
        <p className="font-semibold text-forest">Elige cómo continuar</p>
        <button className="btn btn-light" onClick={() => onElegir('gratis')}>
          Continuar gratis
        </button>
        {!especial && (['flex', 'plus'] as const).map((id) => (
          <button key={id} className="btn btn-light" onClick={() => onElegir(id)}>
            Probar {NOMBRE[id]} · {pesos(precio(id))}/mes (demo, sin cobro)
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted">Modo demostración: no se realiza ningún cobro ni se piden datos de pago. Cancela cuando quieras sin perder tu historial.</p>
    </div>
  );
}
