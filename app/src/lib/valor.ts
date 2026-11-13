/**
 * Ahorro adicional VERIFICABLE del análisis completo (modelo avanzado) frente al básico, para una lista:
 * mismos productos, misma cantidad, precios reales del catálogo, solo productos cubiertos en ambos.
 *   básico   = la tienda más barata para toda la lista (Gratis)
 *   avanzado = combina tiendas + la mejor alternativa ganar-ganar por producto (Individual, Flex, Plus)
 * Lo usan la propuesta de plan (onboarding) y los resultados.
 */
import { compararCubiertos, desglose } from './impacto';
import { evaluar, evaluarAlternativas, type Plan } from './optimizar';
import { alternativasPara, aplicarAlternativas, aplicarPreferencias, type ExtraPorAnalisis, type Perfil } from './perfil';
import type { Catalogo, Item } from './tipos';

export function extraAvanzado(cat: Catalogo, items: Item[], perfil: Perfil | null): {
  basico: Plan | null; avanzado: Plan | null; extra: ExtraPorAnalisis; alternativas: number;
} {
  if (!items.length) return { basico: null, avanzado: null, extra: null, alternativas: 0 };
  const pref = aplicarPreferencias(cat, items, perfil);
  const tiendas = pref.cat.tiendas.map((t) => t.id);
  const gg = evaluarAlternativas(pref.cat, pref.items, alternativasPara(pref.items, perfil), tiendas).filter((e) => e.tipo === 'gana_gana');
  const mejores = [...new Map(gg.map((e) => [e.de, e] as const)).values()];
  const basico = evaluar(pref.cat, pref.items, null, 'precio').filter((p) => p.tiendas.length === 1)[0] ?? null;
  const avanzado = evaluar(pref.cat, aplicarAlternativas(pref.items, mejores.map((e) => e.id)), null, 'precio')[0] ?? null;
  if (!basico || !avanzado) return { basico, avanzado, extra: null, alternativas: mejores.length };
  const c = compararCubiertos(desglose(pref.cat, pref.items, basico, avanzado, mejores.map((e) => ({ de: e.de, a: e.a })), false));
  return {
    basico, avanzado, alternativas: mejores.length,
    extra: { mxn: Math.max(0, c.ahorro), kg: c.refKg != null && c.optKg != null ? Math.round((c.refKg - c.optKg) * 10) / 10 : null, comparables: c.comparables },
  };
}
