import type { BadgeTone } from '@fluixi-ui/badge';

/** A status's tone: the Badge tone that shows it, and the skin colour for what else it tints. */
export type Tone = BadgeTone;

const COLOR: Record<Tone, string> = {
  neutral: 'var(--flx-ui-color-fg-muted)',
  primary: 'var(--flx-ui-color-primary-text)',
  info: 'var(--flx-ui-color-primary-text)',
  success: 'var(--flx-ui-color-success-text)',
  warning: 'var(--flx-ui-color-warning-text)',
  danger: 'var(--flx-ui-color-danger-text)',
};

/** The active skin's colour for a tone, for a mark or a border a status tints besides its badge. */
export const toneColor = (tone: Tone): string => COLOR[tone];
