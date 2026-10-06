import './styles.css';
import { startClient } from '@fluixi/core/client';
import App, { appRoutes } from './app.js';

startClient(App, { root: '#root', routes: appRoutes as never });
