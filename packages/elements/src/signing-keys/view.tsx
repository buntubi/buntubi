import { Card } from '@fluixi-ui/card';
/** The default look: a card, the text, the key set's address as a request line. */
import { viewToken } from '../view.js';
import type { SigningKeysLogic } from './logic.js';

export const signingKeysView = (s: SigningKeysLogic) => (
  <Card part="signing-keys" class="card" aria-labelledby="idp-signing-title" role="region">
    <style scoped>{`
      .card { padding: 20px; display: grid; gap: 12px; align-content: start; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      p { margin: 0; color: var(--idp-muted); }
      code { display: block; padding: 10px 12px; border-radius: 9px; border: 1px solid var(--idp-border); background: var(--idp-surface-2); font-size: 12.5px; overflow-wrap: anywhere; }
    `}</style>
    <h2 id="idp-signing-title">{() => s.labels().title}</h2>
    <p>{() => s.labels().text}</p>
    <code>{() => `GET ${s.jwksUrl()}`}</code>
  </Card>
);

export const SigningKeysView = viewToken<SigningKeysLogic>('idp-signing-keys', signingKeysView);
