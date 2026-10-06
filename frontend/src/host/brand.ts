/**
 * A client's accent colour on the primary tokens and the hero. The skin is the page's `data-ui`, set by the
 * server; the logo and name are drawn by the page.
 */
import type { Brand } from './config.js';

const HEX = /^#[0-9a-f]{6}$/i;

export function applyBrand(brand: Brand): void {
  if (!brand.accent || !HEX.test(brand.accent)) return;
  const root = document.documentElement.style;
  root.setProperty('--flx-ui-color-primary', brand.accent);
  root.setProperty('--flx-ui-color-primary-fg', readableOn(brand.accent));
  root.setProperty('--idp-hero', brand.accent);
  root.setProperty('--idp-hero-fg', readableOn(brand.accent));
}

/** Black or white, whichever reads better on the colour (WCAG relative luminance). */
function readableOn(hex: string): string {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.4 ? '#111110' : '#ffffff';
}
