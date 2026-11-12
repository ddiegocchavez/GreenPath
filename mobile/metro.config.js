// Metro: ignora las carpetas nativas generadas (android/ios). Contienen miles de
// archivos de compilación que Metro no necesita y que vuelven lento el arranque.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const ignore = [/[\\/]android[\\/]app[\\/](build|\.cxx)[\\/].*/, /[\\/]android[\\/]\.gradle[\\/].*/, /[\\/]ios[\\/]Pods[\\/].*/];
const prev = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(prev) ? prev : prev ? [prev] : []), ...ignore];

module.exports = config;
