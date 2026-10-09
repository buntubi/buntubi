/** The scope catalog: what apps and keys can ask for, and the words consent shows for it. */
import { cache, useRouteData } from '@fluixi/start/router';
import '@idp/elements/scope-form';
import '@idp/elements/scope-list';
import { errorText, locale, t } from '../lib/i18n.js';
import { scopeFormLabels, scopeRowLabels } from '../lib/labels.js';
import type { ScopeRow } from '../lib/types.js';
import { loadScopes } from '../server/admin.js';

const scopes = cache(() => loadScopes(), 'scopes');
export const routeData = () => scopes();

export default function ScopesPage() {
  const data = useRouteData<ScopeRow[]>();
  return (
    <div class="stack">
      <header class="page-head">
        <h1>{() => t('scopes.title')}</h1>
      </header>
      <idp-scope-list scopes={data() ?? []} locale={locale()} title={t('scopes.catalog')} empty={t('common.none')} rowLabels={scopeRowLabels()} />
      <idp-scope-form labels={scopeFormLabels()} describe={errorText} />
    </div>
  );
}
