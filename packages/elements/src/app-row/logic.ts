/** One app in the list: who it is, where it stands, what it uses; apart from the look. */
import type { AppStatus } from '../app-list/logic.js';

export interface AppRowLogic {
  name: () => string;
  mark: () => string;
  meta: () => string;
  href: () => string;
  status: () => AppStatus;
  statusLabel: () => string;
  apis: () => string;
}
