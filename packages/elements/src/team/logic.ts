/** An organization's people: members with their roles and app access, and sandbox test users. */
import type { Member, Role } from '@idp/sdk/types';

export const ROLES: Role[] = ['owner', 'admin', 'developer', 'reviewer', 'viewer'];

/** Roles whose access can be limited to some apps; owners and admins always see every app. */
export const LIMITABLE: Role[] = ['developer', 'reviewer', 'viewer'];

export interface TeamLabels {
  members: string;
  membersIntro: string;
  member: string;
  role: string;
  access: string;
  allApps: string;
  you: string;
  roles: Record<Role, { name: string; text: string }>;
  invite: string;
  inviteEmail: string;
  inviteHint: string;
  editAccess: string;
  /** That picking no app means every app. */
  accessHint: string;
  saveAccess: string;
  cancel: string;
  remove: string;
  testers: string;
  testersIntro: string;
  testerEmail: string;
  addTester: string;
  noTesters: string;
  added: string;
  error: string;
}

export const teamLabels: TeamLabels = {
  members: 'Members',
  membersIntro: 'People who build and run this organization’s apps.',
  member: 'Member',
  role: 'Role',
  access: 'App access',
  allApps: 'All apps',
  you: 'you',
  roles: {
    owner: { name: 'Owner', text: 'Everything, including deleting the organization.' },
    admin: { name: 'Admin', text: 'Manages members, settings, live keys and publishing.' },
    developer: { name: 'Developer', text: 'Builds and tests apps, sandbox keys and test users.' },
    reviewer: { name: 'Reviewer', text: 'Reads apps and their review state.' },
    viewer: { name: 'Viewer', text: 'Reads only.' },
  },
  invite: 'Add member',
  inviteEmail: 'Email address',
  inviteHint: 'The person needs an account on the platform first.',
  editAccess: 'Access',
  accessHint: 'None picked means every app.',
  saveAccess: 'Save access',
  cancel: 'Cancel',
  remove: 'Remove',
  testers: 'Test users',
  testersIntro: 'Only these people, with your members, can sign in to apps still in the sandbox.',
  testerEmail: 'Email address',
  addTester: 'Add',
  noTesters: 'No test user yet.',
  added: 'Added',
  error: 'Something went wrong. Try again.',
};

export interface MemberRow extends Member {
  self: boolean;
  /** The app names this member is limited to, or empty for every app. */
  appNames: string[];
  limitable: boolean;
}

export interface TeamLogic {
  labels: () => TeamLabels;
  members: () => MemberRow[];
  canManage: () => boolean;
  canManageTesters: () => boolean;
  changeRole: (member: string, role: Role) => Promise<void>;
  remove: (member: string) => Promise<void>;
  inviteEmail: () => string;
  inviteRole: () => Role;
  editInvite: (field: 'email' | 'role', value: string) => void;
  invite: () => Promise<void>;
  /** The member whose app access is being edited, and the apps picked so far. */
  editing: () => string | null;
  editAccess: (member: string | null) => void;
  accessChoices: () => { client_id: string; name: string; picked: boolean; toggle: () => void }[];
  saveAccess: () => Promise<void>;
  testers: () => { email: string; added: string }[];
  testerEmail: () => string;
  editTester: (value: string) => void;
  addTester: () => Promise<void>;
  removeTester: (email: string) => Promise<void>;
  busy: () => string | null;
  error: () => string | null;
}
