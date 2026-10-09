/** Why an app needs one sensitive scope, as a field to fill; apart from the look. */

export interface ScopeJustificationLogic {
  scope: () => string;
  description: () => string;
  question: () => string;
  hint: () => string;
  status: () => string;
  explained: () => boolean;
  value: () => string;
  edit: (value: string) => void;
}

export interface ScopeJustificationEvents {
  edit: { value: string };
}
