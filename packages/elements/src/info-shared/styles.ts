/** The rows the personal info cards share: a label column, the value, the action at the end. */
import { css } from '@fluixi/core';

export const infoStyles = css`
  h2 { margin: 0; padding: 14px 18px; font-size: 15px; font-weight: 600; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 14px 18px; border-top: 1px solid var(--idp-border); }
  .label { width: 180px; color: var(--idp-muted); font-size: 13px; }
  .value { flex: 1; min-width: 200px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .value > span { min-width: 0; overflow-wrap: anywhere; }
  .muted { color: var(--idp-muted); }
  .hint { margin: 0; padding: 0 18px 14px 210px; color: var(--idp-muted); font-size: 12.5px; }
  .edit { display: grid; gap: 12px; padding: 14px 18px; border-top: 1px solid var(--idp-border); background: var(--idp-surface-2); }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .buttons { display: flex; gap: 8px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .notice { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 0 18px 14px 210px; }
  .edit .alert, .edit .done { padding: 0; }
  .alert { margin: 0; padding: 0 18px 14px; color: var(--idp-bad); font-size: 13px; }
  .done { margin: 0; padding: 0 18px 14px; color: var(--idp-ok); font-size: 13px; }
  @media (max-width: 720px) { .label { width: 100%; } .value { flex-basis: 100%; min-width: 0; } .hint, .notice { margin-left: 18px; padding-left: 0; } .hint { padding-left: 18px; } .fields { grid-template-columns: 1fr; } }
`;
