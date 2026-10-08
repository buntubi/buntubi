/**
 * Where an app stands on its way to live, what it still needs, and the request to go live.
 * Going live goes through the injected `Developer` service; the host refreshes what it
 * invalidates.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { AppOverview } from '@idp/sdk/types';
import { useView } from '../view.js';
import { launchPathLabels, stepsOf, type CheckKey, type LaunchPathLabels, type LaunchPathLogic } from './logic.js';
import { LaunchPathView } from './view.js';

const props = {
  clientId: prop.string(''),
  overview: prop.object<AppOverview | null>(null),
  /** Where each check's fix is, by check. */
  links: prop.object<Partial<Record<CheckKey, string>>>({}),
  /** Whether this member may ask for the app to go live. */
  canPublish: prop.boolean(false),
  labels: prop.object<Partial<LaunchPathLabels>>({}),
  /** Words a refusal for the reader; the generic label when absent. */
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class DpLaunchPath extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const busy = signal(false);
    const error = signal<string | null>(null);
    const missing = signal<string[]>([]);
    const labels = () => ({ ...launchPathLabels, ...this.labels });
    const steps = () => (this.overview ? stepsOf(this.overview) : []);
    const named = (field: string) => labels().fields[field] ?? field;

    const logic: LaunchPathLogic = {
      labels,
      steps,
      position: () => {
        const at = steps().findIndex((step) => step.state !== 'done');
        return at === -1 ? steps().length : at + 1;
      },
      checklist: () =>
        (this.overview?.checks ?? [])
          .filter((check) => check.key !== 'review')
          .map((check) => ({
            key: check.key,
            state: check.state,
            required: check.required,
            detail: check.key === 'permissions' ? check.items.join(', ') : check.items.map(named).join(', '),
            href: this.links[check.key] ?? null,
          })),
      action: () => {
        const stage = this.overview?.stage;
        if (stage !== 'draft' && stage !== 'changes_requested') return null;
        return (this.overview?.scopes.waiting.length ?? 0) > 0 ? labels().submit : labels().goLive;
      },
      status: () =>
        this.overview?.stage === 'live' ? labels().live : this.overview?.stage === 'in_review' ? labels().inReview : null,
      canPublish: () => this.canPublish,
      busy,
      error,
      missing: () => missing().map(named),
      publish: async () => {
        busy.set(true);
        error.set(null);
        try {
          missing.set((await developer.publishApp(this.clientId)).missing);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
    };
    return useView(LaunchPathView)(logic);
  }
}

defineCustomElement('dp-launch-path', DpLaunchPath);

declare global {
  interface HTMLElementTagNameMap {
    'dp-launch-path': DpLaunchPath;
  }
  interface JSXCustomElements {
    'dp-launch-path': ElementAttributes<typeof props>;
  }
}
