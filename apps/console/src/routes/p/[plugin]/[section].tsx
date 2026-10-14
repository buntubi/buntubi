/** A page a plugin adds to the console: its element, given the locale. */
import { useParams, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { Dynamic, onMount } from '@fluixi/core';
import { sectionOf } from '@buntu/sdk/plugins';
import '@idp/elements/not-found';
import plugins from 'virtual:idp-ui-plugins';
import { locale } from '../../../lib/i18n.js';
import { pluginNotFoundLabels } from '../../../lib/labels.js';
import { paramOf } from '../../../lib/params.js';
import { paths } from '../../../lib/paths.js';

export const routeData = async (args: RouteDataArgs) => {
  const section = sectionOf(plugins, 'console', paramOf(args, 'plugin'), paramOf(args, 'section'));
  // Defined before the page renders it, on the server as in the browser.
  if (section) await section.load();
  return section ? { element: section.element } : null;
};

export default function PluginPage() {
  const data = useRouteData<Awaited<ReturnType<typeof routeData>>>();
  const params = useParams<{ plugin: string; section: string }>();
  // The page's data may come from the server render, which ran `load` there only: the browser
  // defines the element here, and it takes over the markup the server sent.
  onMount(() => $untrack(() => void sectionOf(plugins, 'console', params().plugin, params().section)?.load()));
  return (
    <Show when={data()} fallback={<idp-not-found href={paths.overview()} labels={pluginNotFoundLabels()} />}>
      {(page: { element: string }) => <Dynamic component={page.element} locale={locale()} />}
    </Show>
  );
}
