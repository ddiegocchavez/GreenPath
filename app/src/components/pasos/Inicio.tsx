'use client';
/** Pasos 1–3: nombre, ubicación y cómo empezar (lista o ticket). */
import { useState } from 'react';
import { CENTRO_MTY } from '@/lib/geo';
import type { Punto } from '@/lib/tipos';
import { Opcion, Titulo } from '../ui';

export function PasoNombre({ inicial, onListo }: { inicial: string; onListo: (n: string) => void }) {
  const [nombre, setNombre] = useState(inicial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (nombre.trim()) onListo(nombre.trim()); }} className="flex flex-1 flex-col justify-center pb-10">
      <div className="mb-6 rounded-3xl bg-forest p-6 text-white">
        <p className="text-5xl" aria-hidden>🛒🌿</p>
        <p className="mt-3 text-2xl font-black">Tu despensa al mejor precio</p>
        <p className="mt-1 text-sprout">Comparamos Walmart, H-E-B y Costco cerca de ti, cuidando calidad y planeta.</p>
      </div>
      <Titulo>¿Cómo te llamas?</Titulo>
      <input autoFocus className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" maxLength={40} />
      <div className="pt-6"><button className="btn btn-primary" disabled={!nombre.trim()}>Continuar</button></div>
    </form>
  );
}

export function PasoUbicacion({ nombre, onListo }: { nombre: string; onListo: (p: Punto) => void }) {
  const [estado, setEstado] = useState<'idle' | 'buscando' | 'error'>('idle');
  const pedir = () => {
    if (!navigator.geolocation) { setEstado('error'); return; }
    setEstado('buscando');
    navigator.geolocation.getCurrentPosition(
      (pos) => onListo({ lat: pos.coords.latitude, lng: pos.coords.longitude, etiqueta: 'Tu ubicación' }),
      () => setEstado('error'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };
  return (
    <div className="flex flex-1 flex-col justify-center pb-10">
      <Titulo sub="La usamos solo en tu teléfono para ordenar las tiendas por cercanía. No la guardamos.">
        ¡Hola, {nombre}! ¿Dónde estás?
      </Titulo>
      <div className="card text-6xl text-center" aria-hidden>📍</div>
      {estado === 'error' && <p className="mt-4 text-alert font-bold">No pudimos obtener tu ubicación. Puedes usar el centro de Monterrey.</p>}
      <div className="space-y-3 pt-6">
        <button className="btn btn-primary" onClick={pedir} disabled={estado === 'buscando'}>
          {estado === 'buscando' ? 'Buscando…' : 'Usar mi ubicación'}
        </button>
        <button className="btn btn-light" onClick={() => onListo(CENTRO_MTY)}>Usar centro de Monterrey</button>
      </div>
    </div>
  );
}

export function PasoModo({ nombre, onListo }: { nombre: string; onListo: (m: 'lista' | 'ticket') => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Titulo sub="Elige cómo quieres empezar.">{nombre}, ¿qué tienes a la mano?</Titulo>
      <Opcion icono="📝" titulo="Escribir mi lista de despensa" sub="Elige productos y cantidades." onClick={() => onListo('lista')} />
      <Opcion icono="🧾" titulo="Subir foto de mi ticket" sub="Leemos productos y precios, y buscamos opciones más baratas." onClick={() => onListo('ticket')} />
    </div>
  );
}
