/** The default look: a card, the note as a warm callout, then one ruled row per check. */
import { For, Show } from '@fluixi/core';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { LaunchChecklistLogic } from './logic.js';

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';
const WARNING = 'M12 3 2 20h20L12 3zM12 10v4M12 17h.01';

export const launchChecklistView = (c: LaunchChecklistLogic) => (
  <section part="checklist" class="card" aria-labelledby="idp-checklist-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px 22px; display: grid; gap: 16px; align-content: start; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .note { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 4px 12px; padding: 14px 16px; border: 1px solid color-mix(in srgb, var(--idp-warn) 45%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--idp-warn) 9%, var(--idp-surface)); }
      .note svg { color: var(--idp-warn); margin-top: 1px; }
      .note strong { font-weight: 600; }
      .note p { grid-column: 2; margin: 0; }
      .note :deep(a) { grid-column: 2; color: var(--idp-accent-ink); font-weight: 500; text-decoration: none; }
      ul { list-style: none; margin: 0; padding: 0; }
      li { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 11px 0; border-top: 1px solid var(--idp-border); }
      .icon { width: 20px; height: 20px; box-sizing: border-box; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 700; border: 1.5px solid var(--idp-border-2); }
      [data-state='done'] .icon { border: 0; color: var(--idp-ok); background: color-mix(in srgb, var(--idp-ok) 14%, transparent); }
      [data-state='needed'] .icon { border: 0; color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 14%, transparent); }
      .text { display: grid; gap: 2px; min-width: 0; }
      .detail { color: var(--idp-muted); font-size: 12.5px; }
      li :deep(a) { color: var(--idp-accent-ink); font-size: 13px; font-weight: 500; text-decoration: none; }
    `}</style>
    <h2 id="idp-checklist-title">{() => c.labels().title}</h2>
    <Show when={c.note()}>
      <div class="note" role="note">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d={WARNING} />
        </svg>
        <strong>{() => c.labels().feedback}</strong>
        <p>{() => c.note()}</p>
        <Show when={c.reviewHref()}>
          <Link href={c.reviewHref()}>{() => c.labels().openReview}</Link>
        </Show>
      </div>
    </Show>
    <ul>
      <For each={c.rows()} by={(row) => row.key}>
        {(row) => (
          <li data-state={() => row().state}>
            <span class="icon" aria-hidden="true">
              <Show when={row().state === 'done'} fallback={row().state === 'needed' ? '!' : ''}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d={CHECK} />
                </svg>
              </Show>
            </span>
            <span class="text">
              <span>{() => row().label}</span>
              <Show when={row().detail}>
                <span class="detail">{() => row().detail}</span>
              </Show>
            </span>
            <Show when={row().href} fallback={<span />}>
              <Link href={row().href}>{() => row().action}</Link>
            </Show>
          </li>
        )}
      </For>
    </ul>
  </section>
);

export const LaunchChecklistView = viewToken<LaunchChecklistLogic>('idp-launch-checklist', launchChecklistView);
