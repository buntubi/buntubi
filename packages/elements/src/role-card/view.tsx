/** The default look: a tinted box, the role's name over what it may do. */
import { viewToken } from '../view.js';
import type { RoleCardLogic } from './logic.js';

export const roleCardView = (r: RoleCardLogic) => (
  <div part="role" class="role">
    <style scoped>{`
      .role { box-sizing: border-box; height: 100%; display: grid; gap: 4px; align-content: start; padding: 12px; border-radius: 10px; background: var(--idp-surface-2); }
      strong { font-weight: 600; font-size: 13px; }
      span { color: var(--idp-muted); font-size: 12.5px; }
    `}</style>
    <strong>{() => r.name()}</strong>
    <span>{() => r.text()}</span>
  </div>
);

export const RoleCardView = viewToken<RoleCardLogic>('idp-role-card', roleCardView);
