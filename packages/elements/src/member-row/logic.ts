/** One member as a row: who, which role, which apps, two-step; apart from the look. */
import type { Role } from '@buntu/sdk/types';
import type { MemberRow, TeamLabels } from '../team/logic.js';

export interface MemberRowLogic {
  labels: () => TeamLabels;
  member: () => MemberRow | null;
  initials: () => string;
  canManage: () => boolean;
  busy: () => boolean;
  changeRole: (role: Role) => void;
  remove: () => void;
  editing: () => boolean;
  edit: (open: boolean) => void;
  choices: () => { client_id: string; name: string; picked: boolean }[];
  toggle: (clientId: string) => void;
  saveAccess: () => void;
}

export interface MemberRowEvents {
  role: { role: Role };
  remove: Record<string, never>;
  access: { apps: string[] };
}
