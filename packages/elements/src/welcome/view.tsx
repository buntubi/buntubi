/** The default look: a centred heading, a line, the sign-in. */
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { WelcomeLogic } from './logic.js';

export const welcomeView = (w: WelcomeLogic) => (
  <section part="welcome" class="hero">
    <style scoped>{`
      .hero { max-width: 640px; margin: 0 auto; padding: 72px 0 48px; display: grid; gap: 16px; justify-items: start; }
      h1 { margin: 0; font-size: clamp(28px, 5vw, 40px); font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; }
      p { margin: 0; font-size: 16px; color: var(--idp-muted); line-height: 1.55; }
    `}</style>
    <h1>{() => w.labels().title}</h1>
    <p>{() => w.labels().text}</p>
    <Button variant="solid" size="lg" onPress={w.signIn}>
      {() => w.labels().signIn}
    </Button>
  </section>
);

export const WelcomeView = viewToken<WelcomeLogic>('WelcomeView', welcomeView);
