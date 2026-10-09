/** The way back and forward through a flow; apart from the look. */

export interface WizardFooterLogic {
  backLabel: () => string;
  nextLabel: () => string;
  note: () => string;
  busy: () => boolean;
  back: () => void;
  next: () => void;
}

export interface WizardFooterEvents {
  back: Record<string, never>;
  next: Record<string, never>;
}
