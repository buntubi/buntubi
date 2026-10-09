/** The default look: the field, the button beside it. */
import { Button } from '@fluixi-ui/button';
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
      .search { display: grid; grid-template-columns: minmax(0, 420px) max-content; justify-content: start; gap: 8px; }
      @media (max-width: 640px) { .search { grid-template-columns: 1fr; } }
    `}</style>
    <Input
      type="search"
      value={() => s.query()}
      aria-label={() => s.label()}
      placeholder={() => s.label()}
      onInput={(event: Event) => s.edit((event.target as HTMLInputElement).value)}
    />
    <Button type="submit" variant="outline" tone="neutral">
      {() => s.button()}
    </Button>
  </form>
);

export const SearchBoxView = viewToken<SearchBoxLogic>('SearchBoxView', searchBoxView);
