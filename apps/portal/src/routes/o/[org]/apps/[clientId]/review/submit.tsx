/** Submitting an app for review, with how ready it is beside the form. */
import { Grid, Stack } from '@fluixi-ui/layout';
import { useNavigate, useRouteData } from '@fluixi/start/router';
import { can } from '@buntu/sdk/roles';
import '@idp/elements/page-header';
import '@idp/elements/readiness';
import '@idp/elements/review-submission';
import { reviewRouteData, type ReviewPageData } from '../../../../../../data/developer.js';
import { errorText, locale, t } from '../../../../../../lib/i18n.js';
import { fieldNames, launchChecklistLabels, readinessLabels, reviewSubmissionLabels } from '../../../../../../lib/labels.js';
import { checkLinks, paths } from '../../../../../../lib/paths.js';

export const routeData = reviewRouteData;

export default function ReviewSubmissionPage() {
  const data = useRouteData<ReviewPageData>();
  const navigate = useNavigate();
  const app = () => data()?.app.app ?? null;
  const organization = () => app()?.organization_id ?? '';
  const clientId = () => app()?.client_id ?? '';
  return (
    <Grid columns={{ base: 1, lg: 'minmax(0, 1fr) 300px' }} gap={5} align="start">
      <Stack gap={5}>
        <idp-page-header title={t('rv.submissionTitle')} intro={t('rv.submissionIntro')} />
        <idp-review-submission
          clientId={clientId()}
          overview={data()?.app.overview ?? null}
          reviews={data()?.reviews ?? []}
          products={data()?.workspace.products ?? []}
          canPublish={can(data()?.app.role, 'publish')}
          fields={fieldNames()}
          locale={locale()}
          labels={reviewSubmissionLabels()}
          describe={errorText}
          onSubmitted={() => navigate(paths.app(organization(), clientId(), 'review'))}
        />
      </Stack>
      <idp-readiness
        overview={data()?.app.overview ?? null}
        checks={launchChecklistLabels().checks}
        links={checkLinks(organization(), clientId())}
        labels={readinessLabels()}
      />
    </Grid>
  );
}
