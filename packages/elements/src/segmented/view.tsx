/** The default look: a fluixi-ui toggle group the skin draws as a track with the pick raised. */
import { For, Show } from '@fluixi/core';
import { ToggleGroup, ToggleGroupItem } from '@fluixi-ui/toggle-group';
import { viewToken } from '../view.js';
import type { SegmentedLogic } from './logic.js';

export const segmentedView = (s: SegmentedLogic) => (
  <ToggleGroup
    part="segmented"
    data-segmented=""
    data-size={s.size()}
    type="single"
    value={s.value()}
    aria-label={() => s.label()}
    onChange={(value: string) => s.choose(value)}
  >
    <style scoped>{`
      .dot { width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; display: inline-block; }
      .count { margin-left: 5px; color: var(--idp-muted); font-weight: 400; }
    `}</style>
    <For each={s.options()} by={(option) => option.value}>
      {(option) => (
        <ToggleGroupItem value={option().value}>
          <Show when={option().dot}>
            <span class="dot" style={() => `background: ${option().dot}`} aria-hidden="true" />
          </Show>
          {() => option().label}
          <Show when={option().count !== undefined}>
            <span class="count">{() => String(option().count)}</span>
          </Show>
        </ToggleGroupItem>
      )}
    </For>
  </ToggleGroup>
);

export const SegmentedView = viewToken<SegmentedLogic>('idp-segmented', segmentedView);
