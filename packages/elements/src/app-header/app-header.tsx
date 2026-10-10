/**
 * The head of an app's overview: its mark, name and stage, its ID and kind, and the next step:
 * the review page when sensitive scopes wait, going live through the injected `Developer`
 * service otherwise.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { App, AppOverview } from '@idp/sdk/types';
import { useView } from '../view.js';
import { appHeaderLabels, type AppHeaderLabels, type AppHeaderLogic } from './logic.js';
import { AppHeaderView } from './view.js';

const props = {
  app: prop.object<App | null>(null),
  overview: prop.object<AppOverview | null>(null),
  /** Whether this member may take the app live. */
  canPublish: prop.boolean(false),
  /** Where a review is prepared. */
  reviewHref: prop.string(''),
  labels: prop.object<Partial<AppHeaderLabels>>({}),
  /** Field names as the reader knows them, for what is still missing. */
  fields: prop.object<Record<string, string>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpAppHeader extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...appHeaderLabels, ...this.labels });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const missing = signal<string[]>([]);
    const stage = () => this.overview?.stage ?? 'draft';
    const logic: AppHeaderLogic = {
      labels,
      name: () => this.app?.name ?? '',
      mark: () => (this.app?.name.trim()[0] ?? 'A').toUpperCase(),
      logo: () => (/^https:\/\//.test(this.app?.brand.logo ?? '') ? (this.app?.brand.logo ?? '') : ''),
      clientId: () => this.app?.client_id ?? '',
      kind: () => (this.app ? labels().kinds[this.app.kind] : ''),
      environment: () => (this.app ? labels().environments[this.app.environment] : ''),
      stage,
      stageLabel: () => labels().stages[stage()],
      firstParty: () => this.app?.first_party ?? false,
      action: () => {
        if (!this.canPublish || (stage() !== 'draft' && stage() !== 'changes_requested')) return null;
        const resubmit = stage() === 'changes_requested';
        if ((this.overview?.scopes.waiting.length ?? 0) > 0 || resubmit) {
          return { label: resubmit ? labels().resubmit : labels().submit, href: this.reviewHref };
        }
        return { label: labels().goLive, href: '' };
      },
      publish: async () => {
        busy.set(true);
        error.set(null);
        try {
          missing.set((await developer.publishApp({ client_id: this.app?.client_id ?? '' })).missing);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      error,
      missing: () => missing().map((field) => this.fields[field] ?? field),
    };
    return useView(AppHeaderView)(logic);
  }
}

defineCustomElement('idp-app-header', IdpAppHeader);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-header': IdpAppHeader;
  }
  interface JSXCustomElements {
    'idp-app-header': ElementAttributes<typeof props>;
  }
}
