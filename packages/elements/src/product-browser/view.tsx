/** The default look: a search and the category filter, then three product tiles to a row. */
import { For, Show } from '@fluixi/core';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { ProductBrowserLogic } from './logic.js';

const SEARCH = 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-3.5-3.5';

export const productBrowserView = (b: ProductBrowserLogic) => (
  <div part="products" class="browser">
    <style scoped>{`
      .browser { display: grid; gap: 18px; }
      .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
      .search { position: relative; flex: 0 1 380px; }
      .search svg { position: absolute; left: 12px; top: 50%; translate: 0 -50%; color: var(--idp-muted); pointer-events: none; }
      .search :deep([data-input]) { padding-left: 36px; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .grid > :deep(idp-product-tile) { display: block; }
      .empty { margin: 0; color: var(--idp-muted); }
      @media (max-width: 1100px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } .search { flex-basis: 100%; } }
    `}</style>
    <div class="bar">
      <label class="search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d={SEARCH} />
        </svg>
        <Input
          type="search"
          value={() => b.query()}
          placeholder={() => b.labels().search}
          aria-label={() => b.labels().search}
          onInput={(event: Event) => b.search((event.target as HTMLInputElement).value)}
        />
      </label>
      <Show when={b.categories().length > 2}>
        <idp-segmented
          options={b.categories()}
          value={b.category()}
          label={b.labels().all}
          onChange={(event) => b.choose(event.detail.value)}
        />
      </Show>
    </div>
    <Show when={b.total()} fallback={<p class="empty">{() => b.labels().empty}</p>}>
      <Show when={b.products().length} fallback={<p class="empty">{() => b.labels().noMatch}</p>}>
        <div class="grid">
          <For each={b.products()} by={(card) => card.slug}>
            {(card) => (
              <idp-product-tile
                name={card().name}
                category={card().category}
                meta={[b.labels().categories[card().category] ?? card().category, card().auth].filter(Boolean).join(' · ')}
                text={card().description}
                scopes={card().scopes}
                availability={b.labels().availability[card().availability]}
                approval={card().approval}
                approvalLabel={b.labels().approval[card().approval]}
                docs={card().docs ?? ''}
                docsLabel={b.labels().docs}
              />
            )}
          </For>
        </div>
      </Show>
    </Show>
  </div>
);

export const ProductBrowserView = viewToken<ProductBrowserLogic>('idp-product-browser', productBrowserView);
