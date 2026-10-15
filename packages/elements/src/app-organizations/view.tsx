/** The default look: one card, the choice as a select, what it means under it. */
import { For, Show } from '@fluixi/core';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import type { OrganizationUsage } from '@buntubi/sdk/types';
import { viewToken } from '../view.js';
import { USAGES, type AppOrganizationsLogic } from './logic.js';

export const appOrganizationsView = (s: AppOrganizationsLogic) => (
  <div part="organizations" class="card">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 20px; display: grid; gap: 14px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .hint { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .intro { display: grid; gap: 4px; }
      .choice { display: grid; gap: 6px; max-width: 360px; }
      .meaning { margin: 0; color: var(--idp-muted); font-size: 12.5px; }
      .ok { color: var(--idp-ok); font-size: 13px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
    `}</style>
    <div class="intro">
      <h2>{() => s.labels().title}</h2>
      <p class="hint">{() => s.labels().intro}</p>
    </div>
    <div class="choice">
      <Select
        value={String(s.usage())}
        labels={(value: string) => s.labels().choices[value as OrganizationUsage].name}
        onChange={(value: string) => s.choose(value as OrganizationUsage)}
        disabled={!s.canEdit() || s.busy()}
      >
        <SelectTrigger aria-label={() => s.labels().usage}>
          <SelectValue />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            <For each={USAGES}>{(usage) => <SelectItem value={usage}>{() => s.labels().choices[usage].name}</SelectItem>}</For>
          </SelectContent>
        </SelectPortal>
      </Select>
      <p class="meaning">{() => s.labels().choices[s.usage()].text}</p>
    </div>
    <Show when={s.saved()}>
      <span class="ok" role="status">{() => s.labels().saved}</span>
    </Show>
    <Show when={s.error()}>
      <p class="alert" role="alert">
        {() => s.error()}
      </p>
    </Show>
  </div>
);

export const AppOrganizationsView = viewToken<AppOrganizationsLogic>('idp-app-organizations', appOrganizationsView);
