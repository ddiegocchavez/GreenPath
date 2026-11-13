/** Gráfica de línea simple con etiquetas por punto (react-native-svg). */
import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme';

export type Point = { label: string; value: number | null; caption?: string };

export default function LineChart({ points, height = 220, format = (v: number) => v.toFixed(1) }: {
  points: Point[]; height?: number; format?: (v: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const padL = 36, padR = 16, padT = 34, padB = 30;
  const max = values.length ? Math.max(...values) : 1;
  const min = values.length ? Math.min(...values) : 0;
  const lo = Math.max(0, min - (max - min || max) * 0.3);
  const hi = max + (max - min || max) * 0.15;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = height - padT - padB;
  const x = (i: number) => padL + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
  const y = (v: number) => padT + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
  const ticks = [lo, (lo + hi) / 2, hi];

  const drawn = points.map((p, i) => (p.value == null ? null : { ...p, cx: x(i), cy: y(p.value) })).filter(Boolean) as
    (Point & { cx: number; cy: number })[];

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Line x1={padL} y1={padT - 10} x2={padL} y2={padT + innerH} stroke="#9DB3A5" strokeWidth={1} />
          <Line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} stroke="#9DB3A5" strokeWidth={1} />
          {ticks.map((t, i) => (
            <SvgText key={i} x={padL - 6} y={y(t) + 4} fontSize={11} fill={colors.textMuted} textAnchor="end">{format(t)}</SvgText>
          ))}
          {points.map((p, i) => (
            <SvgText key={p.label} x={x(i)} y={height - 8} fontSize={12} fill={colors.text} textAnchor="middle">{p.label}</SvgText>
          ))}
          {drawn.length > 1 && (
            <Polyline points={drawn.map((d) => `${d.cx},${d.cy}`).join(' ')} fill="none" stroke={colors.leaf} strokeWidth={2.5} />
          )}
          {drawn.map((d) => (
            <Circle key={d.label} cx={d.cx} cy={d.cy} r={5.5} fill={colors.leaf} />
          ))}
          {drawn.map((d, i) => (
            // Si la línea llega desde más arriba, la etiqueta va debajo del punto para no encimarse.
            <SvgText key={`${d.label}-v`} x={d.cx} y={i > 0 && drawn[i - 1].cy < d.cy ? d.cy + 22 : d.cy - 12}
              fontSize={12} fontWeight="bold" fill={colors.forest}
              textAnchor={i === drawn.length - 1 && drawn.length > 1 ? 'end' : 'middle'}>
              {d.caption ?? format(d.value as number)}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}
