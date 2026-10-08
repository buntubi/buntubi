import { defineApp } from '@fluixi/start/app';
import { AuthModule } from './services/auth.js';
import { DeveloperModule } from './services/developer.js';

export default defineApp({ imports: [AuthModule, DeveloperModule] });
