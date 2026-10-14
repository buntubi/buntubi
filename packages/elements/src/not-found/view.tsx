/** The default look: a heading, a line, the way back. */
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { NotFoundLogic } from './logic.js';

export const notFoundView = (n: NotFoundLogic) => (
  <main part="not-found" class="missing">
    <style scoped>{`
      .missing { max-width: 640px; margin: 0 auto; padding: 72px 24px; display: grid; gap: 12px; }
      h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
      p { margin: 0; color: var(--idp-muted); }
      .missing :deep(a) { color: var(--idp-accent-ink); font-weight: 500; text-decoration: none; }
    `}</style>
    <h1>{() => n.labels().title}</h1>
    <p>{() => n.labels().text}</p>
    <div>
      <Link href={n.href()}>{() => n.labels().back}</Link>
    </div>
  </main>
);

export const NotFoundView = viewToken<NotFoundLogic>('idp-not-found', notFoundView);
