/**
 * Íconos de línea dibujados con react-native-svg (sin dependencias nativas nuevas).
 * Trazos basados en Lucide (licencia ISC, https://lucide.dev).
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';

export type IconName =
  | 'leaf' | 'user' | 'chart' | 'trophy' | 'phone' | 'utensils' | 'sliders' | 'chevron'
  | 'arrow' | 'gift' | 'check' | 'circle' | 'clipboard' | 'fridge' | 'party' | 'plus' | 'logout';

export default function Icon({ name, size = 24, color = colors.forest, strokeWidth = 1.8 }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number;
}) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'leaf' && (<>
        <Path {...p} d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <Path {...p} d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </>)}
      {name === 'user' && (<><Circle {...p} cx={12} cy={8} r={5} /><Path {...p} d="M20 21a8 8 0 0 0-16 0" /></>)}
      {name === 'chart' && (<>
        <Rect {...p} x={3} y={12} width={4.5} height={9} rx={1} />
        <Rect {...p} x={9.75} y={8} width={4.5} height={13} rx={1} />
        <Rect {...p} x={16.5} y={3} width={4.5} height={18} rx={1} />
      </>)}
      {name === 'trophy' && (<>
        <Path {...p} d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><Path {...p} d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <Path {...p} d="M4 22h16" /><Path {...p} d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <Path {...p} d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <Path {...p} d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </>)}
      {name === 'phone' && (<><Rect {...p} x={5} y={2} width={14} height={20} rx={2} /><Path {...p} d="M11 18h2" /></>)}
      {name === 'utensils' && (<>
        <Path {...p} d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><Path {...p} d="M7 2v20" />
        <Path {...p} d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </>)}
      {name === 'sliders' && (<>
        <Path {...p} d="M3 5h7M14 5h7M3 12h3M10 12h11M3 19h11M18 19h3" />
        <Circle {...p} cx={12} cy={5} r={2} /><Circle {...p} cx={8} cy={12} r={2} /><Circle {...p} cx={16} cy={19} r={2} />
      </>)}
      {name === 'chevron' && <Path {...p} d="m9 18 6-6-6-6" />}
      {name === 'arrow' && (<><Path {...p} d="M5 12h14" /><Path {...p} d="m12 5 7 7-7 7" /></>)}
      {name === 'gift' && (<>
        <Rect {...p} x={3} y={8} width={18} height={4} rx={1} /><Path {...p} d="M12 8v13" />
        <Path {...p} d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        <Path {...p} d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 11 5 12 8c1-3 2.5-5 4.5-5a2.5 2.5 0 0 1 0 5" />
      </>)}
      {name === 'check' && (<><Circle {...p} cx={12} cy={12} r={10} /><Path {...p} d="m8 12 3 3 5-6" /></>)}
      {name === 'circle' && <Circle {...p} cx={12} cy={12} r={10} />}
      {name === 'clipboard' && (<>
        <Rect {...p} x={8} y={2} width={8} height={4} rx={1} />
        <Path {...p} d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <Path {...p} d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
      </>)}
      {name === 'fridge' && (<><Rect {...p} x={5} y={2} width={14} height={20} rx={2} /><Path {...p} d="M5 10h14M9 5v2M9 13v3" /></>)}
      {name === 'party' && (<>
        <Path {...p} d="M5.8 11.3 2 22l10.7-3.79" />
        <Path {...p} d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
        <Path {...p} d="M14 10l2-3M17 12l4-1M12 7l-1-4M19 4l2-2M4 3h.01M22 8h.01M15 2h.01M22 20h.01" />
      </>)}
      {name === 'plus' && <Path {...p} d="M5 12h14M12 5v14" />}
      {name === 'logout' && (<><Path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Path {...p} d="m16 17 5-5-5-5" /><Path {...p} d="M21 12H9" /></>)}
    </Svg>
  );
}
