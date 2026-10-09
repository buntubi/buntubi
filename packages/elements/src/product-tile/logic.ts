/** One API product in the catalogue, as a card; apart from the look. */

export type Approval = 'none' | 'review' | 'restricted';

export interface ProductTileLogic {
  name: () => string;
  /** "Identity · OAuth 2.0, OpenID Connect". */
  meta: () => string;
  text: () => string;
  scopes: () => string[];
  availability: () => string;
  approval: () => Approval;
  approvalLabel: () => string;
  icon: () => string;
  tone: () => string;
  docs: () => string;
  docsLabel: () => string;
}
