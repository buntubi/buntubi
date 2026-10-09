/**
 * An app's review from the developer's side: what is ready, the submission explaining each
 * sensitive scope, where the review stands and what it said before. Submitting goes through
 * the injected `Developer` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { AppOverview, AppReview, Localized, Product } from '@idp/sdk/types';
import type { CheckKey } from '../launch-checklist/logic.js';
import { useView } from '../view.js';
import { appReviewLabels, type AppReviewLabels, type AppReviewLogic } from './logic.js';
import { AppReviewView } from './view.js';

const props = {
  clientId: prop.string(''),
  overview: prop.object<AppOverview | null>(null),
  reviews: prop.object<AppReview[]>([]),
  /** For the scopes' descriptions. */
  products: prop.object<Product[]>([]),
  links: prop.object<Partial<Record<CheckKey, string>>>({}),
  canPublish: prop.boolean(false),
  /** Field names the provider may list as missing, as the reader names them. */
  fields: prop.object<Record<string, string>>({}),
  locale: prop.string('en'),
  labels: prop.object<Partial<AppReviewLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpAppReview extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...appReviewLabels, ...this.labels });
    // After a rejection the last submission is the starting point: only what was asked changes.
    const last = this.reviews[0];
    const reuse = last && last.decision === 'rejected';
    const justifications = signal<Record<string, string>>(reuse ? { ...last.justifications } : {});
    const instructions = signal(reuse ? last.instructions : '');
    const busy = signal(false);
    const submitted = signal(false);
    const missing = signal<string[]>([]);
    const error = signal<string | null>(null);

    const words = (text: Localized) => (this.locale === 'fr' ? text.fr : text.en) || text.en || text.fr || '';
    const describeScope = (name: string) => {
      for (const product of this.products) {
        const scope = product.scopes.find((entry) => entry.name === name);
        if (scope) return words(scope.descriptions);
      }
      return '';
    };
    const day = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeZone: 'UTC' });
    const date = (iso: string) => day.format(new Date(iso));
    const required = () => (this.overview?.checks ?? []).filter((check) => check.required);
    const stage = () => this.overview?.stage ?? 'draft';

    const logic: AppReviewLogic = {
      labels,
      stage,
      note: () => (stage() === 'changes_requested' ? (this.reviews.find((r) => r.decision === 'rejected')?.note ?? '') : ''),
      percent: () => {
        const all = required();
        return all.length ? Math.round((all.filter((check) => check.state === 'done').length / all.length) * 100) : 100;
      },
      readinessCount: () =>
        labels()
          .readinessCount.replace('{done}', String(required().filter((check) => check.state === 'done').length))
          .replace('{total}', String(required().length)),
      openItems: () =>
        required()
          .filter((check) => check.state !== 'done')
          .map((check) => ({ key: check.key, href: this.links[check.key] ?? null })),
      waiting: () => (this.overview?.scopes.waiting ?? []).map((scope) => ({ scope, description: describeScope(scope) })),
      canSubmit: () =>
        this.canPublish && (stage() === 'draft' || stage() === 'changes_requested') && (this.overview?.scopes.waiting.length ?? 0) > 0,
      justification: (scope) => justifications()[scope] ?? '',
      justify: (scope, text) => {
        justifications.set({ ...justifications(), [scope]: text });
        error.set(null);
      },
      instructions,
      editInstructions: (text) => instructions.set(text),
      submit: async () => {
        busy.set(true);
        error.set(null);
        try {
          const answer = await developer.publishApp({
            client_id: this.clientId,
            justifications: justifications(),
            instructions: instructions(),
          });
          missing.set(answer.missing);
          submitted.set(answer.missing.length === 0);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      submitLabel: () => (stage() === 'changes_requested' ? labels().resubmit : labels().submit),
      submitted,
      missing: () => missing().map((field) => this.fields[field] ?? field),
      history: () =>
        this.reviews.map((review) => ({
          ...review,
          submittedLine: labels()
            .submittedOn.replace('{date}', date(review.submitted_at))
            .replace('{name}', review.submitted_by?.name || review.submitted_by?.email || '?'),
          decidedLine: review.decided_at ? labels().decidedOn.replace('{date}', date(review.decided_at)) : null,
        })),
      busy,
      error,
    };
    return useView(AppReviewView)(logic);
  }
}

defineCustomElement('idp-app-review', IdpAppReview);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-review': IdpAppReview;
  }
  interface JSXCustomElements {
    'idp-app-review': ElementAttributes<typeof props>;
  }
}
