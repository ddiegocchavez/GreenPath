/** Tipografía, espaciados y radios de GreenPath. Los colores viven en colors.ts. */
export { colors } from './colors';

export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_900Black',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const text = {
  title: { fontFamily: fonts.black, fontSize: 28 },
  heading: { fontFamily: fonts.bold, fontSize: 20 },
  body: { fontFamily: fonts.regular, fontSize: 16 },
  label: { fontFamily: fonts.semibold, fontSize: 14 },
  small: { fontFamily: fonts.regular, fontSize: 13 },
} as const;
