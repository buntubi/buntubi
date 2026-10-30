/** The default look: a selectable card, the tick and name on top with the review badge at the end. */
import { For } from '@fluixi/core';
import { Badge } from '@fluixi-ui/badge';
import { Toggle } from '@fluixi-ui/toggle';
import { type Tone } from '../tone.js';
import { viewToken } from '../view.js';
import type { ProductCardLogic } from './logic.js';

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';
const TONE = { none: 'success', review: 'warning', restricted: 'danger' } as const satisfies Record<string, Tone>;

export const productCardView = (p: ProductCardLogic) => (
  <Toggle part="product" data-choice="card" data-card="" class="product" pressed={p.selected()} onChange={() => p.toggle()}>
    <style scoped>{`
      .product { display: block; width: 100%; height: 100%; box-sizing: border-box; padding: 18px; text-align: left; }
      [data-tick] { width: 16px; height: 16px; box-sizing: border-box; display: grid; place-items: center; border: 1.5px solid var(--flx-ui-color-border-strong); border-radius: var(--flx-ui-radius-sm); color: transparent; }
      .product[data-state='on'] [data-tick] { border-color: var(--flx-ui-color-primary); background: var(--flx-ui-color-primary); color: var(--flx-ui-color-primary-fg); }
      .body { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 4px 14px; align-items: start; }
      .body > [data-tick] { margin-top: 2px; }
      .main { display: grid; gap: 8px; }
      .top { display: flex; align-items: center; gap: 8px; }
      .name { font-weight: 600; flex: 1; }
      .text { color: var(--idp-muted); font-size: 13px; }
      .scopes { display: flex; flex-wrap: wrap; gap: 6px; }
      code { font-size: 11.5px; padding: 2px 7px; border-radius: 6px; background: var(--idp-surface-2); border: 1px solid var(--idp-border); }
      .meta { color: var(--idp-muted); font-size: 12.5px; }
    `}</style>
    <span class="body">
      <span data-tick="" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d={CHECK} />
        </svg>
      </span>
      <span class="main">
        <span class="top">
          <span class="name">{() => p.name()}</span>
          <Badge tone={TONE[p.approval()]}>{() => p.approvalLabel()}</Badge>
        </span>
        <span class="text">{() => p.text()}</span>
        <span class="scopes">
          <For each={p.scopes()}>{(scope) => <code>{scope}</code>}</For>
        </span>
        <span class="meta">{() => p.meta()}</span>
      </span>
    </span>
  </Toggle>
);

export const ProductCardView = viewToken<ProductCardLogic>('idp-product-card', productCardView);
