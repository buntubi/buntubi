/** The default look: a selectable card, the tick and name on top with the review badge at the end. */
import { For } from '@fluixi/core';
import { Toggle } from '@fluixi-ui/toggle';
import { viewToken } from '../view.js';
import type { ProductCardLogic } from './logic.js';

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';
const TONE = { none: 'var(--idp-ok)', review: 'var(--idp-warn)', restricted: 'var(--idp-bad)' } as const;

export const productCardView = (p: ProductCardLogic) => (
  <Toggle part="product" data-choice="card" class="product" pressed={p.selected()} onChange={() => p.toggle()}>
    <style scoped>{`
      .product { height: 100%; box-sizing: border-box; }
      .body { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 4px 14px; align-items: start; }
      .body > [data-tick] { margin-top: 2px; }
      .main { display: grid; gap: 8px; }
      .top { display: flex; align-items: center; gap: 8px; }
      .name { font-weight: 600; flex: 1; }
      .badge { padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 13%, transparent); }
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
          <span class="badge" style={() => `--tone: ${TONE[p.approval()]}`}>
            {() => p.approvalLabel()}
          </span>
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
