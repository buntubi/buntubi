/** Apps waiting for the owner: what they ask for, where their policies are, the decision. */
import { action, cache, useRouteData, useSubmission } from '@fluixi/start/router';
import { Badge } from '@fluixi-ui/badge';
import { Button } from '@fluixi-ui/button';
import { Card, CardBody } from '@fluixi-ui/card';
import { Input } from '@fluixi-ui/input';
import { Field, valueOf } from '../components/field.js';
import { errorText, t } from '../lib/i18n.js';
import type { Review } from '../lib/types.js';
import { loadReviews, reviewApp } from '../server/admin.js';
import { settle } from '../lib/settle.js';

const reviews = cache(() => loadReviews(), 'reviews');
export const routeData = () => reviews();

const decide = action(
  (input: { clientId: string; approve: boolean; note: string }) => reviewApp(input),
  'review.decide',
  { invalidates: ['reviews', 'overview'] },
);

export default function ReviewsPage() {
  const data = useRouteData<Review[]>();
  return (
    <section>
      <h1>{() => t('reviews.title')}</h1>
      <Show when={(data() ?? []).length} fallback={<p class="muted">{() => t('reviews.empty')}</p>}>
        <For each={data() ?? []}>{(review) => <ReviewCard review={review} />}</For>
      </Show>
    </section>
  );
}

function ReviewCard(props: { review: Review }) {
  const review = props.review;
  const note = $signal('');
  const submission = useSubmission(decide);
  const mine = () => (submission()?.input as { clientId?: string } | undefined)?.clientId === review.client_id;
  const answer = (approve: boolean) => decide({ clientId: review.client_id, approve, note: note().trim() });
  return (
    <Card class="panel">
      <CardBody>
        <div class="title-row">
          <h2>{review.name}</h2>
          <code class="mono muted">{review.client_id}</code>
        </div>
        <p class="muted">
          {`${review.organization?.name ?? ''} ${t('reviews.by')} ${review.owner?.name || review.owner?.email || ''}`}
          {review.organization?.support_email ? ` · ${review.organization.support_email}` : ''}
        </p>
        <Field label={t('reviews.sensitive')}>
          <span class="badges">
            <For each={review.sensitive_scopes}>
              {(scope) => (
                <Badge variant="soft" tone="warning">
                  {scope}
                </Badge>
              )}
            </For>
          </span>
        </Field>
        <Field label={t('reviews.links')}>
          <span class="links">
            <a href={review.homepage_url ?? '#'} target="_blank" rel="noreferrer noopener">
              {() => t('reviews.homepage')}
            </a>
            <a href={review.privacy_url ?? '#'} target="_blank" rel="noreferrer noopener">
              {() => t('reviews.privacy')}
            </a>
            <a href={review.terms_url ?? '#'} target="_blank" rel="noreferrer noopener">
              {() => t('reviews.terms')}
            </a>
          </span>
        </Field>
        <div class="form-row">
          <Field label={t('reviews.note')}>
            <Input value={note()} onInput={(e: InputEvent) => note.set(valueOf(e))} />
          </Field>
          <Button variant="outline" disabled={submission()?.pending} onPress={() => settle(answer(false))}>
            {() => t('reviews.reject')}
          </Button>
          <Button variant="solid" disabled={submission()?.pending} onPress={() => settle(answer(true))}>
            {() => t('reviews.approve')}
          </Button>
        </div>
        <Show when={mine() && submission()?.error}>
          {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
        </Show>
      </CardBody>
    </Card>
  );
}
