/** Who may sign in to an organization's sandbox apps besides its members; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { TestUserInput } from '@buntubi/sdk/schemas/team';
import type { TeamLabels } from '../team/logic.js';

/** The form engine's root, typed per field. */
export interface TestUserForm extends ReactiveForm<TestUserInput> {
  get<K extends keyof TestUserInput>(key: K): FieldControl<TestUserInput[K]>;
}

export interface TestUsersLogic {
  labels: () => TeamLabels;
  testers: () => { email: string; added: string }[];
  canManage: () => boolean;
  form: TestUserForm;
  add: (values: TestUserInput) => Promise<void>;
  remove: (email: string) => Promise<void>;
  busy: () => string | null;
  error: () => string | null;
}
