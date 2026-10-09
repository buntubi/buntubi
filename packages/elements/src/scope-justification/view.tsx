/** The default look: a tinted box, the scope and its status, the question and the answer field. */
import { Show } from '@fluixi/core';
import { Textarea } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { ScopeJustificationLogic } from './logic.js';

export const scopeJustificationView = (j: ScopeJustificationLogic) => (
  <div part="justification" class="box" data-explained={() => (j.explained() ? '' : undefined)}>
    <style scoped>{`
      .box { display: grid; gap: 10px; padding: 16px; border-radius: 10px; background: var(--idp-surface-2); }
      .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
      code { font-weight: 500; }
      .status { font-size: 12.5px; font-weight: 500; color: var(--idp-warn); }
      .box[data-explained] .status { color: var(--idp-ok); }
      .description { margin: 0; color: var(--idp-muted); font-size: 13px; }
      label { display: grid; gap: 6px; font-size: 13px; font-weight: 500; }
      .hint { font-weight: 400; color: var(--idp-muted); font-size: 12.5px; }
    `}</style>
    <div class="head">
      <code>{() => j.scope()}</code>
      <span class="status">{() => j.status()}</span>
    </div>
    <Show when={j.description()}>
      <p class="description">{() => j.description()}</p>
    </Show>
    <label>
      {() => j.question()}
      <Textarea rows={3} value={() => j.value()} onInput={(event: Event) => j.edit((event.target as HTMLTextAreaElement).value)} />
      <Show when={j.hint()}>
        <span class="hint">{() => j.hint()}</span>
      </Show>
    </label>
  </div>
);

export const ScopeJustificationView = viewToken<ScopeJustificationLogic>('ScopeJustificationView', scopeJustificationView);
