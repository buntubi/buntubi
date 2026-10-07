/**
 * The document's colour scheme: light, dark or the system's, kept in a cookie so the server
 * renders the visitor's choice. Made by the app root during the render (on the server, once
 * per request) and handed down with core's `ThemeProvider`.
 */
import { createColorScheme, useColorScheme, type ColorScheme } from '@fluixi/core';

export const schemeKey = 'dp-scheme';

export function createDocumentScheme(): ColorScheme {
  return createColorScheme({ storageKey: schemeKey, themeColor: { light: '#f7f7f8', dark: '#0a0b0d' } });
}

export { useColorScheme };
export type { ColorScheme };
