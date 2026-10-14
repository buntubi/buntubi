/**
 * Submitting an app for review: the completed items, one `idp-scope-justification` per scope
 * waiting on the review, and how a reviewer can try the app. Sent through the injected
 * `Developer` service. After a rejection the last submission is the starting point.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@buntu/sdk/developer';
import type { AppOverview, AppReview, Localized, Product } from '@buntu/sdk/types';
import '../scope-justification/scope-justification.js';
import { useView } from '../view.js';
import {
  reviewSubmissionLabels,
  type ReviewSubmissionEvents,
  type ReviewSubmissionLabels,
  type ReviewSubmissionLogic,
} from './logic.js';
import { ReviewSubmissionView } from './view.js';

const props = {
  clientId: prop.string(''),
  overview: prop.object<AppOverview | null>(null),
  /** The latest first. */
  reviews: prop.object<AppReview[]>([]),
  products: prop.object<Product[]>([]),
  canPublish: prop.boolean(false),
  /** Field names as the reader knows them, for what is still missing. */
  fields: prop.object<Record<string, string>>({}),
  locale: prop.string('en'),
  labels: prop.object<Partial<ReviewSubmissionLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpReviewSubmission extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...reviewSubmissionLabels, ...this.labels });
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
    const waiting = () => (this.overview?.scopes.waiting ?? []).map((scope) => ({ scope, description: describeScope(scope) }));
    const explained = () => waiting().filter((entry) => (justifications()[entry.scope] ?? '').trim()).length;
    const stage = () => this.overview?.stage ?? 'draft';
    const logic: ReviewSubmissionLogic = {
      labels,
      completed: () =>
        (this.overview?.checks ?? [])
          .filter((check) => check.state === 'done' && check.key !== 'review' && check.key !== 'permissions')
          .map((check) => ({ key: check.key, label: labels().checks[check.key], detail: '' })),
      waiting,
      explainedLine: () =>
        labels().explained.replace('{done}', String(explained())).replace('{total}', String(waiting().length)),
      allExplained: () => explained() === waiting().length,
      justification: (scope) => justifications()[scope] ?? '',
      justify: (scope, text) => {
        justifications.set({ ...justifications(), [scope]: text });
        error.set(null);
      },
      instructions,
      editInstructions: (text) => instructions.set(text),
      canSubmit: () => this.canPublish && (stage() === 'draft' || stage() === 'changes_requested') && waiting().length > 0,
      submitLabel: () => (stage() === 'changes_requested' ? labels().resubmit : labels().submit),
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
          if (answer.missing.length === 0) {
            submitted.set(true);
            this.emit('submitted', {});
          }
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      submitted,
      missing: () => missing().map((field) => this.fields[field] ?? field),
      busy,
      error,
    };
    return useView(ReviewSubmissionView)(logic);
  }
}

defineCustomElement('idp-review-submission', IdpReviewSubmission);

declare global {
  interface HTMLElementTagNameMap {
    'idp-review-submission': IdpReviewSubmission;
  }
  interface JSXCustomElements {
    'idp-review-submission': ElementAttributes<typeof props, ReviewSubmissionEvents>;
  }
}
