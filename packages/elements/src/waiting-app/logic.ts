/** One app waiting for a review, as a line; apart from the look. */

export interface WaitingAppLogic {
  name: () => string;
  organization: () => string;
  scopes: () => string[];
  href: () => string;
  open: () => string;
}
