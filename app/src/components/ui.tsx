/** Piezas visuales compartidas. */
'use client';
import { useState, type ReactNode } from 'react';

export const pesos = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export function Encabezado({ paso, total, onAtras, onMiValor, plan, onCerrarSesion }: {
  paso?: number; total?: number; onAtras?: () => void; onMiValor?: () => void; plan?: 'gratis' | 'plus'; onCerrarSesion?: () => void;
}) {
  return (
    <>
    {onCerrarSesion && <CerrarSesion onConfirmar={onCerrarSesion} />}
    <header className="flex items-center gap-3 py-4">
      {onAtras ? (
        <button onClick={onAtras} className="rounded-full bg-white px-3 py-1 font-bold text-forest border border-mint" aria-label="Atrás">←</button>
      ) : <span className="text-2xl" aria-hidden>🌿</span>}
      <span className="text-xl font-black text-forest">GreenPath</span>
      {plan === 'plus' && <span className="rounded-full bg-sun/40 px-2 py-0.5 text-xs font-black text-forest">PLUS</span>}
      <div className="ml-auto flex items-center gap-2">
        {paso && total ? (
          <div className="h-3 w-20 overflow-hidden rounded-full bg-mint" aria-label={`Paso ${paso} de ${total}`}>
            <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${(paso / total) * 100}%` }} />
          </div>
        ) : null}
        {onMiValor && (
          <button onClick={onMiValor} className="rounded-full border border-mint bg-white px-3 py-1 text-sm font-bold text-forest" aria-label="Mi valor GreenPath">📊 Mi valor</button>
        )}
      </div>
    </header>
    </>
  );
}

/** Cerrar sesión con confirmación en pantalla (la cuenta es anónima: al salir no se puede volver a entrar a ella). */
function CerrarSesion({ onConfirmar }: { onConfirmar: () => void }) {
  const [preguntando, setPreguntando] = useState(false);
  return (
    <div className="flex justify-end pt-3">
      {!preguntando ? (
        <button onClick={() => setPreguntando(true)} className="rounded-full border border-mint bg-white px-3 py-1 text-sm font-bold text-muted">Cerrar sesión</button>
      ) : (
        <div className="card w-full !p-3 text-sm">
          <p className="font-bold text-forest">¿Cerrar sesión?</p>
          <p className="text-muted">Tu cuenta es anónima: al salir empiezas de cero y no podrás volver a ver este historial.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={onConfirmar} className="rounded-full bg-alert px-4 py-1 font-bold text-white">Sí, cerrar sesión</button>
            <button onClick={() => setPreguntando(false)} className="rounded-full border border-mint bg-white px-4 py-1 font-bold text-forest">Cancelar</button>
          </div>
        </div>
      )}
    </div>
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
