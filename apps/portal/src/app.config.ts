import { defineApp } from '@fluixi/start/app';
import { AuthModule } from './services/auth.js';

export default defineApp({ imports: [AuthModule] });
