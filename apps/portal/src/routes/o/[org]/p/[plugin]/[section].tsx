/** A page a plugin adds to an organization: its element, given the organization and the locale. */
import { useParams, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { Dynamic, onMount } from '@fluixi/core';
import { sectionOf } from '@buntubi/sdk/plugins';
import '@idp/elements/not-found';
import { uiPlugins as plugins } from '../../../../../lib/ui-plugins.js';
import { locale } from '../../../../../lib/i18n.js';
import { pluginNotFoundLabels } from '../../../../../lib/labels.js';
import { paramOf } from '../../../../../lib/params.js';
import { paths } from '../../../../../lib/paths.js';

export const routeData = async (args: RouteDataArgs) => {
  const section = sectionOf(plugins, 'organization', paramOf(args, 'plugin'), paramOf(args, 'section'));
  if (section) await section.load();
  return section ? { element: section.element } : null;
};

export default function OrganizationPluginPage() {
  const data = useRouteData<Awaited<ReturnType<typeof routeData>>>();
  const params = useParams<{ org: string; plugin: string; section: string }>();
  // The page's data may come from the server render, which ran `load` there only: the browser
  // defines the element here, and it takes over the markup the server sent.
  onMount(() => $untrack(() => void sectionOf(plugins, 'organization', params().plugin, params().section)?.load()));
  return (
    <Show when={data()} fallback={<idp-not-found href={paths.organization(params().org)} labels={pluginNotFoundLabels()} />}>
      {(page: { element: string }) => <Dynamic component={page.element} organization={params().org} locale={locale()} />}
    </Show>
  );
}
