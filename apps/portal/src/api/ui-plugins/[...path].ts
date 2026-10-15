/** The browser halves of the mounted UI plugins, which the pages import. */
import { uiPluginHost } from '../../server/ui-plugins.js';

export const GET = async (request: Request): Promise<Response> =>
  (await uiPluginHost.serve(request)) ?? new Response('Not Found', { status: 404 });
