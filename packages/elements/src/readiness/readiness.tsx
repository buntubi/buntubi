/** How far an app is from a review: a ring with the percentage, the required items, the way to submit. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AppOverview } from '@idp/sdk/types';
import { useView } from '../view.js';
import { readinessLabels, type ReadinessLabels, type ReadinessLogic } from './logic.js';
import { ReadinessView } from './view.js';

const props = {
  overview: prop.object<AppOverview | null>(null),
  /** Each check's name. */
  checks: prop.object<Record<string, string>>({}),
  /** Where each check is fixed. */
  links: prop.object<Record<string, string>>({}),
  /** Where the submission is prepared; empty hides the button. */
  submitHref: prop.string(''),
  labels: prop.object<Partial<ReadinessLabels>>({}),
};

export class IdpReadiness extends typedElement(props) {
  protected override render(): unknown {
    const required = () => (this.overview?.checks ?? []).filter((check) => check.required && check.key !== 'review');
    const done = () => required().filter((check) => check.state === 'done').length;
    const logic: ReadinessLogic = {
      labels: () => ({ ...readinessLabels, ...this.labels }),
      percent: () => (required().length ? Math.round((done() / required().length) * 100) : 100),
      left: () => required().length - done(),
      items: () =>
        required().map((check) => ({
          key: check.key,
          label: this.checks[check.key] ?? check.key,
          done: check.state === 'done',
          href: this.links[check.key] ?? '',
        })),
      canSubmit: () => required().every((check) => check.state === 'done'),
      submitHref: () => this.submitHref,
    };
    return useView(ReadinessView)(logic);
  }
}

defineCustomElement('idp-readiness', IdpReadiness);

declare global {
  interface HTMLElementTagNameMap {
    'idp-readiness': IdpReadiness;
  }
  interface JSXCustomElements {
    'idp-readiness': ElementAttributes<typeof props>;
  }
}
