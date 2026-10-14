/** The default look: a tinted aside holding a small white consent card, then the note. */
import { Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ConsentPreviewLogic } from './logic.js';

export const consentPreviewView = (c: ConsentPreviewLogic) => (
  <aside part="consent-preview" class="aside" aria-label={() => c.title()}>
    <style scoped>{`
      .aside { display: grid; gap: 12px; padding: 18px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface-2); }
      .label { font-size: 12.5px; color: var(--idp-muted); }
      .screen { display: grid; gap: 10px; justify-items: start; padding: 16px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); }
      .mark { width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center; font-weight: 700; color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 16%, var(--idp-surface)); overflow: hidden; }
      .mark img { width: 100%; height: 100%; object-fit: cover; }
      .ask { font-weight: 600; line-height: 1.4; }
      .links { font-size: 12.5px; color: var(--idp-muted); }
      .buttons { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
      .buttons span { height: 32px; border-radius: 8px; border: 1px solid var(--idp-border-2); }
      .buttons span + span { border: 0; background: var(--idp-accent); }
      p { margin: 0; font-size: 12.5px; color: var(--idp-muted); line-height: 1.45; }
    `}</style>
    <span class="label">{() => c.title()}</span>
    <div class="screen">
      <span class="mark" aria-hidden="true">
        <Show when={c.logo()} fallback={c.mark()}>
          <img src={c.logo()} alt="" />
        </Show>
      </span>
      <span class="ask">{() => c.text()}</span>
      <span class="links">{() => c.links()}</span>
      {/* The consent screen's two answers, drawn: the preview is not a place to press them. */}
      <span class="buttons" aria-hidden="true">
        <span />
        <span />
      </span>
    </div>
    <Show when={c.note()}>
      <p>{() => c.note()}</p>
    </Show>
  </aside>
);

export const ConsentPreviewView = viewToken<ConsentPreviewLogic>('idp-consent-preview', consentPreviewView);
