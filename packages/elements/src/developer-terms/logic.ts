/** The developer terms, accepted once before anything is built; apart from the look. */

export interface DeveloperTermsLabels {
  title: string;
  text: string;
  accept: string;
  error: string;
}

export const developerTermsLabels: DeveloperTermsLabels = {
  title: 'Developer terms',
  text: 'Before you register apps, accept the terms that apply to them and to the data they reach.',
  accept: 'Accept and continue',
  error: 'Something went wrong. Try again.',
};

export interface DeveloperTermsLogic {
  labels: () => DeveloperTermsLabels;
  accept: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}

export interface DeveloperTermsEvents {
  /** The terms are accepted; the host moves on. */
  accepted: Record<string, never>;
}
