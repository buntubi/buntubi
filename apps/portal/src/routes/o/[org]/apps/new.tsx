/** Creating an app: a focused flow, without the sidebar, that lands on the new app's credentials. */
import { useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { can } from '@buntubi/sdk/roles';
import '@idp/elements/create-app';
import { useBrand } from '@idp/shell/brand';
import { errorText, locale, t } from '../../../../lib/i18n.js';
import { createAppLabels } from '../../../../lib/labels.js';
import { handOverSecret } from '../../../../lib/one-time.js';
import { paramOf } from '../../../../lib/params.js';
import { paths } from '../../../../lib/paths.js';
import type { Workspace } from '../../../../lib/types.js';
import { workspace } from '../../../../data/developer.js';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function NewAppPage() {
  const data = useRouteData<Workspace>();
  const navigate = useNavigate();
  const brand = useBrand();
  const organization = () => data()?.current?.organization;
  const created = (event: CustomEvent<{ client_id: string; client_secret: string | null }>) => {
    // A confidential app's secret is shown on its credentials page, once.
    handOverSecret(event.detail.client_id, event.detail.client_secret);
    navigate(paths.app(organization()?.id ?? '', event.detail.client_id, 'credentials'));
  };
  return (
    <Show when={can(organization(), 'edit_apps')} fallback={<p class="page-intro">{() => t('error.forbidden')}</p>}>
      <idp-create-app
        organization={organization()?.id ?? ''}
        products={data()?.products ?? []}
        platform={brand().name ?? ''}
        locale={locale()}
        labels={createAppLabels()}
        describe={errorText}
        onCreated={created}
        onCancel={() => navigate(paths.organization(organization()?.id ?? ''))}
      />
    </Show>
  );
}
