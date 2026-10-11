/**
 * A client's accent colour, as variables the stylesheet maps onto the primary tokens, the account
 * theme's accent and the hero, per scheme (styles.css). The skin is the page's `data-ui`, set by
 * the server; the logo and name are drawn by the page.
 */
import type { Brand } from './config.js';

const HEX = /^#[0-9a-f]{6}$/i;

// A light ink for a brand too dark to read on a dark page (a near-black brand, say).
const DARK_INK = '#ededf0';

export function applyBrand(brand: Brand): void {
  if (!brand.accent || !HEX.test(brand.accent)) return;
  const root = document.documentElement.style;
  const onDark = luminance(brand.accent) < 0.18 ? DARK_INK : brand.accent;
  root.setProperty('--idp-brand', brand.accent);
  root.setProperty('--idp-brand-fg', readableOn(brand.accent));
  root.setProperty('--idp-brand-dark', onDark);
  root.setProperty('--idp-brand-dark-fg', readableOn(onDark));
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Black or white, whichever reads better on the colour. */
function readableOn(hex: string): string {
  return luminance(hex) > 0.4 ? '#111110' : '#ffffff';
}
