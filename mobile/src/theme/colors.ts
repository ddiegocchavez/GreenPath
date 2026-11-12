/**
 * Paleta de GreenPath: verdes oscuros y claros.
 * Cualquier color de la app sale de aquí; no escribir colores sueltos en las pantallas.
 */
export const colors = {
  // Verdes oscuros: títulos, cabeceras, barra de pestañas, relieve de botones
  forest: '#0F3D2E', // verde bosque (el más oscuro)
  pine: '#1B5E3F', // relieve de botones y estado presionado
  // Verde principal: botones y acciones
  leaf: '#2E9E5B',
  // Verdes claros: tarjetas, chips, fondos
  sprout: '#A8E6B8', // chips seleccionados, barras de gráficas
  mint: '#DDF3E4', // tarjetas suaves
  mist: '#F1FAF3', // fondo general

  // Texto
  text: '#0F2A1E',
  textMuted: '#4F6B5A',
  onDark: '#FFFFFF',

  // Acentos mínimos (solo para estados, no decoración)
  celebrate: '#F2C94C', // logros y celebraciones
  pending: '#7A8F82', // "estimación pendiente": gris verdoso, nunca rojo
  error: '#C2513F',
} as const;

export type ColorName = keyof typeof colors;
