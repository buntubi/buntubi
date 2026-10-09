/** Who may sign in to an organization's sandbox apps besides its members; apart from the look. */
import type { TeamLabels } from '../team/logic.js';

export interface TestUsersLogic {
  labels: () => TeamLabels;
  testers: () => { email: string; added: string }[];
  canManage: () => boolean;
  email: () => string;
  edit: (value: string) => void;
  add: () => Promise<void>;
  remove: (email: string) => Promise<void>;
  busy: () => string | null;
  error: () => string | null;
}
