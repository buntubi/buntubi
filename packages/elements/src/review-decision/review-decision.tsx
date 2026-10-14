/**
 * One app's review for the platform owner: the app as people will see it, what it asks for and
 * why, its history, and the answer, through the injected `Admin` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Admin } from '@buntu/sdk/admin';
import type { Localized, ReviewRequest } from '@buntu/sdk/types';
import { useView } from '../view.js';
import { reviewDecisionLabels, type ReviewDecisionLabels, type ReviewDecisionLogic } from './logic.js';
import { ReviewDecisionView } from './view.js';

const props = {
  review: prop.object<ReviewRequest | null>(null),
  /** The scope catalogue, for what each scope means. */
  scopes: prop.object<{ name: string; descriptions: Localized }[]>([]),
  /** The platform's name, for the consent preview. */
  platform: prop.string(''),
  locale: prop.string('en'),
  labels: prop.object<Partial<ReviewDecisionLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpReviewDecision extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...reviewDecisionLabels, ...this.labels });
    const note = signal('');
    const busy = signal(false);
    const done = signal(false);
    const error = signal<string | null>(null);
    const words = (text: Localized) => (this.locale === 'fr' ? text.fr : text.en) || text.en || text.fr || '';
    const describeScope = (name: string) => {
      const scope = this.scopes.find((entry) => entry.name === name);
      return scope ? words(scope.descriptions) : '';
    };
    const day = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
    const open = () => {
      const latest = this.review?.history[0];
      return latest && latest.decision === 'pending' ? latest : null;
    };
    const pending = () => this.review?.review_status === 'pending';

    const logic: ReviewDecisionLogic = {
      labels,
      review: () => this.review,
      platform: () => this.platform,
      pending,
      requested: () => {
        const asked = open()?.scopes ?? this.review?.sensitive_scopes ?? [];
        return asked.map((scope) => ({
          scope,
          description: describeScope(scope),
          justification: open()?.justifications[scope] ?? '',
        }));
      },
      instructions: () => open()?.instructions ?? '',
      history: () =>
        (this.review?.history ?? []).map((entry) => ({
          ...entry,
          submittedLine: labels()
            .submittedOn.replace('{date}', day.format(new Date(entry.submitted_at)))
            .replace('{name}', entry.submitted_by?.name || entry.submitted_by?.email || '?'),
          decidedLine: entry.decided_at
            ? labels()
                .decidedOn.replace('{date}', day.format(new Date(entry.decided_at)))
                .replace('{name}', entry.decided_by?.name || entry.decided_by?.email || '?')
            : null,
        })),
      note,
      editNote: (text) => {
        note.set(text);
        error.set(null);
      },
      canReject: () => note().trim().length > 0,
      decide: async (approve) => {
        const review = this.review;
        if (!review) return;
        busy.set(true);
        error.set(null);
        try {
          await admin.review({ client_id: review.client_id, approve, note: note().trim() });
          done.set(true);
          this.emit('decided', { client_id: review.client_id, approve });
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      done,
      error,
    };
    return useView(ReviewDecisionView)(logic);
  }
}

defineCustomElement('idp-review-decision', IdpReviewDecision);

declare global {
  interface HTMLElementTagNameMap {
    'idp-review-decision': IdpReviewDecision;
  }
  interface JSXCustomElements {
    'idp-review-decision': ElementAttributes<typeof props>;
  }
}
