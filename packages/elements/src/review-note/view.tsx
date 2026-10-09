/** The default look: a warm callout with the note under its title. */
import { Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ReviewNoteLogic } from './logic.js';

export const reviewNoteView = (n: ReviewNoteLogic) => (
  <Show when={n.note()}>
    <section part="note" class="note" role="note">
      <style scoped>{`
        .note { border: 1px solid color-mix(in srgb, var(--idp-warn) 40%, transparent); border-radius: var(--idp-radius); background: color-mix(in srgb, var(--idp-warn) 8%, var(--idp-surface)); padding: 14px 18px; display: grid; gap: 6px; }
        p { margin: 0; font-size: 13.5px; }
      `}</style>
      <strong>{() => n.title()}</strong>
      <p>{() => n.note()}</p>
    </section>
  </Show>
);

export const ReviewNoteView = viewToken<ReviewNoteLogic>('ReviewNoteView', reviewNoteView);
