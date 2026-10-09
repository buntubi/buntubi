import { defineApp } from '@fluixi/start/app';
import { AdminModule } from './services/admin.js';
import { AuthModule } from './services/auth.js';
import { PluginsModule } from './services/plugins.js';

export default defineApp({ imports: [AuthModule, AdminModule, PluginsModule] });
