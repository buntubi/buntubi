/** An organization's members and inviting one; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { MemberInviteInput } from '@buntubi/sdk/schemas/team';
import type { Position } from '@buntubi/sdk/roles';
import type { Invitation } from '@buntubi/sdk/types';
import type { MemberRow, TeamLabels } from '../team/logic.js';

/** The invitation's values: the engine widens a field to `string`, so the role is narrowed at submit. */
export type InviteValues = Omit<MemberInviteInput, 'role'> & { role: string };

/** The form engine's root, typed per field. */
export interface InviteForm extends ReactiveForm<InviteValues> {
  get<K extends keyof InviteValues>(key: K): FieldControl<InviteValues[K]>;
}

export interface MembersLogic {
  labels: () => TeamLabels;
  members: () => MemberRow[];
  invitations: () => Invitation[];
  locale: () => string;
  withdraw: (invitation: string) => Promise<void>;
  notice: () => string | null;
  apps: () => { client_id: string; name: string }[];
  canManage: () => boolean;
  inviting: () => boolean;
  openInvite: (open: boolean) => void;
  inviteForm: InviteForm;
  invite: (values: InviteValues) => Promise<void>;
  changeRole: (member: string, position: Position) => Promise<void>;
  changeAccess: (member: string, apps: string[]) => Promise<void>;
  remove: (member: string) => Promise<void>;
  busy: () => string | null;
  error: () => string | null;
}
