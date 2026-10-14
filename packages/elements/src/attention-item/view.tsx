/** The default look: the dot, then the title over a muted line, the whole a link. */
import { Show } from '@fluixi/core';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { AttentionItemLogic } from './logic.js';

const TONE = { warn: 'var(--idp-warn)', bad: 'var(--idp-bad)', info: 'var(--idp-info)', ok: 'var(--idp-ok)' } as const;

export const attentionItemView = (a: AttentionItemLogic) => (
  <div part="attention" class="item" style={() => `--tone: ${TONE[a.tone()]}`}>
    <style scoped>{`
      .item > :deep(a), .item > .plain { display: grid; grid-template-columns: 8px minmax(0, 1fr); gap: 2px 12px; padding: 10px; border-radius: 9px; color: var(--idp-text); text-decoration: none; }
      .item > :deep(a:hover) { background: var(--idp-surface-2); }
      .dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; background: var(--tone); }
      .title { font-weight: 500; }
      .text { grid-column: 2; color: var(--idp-muted); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    `}</style>
    <Show
      when={a.href()}
      fallback={
        <div class="plain">
          <span class="dot" aria-hidden="true" />
          <span class="title">{() => a.title()}</span>
          <span class="text">{() => a.text()}</span>
        </div>
      }
    >
      <Link href={a.href()}>
        <span class="dot" aria-hidden="true" />
        <span class="title">{() => a.title()}</span>
        <span class="text">{() => a.text()}</span>
      </Link>
    </Show>
  </div>
);

export const AttentionItemView = viewToken<AttentionItemLogic>('idp-attention-item', attentionItemView);
