/** The default look of idp-organization-select: the account list's rows, one per organization. */
import { For } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { initials } from '../shared/initials.js';
import { TONES } from '../account-select/account-select.js';
import { viewToken } from '@buntubi/sdk/view';
import type { OrganizationSelectLogic } from './organization-select.js';

export const organizationSelectView = ({ busy, choose, label, organizations }: OrganizationSelectLogic) => (
  <ul class="idp-accounts">
    <For each={organizations()}>
      {(organization, index) => (
        <li>
          <Button
            variant="ghost"
            tone="neutral"
            class="idp-account"
            aria-busy={() => (busy() === organization.id ? 'true' : 'false')}
            disabled={busy() !== null}
            onPress={() => choose(organization.id)}
          >
            <span class="idp-account-avatar" data-tone={TONES[index() % TONES.length]} aria-hidden="true">
              {initials(organization.name)}
            </span>
            <span class="idp-account-text">
              <span class="idp-account-name">{organization.name}</span>
            </span>
            <span class="idp-account-state">{() => label().roles[organization.role] ?? organization.role}</span>
          </Button>
        </li>
      )}
    </For>
  </ul>
);

export const OrganizationSelectView = viewToken<OrganizationSelectLogic>('idp-organization-select', organizationSelectView);
