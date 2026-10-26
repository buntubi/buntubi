/** The default look: one row per linked provider with its mark, then a button per provider left to link. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { infoStyles } from '../info-shared/styles.js';
import { SOCIAL_ICONS } from '../social-button/icons.js';
import { viewToken } from '../view.js';
import type { SignInMethodsLogic } from './logic.js';
import '../social-button/social-button.js';

export const signInMethodsView = (m: SignInMethodsLogic) => (
  <section part="sign-in-methods" class="card" aria-labelledby="idp-sign-in-methods-title">
    <style scoped>{`${infoStyles}
      .mark { width: 18px; height: 18px; flex: none; }
      .mark path:not([fill]) { fill: currentColor; }
      .who { display: grid; gap: 2px; flex: 1; min-width: 0; }
      .about { margin: 0; padding: 0 18px 14px; font-size: 13px; }
      .link { display: grid; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--idp-border); max-width: 360px; }
    `}</style>
    <h2 id="idp-sign-in-methods-title">{() => m.labels().title}</h2>
    <p class="muted about">{() => m.labels().about}</p>
    <Show when={m.identities().length > 0} fallback={<p class="row muted">{() => m.labels().empty}</p>}>
      <For each={m.identities()}>
        {(identity) => (
          <div class="row" data-provider={identity.provider}>
            <Show when={SOCIAL_ICONS[identity.provider]}>
              <svg class="mark" viewBox={SOCIAL_ICONS[identity.provider]?.viewBox} aria-hidden="true" focusable="false">
                <For each={SOCIAL_ICONS[identity.provider]?.paths ?? []}>{(path) => <path d={path.d} fill={path.fill} />}</For>
              </svg>
            </Show>
            <span class="who">
              <span>{identity.email ? `${identity.label}: ${identity.email}` : identity.label}</span>
              <span class="muted">{() => m.dates(identity)}</span>
            </span>
            <Button variant="ghost" tone="neutral" size="sm" disabled={m.busy()} onPress={() => void m.remove(identity)}>
              {() => m.labels().remove}
            </Button>
          </div>
        )}
      </For>
    </Show>
    <Show when={m.available().length > 0}>
      <div class="link">
        <For each={m.available()}>{(item) => <idp-social-button provider={item.provider} label={item.label} href={item.href} />}</For>
      </div>
    </Show>
    <Show when={m.notice()}>
      <p class="done" role="status">
        {() => m.notice()}
      </p>
    </Show>
    <Show when={m.error()}>
      <p class="alert" role="alert">
        {() => m.error()}
      </p>
    </Show>
  </section>
);

export const SignInMethodsView = viewToken<SignInMethodsLogic>('idp-sign-in-methods', signInMethodsView);
