'use client';
/** Encuesta inicial (una sola vez; se edita desde Mi valor → Perfil). Pasos cortos con progreso y regreso. */
import { useState } from 'react';
import {
  DIAS, NO_CAMBIAR, PROBLEMAS, RESTRICCIONES,
  type Frecuencia, type NoCambiar, type Perfil, type Problema, type Restriccion, type Uso,
} from '@/lib/perfil';
import type { Tienda } from '@/lib/tipos';
import { Opcion, Titulo } from '../ui';

type Paso = 'uso' | 'personas' | 'frecuencia' | 'gasto' | 'problemas' | 'no_cambiar';
const PASOS_HOGAR: Paso[] = ['uso', 'personas', 'frecuencia', 'gasto', 'problemas', 'no_cambiar'];

export const perfilVacio = (nombre: string): Perfil => ({
  nombre, uso: 'hogar', personas: 2, frecuencia: 'semanal', frecuencia_dias: 7, gasto_por_despensa: null,
  problemas: [], no_cambiar: [], no_cambiar_detalle: null, restricciones: [], supermercados: [],
  alternativas_aceptadas: [], alternativas_rechazadas: [],
});

function Chip({ activo, children, onClick }: { activo: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      className={`rounded-2xl border-2 px-4 py-3 text-left font-bold transition ${activo ? 'border-leaf bg-mint text-forest' : 'border-mint bg-white text-ink'}`}>
      {activo ? '✓ ' : ''}{children}
    </button>
  );
}

const alternar = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

export function Encuesta({ inicial, tiendas, onListo, onCancelar }: {
  inicial: Perfil; tiendas: Tienda[]; onListo: (p: Perfil) => void; onCancelar?: () => void;
}) {
  const [p, setP] = useState<Perfil>(inicial);
  const [i, setI] = useState(0);
  const [diasOtra, setDiasOtra] = useState(String(inicial.frecuencia === 'otra' ? inicial.frecuencia_dias : 21));
  const [gasto, setGasto] = useState(inicial.gasto_por_despensa ? String(inicial.gasto_por_despensa) : '');
  const pasos = p.uso === 'hogar' ? PASOS_HOGAR : (['uso'] as Paso[]);
  const paso = pasos[i];
  const set = (c: Partial<Perfil>) => setP((x) => ({ ...x, ...c }));
  const siguiente = (c?: Partial<Perfil>) => {
    const nuevo = { ...p, ...c };
    setP(nuevo);
    const ps = nuevo.uso === 'hogar' ? PASOS_HOGAR : ['uso'];
    if (i + 1 >= ps.length) onListo(nuevo); else setI(i + 1);
  };
  const atras = () => (i === 0 ? onCancelar?.() : setI(i - 1));

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center gap-3">
        {(i > 0 || onCancelar) && <button onClick={atras} className="rounded-full border border-mint bg-white px-3 py-1 font-bold text-forest" aria-label="Regresar">←</button>}
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-mint" aria-label={`Pregunta ${i + 1} de ${pasos.length}`}>
          <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${((i + 1) / pasos.length) * 100}%` }} />
        </div>
        <span className="text-sm font-bold text-muted">{i + 1}/{pasos.length}</span>
      </div>

      {paso === 'uso' && (
        <div className="flex flex-col gap-3">
          <Titulo sub="Así adaptamos GreenPath a lo que necesitas.">¿Para qué usarás GreenPath?</Titulo>
          <Opcion icono="🏠" titulo="Mi hogar y despensa" onClick={() => siguiente({ uso: 'hogar' as Uso })} activo={p.uso === 'hogar'} />
          <Opcion icono="🎉" titulo="Organizar un evento" onClick={() => siguiente({ uso: 'evento' as Uso })} activo={p.uso === 'evento'} />
          <Opcion icono="🏪" titulo="Mi negocio" onClick={() => siguiente({ uso: 'negocio' as Uso })} activo={p.uso === 'negocio'} />
        </div>
      )}

      {paso === 'personas' && (
        <div className="flex flex-1 flex-col">
          <Titulo>¿Para cuántas personas compras alimentos?</Titulo>
          <div className="card flex items-center justify-between">
            <button className="h-14 w-14 rounded-full bg-mint text-3xl font-black text-forest" onClick={() => set({ personas: Math.max(1, p.personas - 1) })} aria-label="Menos">−</button>
            <span className="text-5xl font-black text-forest">{p.personas}</span>
            <button className="h-14 w-14 rounded-full bg-mint text-3xl font-black text-forest" onClick={() => set({ personas: Math.min(15, p.personas + 1) })} aria-label="Más">+</button>
          </div>
          <p className="mt-2 text-center text-muted">{p.personas === 1 ? 'persona' : 'personas'} (1 a 15)</p>
          <div className="mt-auto pt-6"><button className="btn btn-primary" onClick={() => siguiente()}>Continuar</button></div>
        </div>
      )}

      {paso === 'frecuencia' && (
        <div className="flex flex-1 flex-col gap-3">
          <Titulo>¿Cada cuánto haces tu despensa?</Titulo>
          {(['semanal', 'quincenal', 'mensual'] as Frecuencia[]).map((f) => (
            <Chip key={f} activo={p.frecuencia === f} onClick={() => siguiente({ frecuencia: f, frecuencia_dias: DIAS[f] })}>
              {{ semanal: 'Semanalmente', quincenal: 'Quincenalmente', mensual: 'Mensualmente', otra: '' }[f]}
            </Chip>
          ))}
          <div className={`card !p-4 ${p.frecuencia === 'otra' ? 'border-leaf' : ''}`}>
            <p className="font-bold text-forest">Otra frecuencia</p>
            <div className="mt-2 flex items-center gap-2">
              Cada <input inputMode="numeric" className="field !w-24" value={diasOtra} onChange={(e) => setDiasOtra(e.target.value.replace(/\D/g, ''))} /> días
              <button className="ml-auto rounded-2xl bg-leaf px-4 py-2 font-bold text-white" disabled={!(Number(diasOtra) >= 1 && Number(diasOtra) <= 90)}
                onClick={() => siguiente({ frecuencia: 'otra', frecuencia_dias: Number(diasOtra) })}>Usar</button>
            </div>
          </div>
        </div>
      )}

      {paso === 'gasto' && (
        <form className="flex flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); siguiente({ gasto_por_despensa: Number(gasto) > 0 ? Number(gasto) : null }); }}>
          <Titulo sub="Un aproximado está bien. Con esto calculamos tu gasto mensual.">¿Cuánto gastas aproximadamente por despensa?</Titulo>
          <div className="flex items-center gap-2 text-3xl font-black text-forest">
            $<input autoFocus inputMode="decimal" className="field !text-3xl !font-black" value={gasto} onChange={(e) => setGasto(e.target.value.replace(/[^\d.]/g, ''))} placeholder="1500" />
          </div>
          <div className="mt-auto space-y-3 pt-6">
            <button className="btn btn-primary" disabled={!(Number(gasto) > 0)}>Continuar</button>
            <button type="button" className="btn btn-light" onClick={() => siguiente({ gasto_por_despensa: null })}>No lo sé</button>
          </div>
        </form>
      )}

      {paso === 'problemas' && (
        <div className="flex flex-1 flex-col gap-2">
          <Titulo sub="Elige todos los que apliquen.">¿Qué problemas tienes con tu despensa?</Titulo>
          {(Object.keys(PROBLEMAS) as Problema[]).map((k) => (
            <Chip key={k} activo={p.problemas.includes(k)} onClick={() => set({ problemas: alternar(p.problemas, k) })}>{PROBLEMAS[k]}</Chip>
          ))}
          <div className="mt-auto pt-6"><button className="btn btn-primary" onClick={() => siguiente()}>Continuar</button></div>
        </div>
      )}

      {paso === 'no_cambiar' && (
        <div className="flex flex-1 flex-col gap-2">
          <Titulo sub="Lo respetaremos en cada recomendación.">¿Qué no estás dispuesto a cambiar?</Titulo>
          {(Object.keys(NO_CAMBIAR) as NoCambiar[]).map((k) => (
            <div key={k}>
              <Chip activo={p.no_cambiar.includes(k)} onClick={() => set({ no_cambiar: alternar(p.no_cambiar, k) })}>{NO_CAMBIAR[k]}</Chip>
              {k === 'restricciones' && p.no_cambiar.includes(k) && (
                <div className="mt-2 flex flex-wrap gap-2 pl-2">
                  {(Object.keys(RESTRICCIONES) as Restriccion[]).map((r) => (
                    <Chip key={r} activo={p.restricciones.includes(r)} onClick={() => set({ restricciones: alternar(p.restricciones, r) })}>{RESTRICCIONES[r]}</Chip>
                  ))}
                </div>
              )}
              {k === 'supermercados' && p.no_cambiar.includes(k) && (
                <div className="mt-2 flex flex-wrap gap-2 pl-2">
                  {tiendas.map((t) => (
                    <Chip key={t.id} activo={p.supermercados.includes(t.id)} onClick={() => set({ supermercados: alternar(p.supermercados, t.id) })}>{t.nombre}</Chip>
                  ))}
                </div>
              )}
              {(k === 'marcas' || k === 'otros' || k === 'preferencias') && p.no_cambiar.includes(k) && (
                <input className="field mt-2" placeholder={k === 'marcas' ? 'Ej. Lala, Bimbo, San Juan' : 'Cuéntanos'}
                  value={p.no_cambiar_detalle ?? ''} onChange={(e) => set({ no_cambiar_detalle: e.target.value || null })} />
              )}
            </div>
          ))}
          <div className="mt-auto pt-6"><button className="btn btn-primary" onClick={() => siguiente()}>Ver mi diagnóstico</button></div>
        </div>
      )}
    </div>
  );
}
