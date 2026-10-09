/** A secret or key shown once, with a way to copy it; apart from the look. */

export interface OneTimeValueLogic {
  value: () => string;
  note: () => string;
  copyLabel: () => string;
  copied: () => boolean;
  copy: () => void;
}
