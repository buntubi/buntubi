/** An organization's members and inviting one; apart from the look. */
import type { Role } from '@idp/sdk/types';
import type { MemberRow, TeamLabels } from '../team/logic.js';

export interface MembersLogic {
  labels: () => TeamLabels;
  members: () => MemberRow[];
  apps: () => { client_id: string; name: string }[];
  canManage: () => boolean;
  inviting: () => boolean;
  openInvite: (open: boolean) => void;
  inviteEmail: () => string;
  inviteRole: () => Role;
  editInvite: (field: 'email' | 'role', value: string) => void;
  invite: () => Promise<void>;
  changeRole: (member: string, role: Role) => Promise<void>;
  changeAccess: (member: string, apps: string[]) => Promise<void>;
  remove: (member: string) => Promise<void>;
  busy: () => string | null;
  error: () => string | null;
}
