/** The scope catalog: what apps and keys can ask for, and the words consent shows for it. */
import { Stack } from '@fluixi-ui/layout';
import { useRouteData } from '@fluixi/start/router';
import '@idp/elements/scope-form';
import '@idp/elements/scope-list';
import { errorText, locale, t } from '../lib/i18n.js';
import { scopeFormLabels, scopeListLabels, scopeRowLabels, formMessages } from '../lib/labels.js';
import type { ScopeRow } from '../lib/types.js';
import '@idp/elements/page-header';
import { scopes } from '../data/admin.js';

export const routeData = () => scopes();

export default function ScopesPage() {
  const data = useRouteData<ScopeRow[]>();
  return (
    <Stack gap={5}>
      <idp-page-header title={t('scopes.title')} />
      <idp-scope-list scopes={data() ?? []} locale={locale()} labels={scopeListLabels()} rowLabels={scopeRowLabels()} />
      <idp-scope-form labels={scopeFormLabels()} messages={formMessages()} describe={errorText} />
    </Stack>
  );
}
