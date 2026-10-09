/** One API product to pick, as a card; apart from the look. */

export type Approval = 'none' | 'review' | 'restricted';

export interface ProductCardLogic {
  name: () => string;
  text: () => string;
  scopes: () => string[];
  meta: () => string;
  approval: () => Approval;
  approvalLabel: () => string;
  selected: () => boolean;
  toggle: () => void;
}

export interface ProductCardEvents {
  toggle: Record<string, never>;
}
