'use client';
/**
 * Revisión del periodo, preguntada al volver a la app (si tu última despensa guardada no tiene revisión).
 * Tres preguntas rápidas; las respuestas ajustan la siguiente despensa (en Plus) y alimentan "Mi valor".
 */
import { useState } from 'react';
import { guardarRevision, type Optimizacion } from '@/lib/cuenta';
import type { Revision } from '@/lib/perfil';
import type { Catalogo } from '@/lib/tipos';

const PREGUNTAS = [
  ['agotados', '¿Qué productos se terminaron antes de tiempo?'],
  ['sobrantes', '¿Qué alimentos te sobraron?'],
  ['desperdiciados', '¿Qué productos se desperdiciaron?'],
] as const;

export function RevisionRapida({ uid, cat, opt, plus, onListo }: {
  uid: string; cat: Catalogo; opt: Optimizacion; plus: boolean; onListo: (r: Revision | null, armar: boolean) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [rv, setRv] = useState<Revision>({ agotados: [], desperdiciados: [], sobrantes: [] });
  const [costo, setCosto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardada, setGuardada] = useState(false);
  const nombre = (id: string) => cat.productos.find((p) => p.id === id)?.nombre ?? id;
  const fecha = new Date(opt.creada_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  const alternar = (k: keyof Revision, id: string) => setRv({ ...rv, [k]: rv[k].includes(id) ? rv[k].filter((x) => x !== id) : [...rv[k], id] });

  const guardar = async () => {
    try { await guardarRevision(uid, opt.id, rv, Number(costo) > 0 ? Number(costo) : null); setGuardada(true); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  if (guardada) {
    return (
      <section className="card border-leaf">
        <p className="font-extrabold text-forest">✓ Gracias, guardamos tu revisión</p>
        <p className="mt-1 text-sm text-muted">{plus ? 'Con esto ajustamos las cantidades de tu siguiente despensa.' : 'Con Plus ajustaríamos tus cantidades automáticamente con estas respuestas.'}</p>
        <button className="btn btn-primary mt-3" onClick={() => onListo(rv, true)}>{plus ? 'Armar mi siguiente despensa ajustada' : 'Repetir mi lista anterior'}</button>
      </section>
    );
  }

  return (
    <section className="card border-2 border-leaf">
      <p className="font-extrabold text-forest">¿Cómo te fue con tu despensa del {fecha}?</p>
      <p className="text-sm text-muted">3 preguntas rápidas para que tu siguiente compra no se quede corta ni te sobre.</p>
      {!abierta ? (
        <div className="mt-3 flex gap-2">
          <button className="rounded-full bg-leaf px-4 py-2 font-bold text-white" onClick={() => setAbierta(true)}>Responder (30 s)</button>
          <button className="rounded-full border border-mint bg-white px-4 py-2 font-bold text-muted" onClick={() => onListo(null, false)}>Ahora no</button>
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          {PREGUNTAS.map(([k, q]) => (
            <div key={k}>
              <p className="font-bold text-forest">{q}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {opt.items.map((i) => (
                  <button key={i.productoId} onClick={() => alternar(k, i.productoId)} aria-pressed={rv[k].includes(i.productoId)}
                    className={`rounded-full border px-2 py-1 ${rv[k].includes(i.productoId) ? 'border-leaf bg-mint font-bold' : 'border-mint bg-white'}`}>{nombre(i.productoId)}</button>
                ))}
              </div>
            </div>
          ))}
          <label className="flex items-center gap-2">¿Cuánto dinero calculas que se tiró?
            <input inputMode="decimal" className="w-24 rounded-xl border border-mint px-2 py-1" value={costo} onChange={(e) => setCosto(e.target.value.replace(/[^\d.]/g, ''))} placeholder="$0" />
          </label>
          {error && <p className="font-bold text-alert">{error}</p>}
          <button className="btn btn-primary" onClick={guardar}>Guardar revisión</button>
        </div>
      )}
    </section>
  );
}
