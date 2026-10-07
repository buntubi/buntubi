import { defineApp } from '@fluixi/start/app';
import { AdminModule } from './services/admin.js';
import { AuthModule } from './services/auth.js';

export default defineApp({ imports: [AuthModule, AdminModule] });
