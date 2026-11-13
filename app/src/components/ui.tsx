/** Piezas visuales compartidas. */
import type { ReactNode } from 'react';

export const pesos = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export function Encabezado({ paso, total, onAtras }: { paso?: number; total?: number; onAtras?: () => void }) {
  return (
    <header className="flex items-center gap-3 py-4">
      {onAtras ? (
        <button onClick={onAtras} className="rounded-full bg-white px-3 py-1 font-bold text-forest border border-mint" aria-label="Atrás">←</button>
      ) : <span className="text-2xl" aria-hidden>🌿</span>}
      <span className="text-xl font-black text-forest">GreenPath</span>
      {paso && total ? (
        <div className="ml-auto h-3 w-28 overflow-hidden rounded-full bg-mint" aria-label={`Paso ${paso} de ${total}`}>
          <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${(paso / total) * 100}%` }} />
        </div>
      ) : null}
    </header>
  );
}

export function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-3xl font-black leading-tight text-forest">{children}</h1>
      {sub && <p className="mt-2 text-muted">{sub}</p>}
    </div>
  );
}

const NIVEL_P = ['', 'Premium', 'Superior', 'Estándar', 'Económica'];
const NIVEL_S = ['', 'Alta', 'Buena', 'Convencional', 'Alto impacto'];
const COLOR_S = ['', 'bg-leaf text-white', 'bg-sprout text-forest', 'bg-mint text-muted', 'bg-alert/15 text-alert'];

export function InsigniaP({ n, motivo }: { n: number; motivo?: string }) {
  return <span title={motivo} className="rounded-full bg-sun/30 px-2 py-0.5 text-xs font-extrabold text-forest">P{n} {NIVEL_P[n]}</span>;
}
export function InsigniaS({ n, motivo }: { n: number; motivo?: string }) {
  return <span title={motivo} className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${COLOR_S[n]}`}>S{n} {NIVEL_S[n]}</span>;
}

export function Opcion({ icono, titulo, sub, onClick, activo }: { icono: string; titulo: string; sub?: string; onClick: () => void; activo?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left transition active:scale-[0.99] ${activo ? 'border-leaf bg-mint' : 'border-mint bg-white'}`}>
      <span className="text-4xl" aria-hidden>{icono}</span>
      <span>
        <span className="block text-lg font-extrabold text-forest">{titulo}</span>
        {sub && <span className="block text-sm text-muted">{sub}</span>}
      </span>
    </button>
  );
}
