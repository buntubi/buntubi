/** The checks an app must pass to go live, each with the way to fix it, under the reviewer's note. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AppOverview } from '@buntu/sdk/types';
import { useView } from '../view.js';
import { launchChecklistLabels, type CheckKey, type LaunchChecklistLabels, type LaunchChecklistLogic } from './logic.js';
import { LaunchChecklistView } from './view.js';

const props = {
  overview: prop.object<AppOverview | null>(null),
  /** Where each check is fixed. */
  links: prop.object<Partial<Record<CheckKey, string>>>({}),
  /** The reviewer's last note; empty when there is none. */
  note: prop.string(''),
  reviewHref: prop.string(''),
  labels: prop.object<Partial<LaunchChecklistLabels>>({}),
};

export class IdpLaunchChecklist extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...launchChecklistLabels, ...this.labels });
    const named = (field: string) => labels().fields[field] ?? field;
    const logic: LaunchChecklistLogic = {
      labels,
      rows: () =>
        (this.overview?.checks ?? [])
          .filter((check) => check.key !== 'review')
          .map((check) => {
            const done = check.state === 'done';
            return {
              key: check.key,
              state: done ? 'done' : check.required ? 'needed' : 'optional',
              label: labels().checks[check.key],
              detail: done ? '' : check.key === 'permissions' ? check.items.join(', ') : check.items.map(named).join(', '),
              href: this.links[check.key] ?? '',
              action: done ? labels().edit : labels().fix,
            };
          }),
      note: () => this.note,
      reviewHref: () => this.reviewHref,
    };
    return useView(LaunchChecklistView)(logic);
  }
}

defineCustomElement('idp-launch-checklist', IdpLaunchChecklist);

declare global {
  interface HTMLElementTagNameMap {
    'idp-launch-checklist': IdpLaunchChecklist;
  }
  interface JSXCustomElements {
    'idp-launch-checklist': ElementAttributes<typeof props>;
  }
}
