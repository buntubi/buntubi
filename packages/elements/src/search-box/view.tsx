/** The default look: one field with a search icon in it. */
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { SearchBoxLogic } from './logic.js';

export const searchBoxView = (s: SearchBoxLogic) => (
  <form
    part="search"
    class="search"
    role="search"
    onSubmit={(event: SubmitEvent) => {
      event.preventDefault();
      s.submit();
    }}
  >
    <style scoped>{`
      .search { max-width: 360px; }
      .icon { display: grid; color: var(--idp-muted); }
    `}</style>
    <Input
      type="search"
      value={() => s.query()}
      aria-label={() => s.label()}
      placeholder={() => s.label()}
      leading={
        <span class="icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-3.5-3.5" />
          </svg>
        </span>
      }
      onInput={(event: Event) => s.edit((event.target as HTMLInputElement).value)}
    />
  </form>
);

export const SearchBoxView = viewToken<SearchBoxLogic>('idp-search-box', searchBoxView);
