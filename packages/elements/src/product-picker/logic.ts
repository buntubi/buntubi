/** The API products to pick from, one card each; apart from the look. */
import type { Approval } from '../product-card/logic.js';

export interface ProductEntry {
  slug: string;
  name: string;
  text: string;
  scopes: string[];
  meta: string;
  approval: Approval;
  approvalLabel: string;
  selected: boolean;
}

export interface ProductPickerLogic {
  title: () => string;
  intro: () => string;
  empty: () => string;
  products: () => ProductEntry[];
  toggle: (slug: string) => void;
}

export interface ProductPickerEvents {
  toggle: { slug: string };
}
