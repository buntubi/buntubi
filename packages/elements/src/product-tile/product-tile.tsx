/** One API product: its icon, name and kind, what it does, its scopes, and what using it takes. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { Approval, ProductTileLogic } from './logic.js';
import { ProductTileView } from './view.js';

/** An icon and a colour per category; anything else is a box. */
const LOOK: Record<string, { icon: string; tone: string }> = {
  identity: { icon: 'M3 5h18v14H3zM8 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4M5 16a3 3 0 0 1 6 0M14 9h4M14 13h4', tone: 'var(--idp-ok)' },
  profile: { icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', tone: 'var(--idp-info)' },
  content: { icon: 'M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6', tone: 'var(--idp-warn)' },
  communication: { icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', tone: 'var(--idp-info)' },
  insights: { icon: 'M4 20V10M10 20V4M16 20v-7M2 20h20', tone: 'var(--idp-bad)' },
  platform: { icon: 'M13 2 3 14h9l-1 8 10-12h-9z', tone: 'var(--idp-muted)' },
};
const BOX = { icon: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', tone: 'var(--idp-muted)' };

const props = {
  name: prop.string(''),
  category: prop.string(''),
  meta: prop.string(''),
  text: prop.string(''),
  scopes: prop.object<string[]>([]),
  availability: prop.string(''),
  approval: prop.string('none'),
  approvalLabel: prop.string(''),
  docs: prop.string(''),
  docsLabel: prop.string('Docs'),
};

export class IdpProductTile extends typedElement(props) {
  protected override render(): unknown {
    const look = () => LOOK[this.category] ?? BOX;
    const logic: ProductTileLogic = {
      name: () => this.name,
      meta: () => this.meta,
      text: () => this.text,
      scopes: () => this.scopes,
      availability: () => this.availability,
      approval: () => this.approval as Approval,
      approvalLabel: () => this.approvalLabel,
      icon: () => look().icon,
      tone: () => look().tone,
      docs: () => this.docs,
      docsLabel: () => this.docsLabel,
    };
    return useView(ProductTileView)(logic);
  }
}

defineCustomElement('idp-product-tile', IdpProductTile);

declare global {
  interface HTMLElementTagNameMap {
    'idp-product-tile': IdpProductTile;
  }
  interface JSXCustomElements {
    'idp-product-tile': ElementAttributes<typeof props>;
  }
}
