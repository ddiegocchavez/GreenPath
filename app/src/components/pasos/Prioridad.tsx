'use client';
import type { Prioridad } from '@/lib/tipos';
import { Opcion, Titulo } from '../ui';

export function PasoPrioridad({ onListo }: { onListo: (p: Prioridad) => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Titulo sub="Primero cuidamos tu presupuesto; con lo que sobre subimos lo que elijas.">¿Qué es lo más importante para ti?</Titulo>
      <Opcion icono="💰" titulo="Precio" sub="Lo más barato posible." onClick={() => onListo('precio')} />
      <Opcion icono="⭐" titulo="Calidad" sub="Subir a calidad superior o premium donde alcance." onClick={() => onListo('calidad')} />
      <Opcion icono="🌎" titulo="Sustentabilidad" sub="Preferir orgánico y productos de menor impacto (S1–S2)." onClick={() => onListo('sustentabilidad')} />
    </div>
  );
}
