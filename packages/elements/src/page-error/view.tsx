/** The page error's default look: a heading, the message, the retry. */
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { PageErrorLogic } from './logic.js';

export const pageErrorView = (e: PageErrorLogic) => (
  <section part="page-error" class="error" role="alert">
    <style scoped>{`
      .error { max-width: 560px; display: grid; gap: 12px; padding: 24px 0; }
      h1 { margin: 0; font-size: 22px; font-weight: 600; }
      p { margin: 0; color: var(--idp-muted); }
    `}</style>
    <h1>{() => e.labels().title}</h1>
    <p>{() => e.message()}</p>
    <div>
      <Button variant="outline" tone="neutral" onPress={e.retry}>
        {() => e.labels().retry}
      </Button>
    </div>
  </section>
);

export const PageErrorView = viewToken<PageErrorLogic>('idp-page-error', pageErrorView);
