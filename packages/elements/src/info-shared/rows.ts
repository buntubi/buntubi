/** The rows of the Devices and Connected apps cards: an icon, the text, the actions at the end. */
import { css } from '@fluixi/core';

export const rowStyles = css`
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 16px 18px; }
  .icon { width: 40px; height: 40px; flex: none; border-radius: 11px; display: grid; place-items: center; background: var(--idp-surface-2); overflow: hidden; }
  .icon img { width: 100%; height: 100%; object-fit: cover; }
  .text { flex: 1; min-width: 220px; display: grid; gap: 2px; }
  .title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-weight: 600; }
  .sub { color: var(--idp-muted); font-size: 12.5px; overflow-wrap: anywhere; }
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
  .ok { --tone: var(--idp-ok); }
  .quiet { --tone: var(--idp-muted); }
  .alert { margin: 0; padding: 0 18px 14px; color: var(--idp-bad); font-size: 13px; }
`;
