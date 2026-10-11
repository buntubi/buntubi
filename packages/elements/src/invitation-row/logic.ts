/** One invitation waiting for its account; apart from the look. */
import type { Invitation } from '@idp/sdk/types';
import type { TeamLabels } from '../team/logic.js';

export interface InvitationRowEvents {
  withdraw: { id: string };
}

export interface InvitationRowLogic {
  labels: () => TeamLabels;
  invitation: () => Invitation | null;
  /** Invited on, and until when. */
  dates: () => string;
  canManage: () => boolean;
  busy: () => boolean;
  withdraw: () => void;
}
