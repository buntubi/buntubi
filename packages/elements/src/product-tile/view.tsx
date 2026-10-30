/** The default look: icon, name and badge on top, the text and scopes, a ruled footer. */
import { For, Show } from '@fluixi/core';
import { Badge } from '@fluixi-ui/badge';
import { Card } from '@fluixi-ui/card';
import { toneColor, type Tone } from '../tone.js';
import { viewToken } from '../view.js';
import type { ProductTileLogic } from './logic.js';

const TONE = { none: 'success', review: 'warning', restricted: 'danger' } as const satisfies Record<string, Tone>;

export const productTileView = (p: ProductTileLogic) => (
  <Card part="product" class="tile">
    <style scoped>{`
      .tile { box-sizing: border-box; height: 100%; display: flex; flex-direction: column; gap: 14px; padding: 18px; }
      .top { display: flex; align-items: center; gap: 12px; }
      .icon { flex: none; width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
      .title { flex: 1; display: grid; min-width: 0; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .meta { color: var(--idp-muted); font-size: 12.5px; }
      p { margin: 0; color: var(--idp-muted); }
      .scopes { display: flex; flex-wrap: wrap; gap: 6px; }
      code { font-size: 11.5px; padding: 1px 7px; border-radius: 6px; background: var(--idp-surface-2); border: 1px solid var(--idp-border); }
      .foot { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--idp-border); display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
      .need { display: inline-flex; align-items: center; gap: 6px; color: var(--need); }
      .need::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      a { color: var(--idp-accent-ink); font-weight: 500; text-decoration: none; }
    `}</style>
    <div class="top">
      <span class="icon" style={() => `--tone: ${p.tone()}`} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d={p.icon()} />
        </svg>
      </span>
      <span class="title">
        <h2>{() => p.name()}</h2>
        <span class="meta">{() => p.meta()}</span>
      </span>
      <Badge variant="outline">{() => p.availability()}</Badge>
    </div>
    <p>{() => p.text()}</p>
    <div class="scopes">
      <For each={p.scopes()}>{(scope) => <code>{scope}</code>}</For>
    </div>
    <div class="foot">
      <span class="need" style={() => `--need: ${toneColor(TONE[p.approval()])}`}>
        {() => p.approvalLabel()}
      </span>
      <Show when={p.docs()}>
        {/* Documentation lives outside the portal: an ordinary link that leaves the app. */}
        <a href={p.docs()} target="_blank" rel="noopener">
          {() => p.docsLabel()}
        </a>
      </Show>
    </div>
  </Card>
);

export const ProductTileView = viewToken<ProductTileLogic>('idp-product-tile', productTileView);
