/** An app's review: where it stands, the last answer, the history, and how ready the app is. */
import { Grid, Row, Stack } from '@fluixi-ui/layout';
import { useRouteData } from '@fluixi/start/router';
import { can } from '@buntubi/sdk/roles';
import '@idp/elements/page-header';
import '@idp/elements/readiness';
import '@idp/elements/review-history';
import '@idp/elements/review-request';
import '@idp/elements/review-stages';
import { reviewRouteData, type ReviewPageData } from '../../../../../../data/developer.js';
import { locale, t } from '../../../../../../lib/i18n.js';
import { launchChecklistLabels, readinessLabels, reviewHistoryLabels, reviewRequestLabels, reviewStagesLabels } from '../../../../../../lib/labels.js';
import { checkLinks, paths } from '../../../../../../lib/paths.js';

export const routeData = reviewRouteData;

export default function ReviewPage() {
  const data = useRouteData<ReviewPageData>();
  const app = () => data()?.app.app ?? null;
  const organization = () => app()?.organization_id ?? '';
  const clientId = () => app()?.client_id ?? '';
  const stage = () => data()?.app.overview?.stage ?? 'draft';
  return (
    <Stack gap={5}>
      <Row justify="space-between" align="center" wrap gap={3}>
        <idp-page-header title={t('rv.title')} />
        <idp-review-stages stage={stage()} labels={reviewStagesLabels()} />
      </Row>
      <Grid columns={{ base: 1, lg: 'minmax(0, 1fr) 362px' }} gap={5} align="start">
        <Stack gap={5}>
          <idp-review-request
            stage={stage()}
            reviews={data()?.reviews ?? []}
            locale={locale()}
            updateHref={paths.app(organization(), clientId(), 'permissions')}
            submitHref={paths.reviewSubmission(organization(), clientId())}
            canPublish={can(data()?.app.role, 'publish')}
            waiting={data()?.app.overview?.scopes.waiting.length ?? 0}
            labels={reviewRequestLabels()}
          />
          <idp-review-history reviews={data()?.reviews ?? []} locale={locale()} labels={reviewHistoryLabels()} />
        </Stack>
        <idp-readiness
          overview={data()?.app.overview ?? null}
          checks={launchChecklistLabels().checks}
          links={checkLinks(organization(), clientId())}
          submitHref={can(data()?.app.role, 'publish') ? paths.reviewSubmission(organization(), clientId()) : ''}
          labels={readinessLabels()}
        />
      </Grid>
    </Stack>
  );
}
