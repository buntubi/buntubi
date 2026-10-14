/** The API plugin elements call: their own endpoints on the provider, as the signed-in owner. */
import { defineModule } from '@fluixi/start/app';
import { PluginApi, type PluginApiService } from '@buntubi/sdk/plugins';
import { pluginCall } from '../server/admin.js';

const service: PluginApiService = {
  call: <T,>(plugin: string, method: Parameters<PluginApiService['call']>[1], path: string, body?: unknown) =>
    pluginCall({ plugin, method, path, body }) as Promise<T>,
};

export const PluginsModule = defineModule({ name: 'plugins', providers: [{ provide: PluginApi, useValue: service }] });
