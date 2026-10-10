/** The default look: a large tinted mark, the name with its stage, the meta line, the action at the end. */
import { Show } from '@fluixi/core';
import { useNavigate } from '@fluixi/core/router';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { AppHeaderLogic } from './logic.js';

const TONE = { live: 'var(--idp-ok)', in_review: 'var(--idp-info)', changes_requested: 'var(--idp-warn)', draft: 'var(--idp-muted)' } as const;

export const appHeaderView = (a: AppHeaderLogic) => {
  const navigate = useNavigate();
  return (
    <header part="app-header" class="head">
      <style scoped>{`
        .head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 18px; align-items: center; }
        .mark { width: 52px; height: 52px; border-radius: 12px; display: grid; place-items: center; font-size: 22px; font-weight: 700; color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 16%, var(--idp-surface)); overflow: hidden; }
        .mark img { width: 100%; height: 100%; object-fit: cover; }
        .title { display: grid; gap: 6px; min-width: 0; }
        .name { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
        .pill { display: inline-flex; align-items: center; gap: 6px; padding: 1px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 13%, transparent); }
        .pill::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .meta { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 16px; color: var(--idp-muted); font-size: 13px; }
        code { color: var(--idp-text); font-size: 12.5px; }
        .actions { display: grid; justify-items: end; gap: 6px; }
        .alert { margin: 0; color: var(--idp-bad); font-size: 12.5px; max-width: 320px; text-align: right; }
        @media (max-width: 720px) { .head { grid-template-columns: auto minmax(0, 1fr); } .actions { grid-column: 1 / -1; justify-items: start; } .alert { text-align: left; } }
      `}</style>
      <span class="mark" aria-hidden="true">
        <Show when={a.logo()} fallback={a.mark()}>
          <img src={a.logo()} alt="" />
        </Show>
      </span>
      <div class="title">
        <div class="name">
          <h1>{() => a.name()}</h1>
          <span class="pill" style={() => `--tone: ${TONE[a.stage()]}`}>
            {() => a.stageLabel()}
          </span>
          <Show when={a.firstParty()}>
            <span class="pill" style="--tone: var(--idp-accent)" title={() => a.labels().firstPartyHelp}>
              {() => a.labels().firstParty}
            </span>
          </Show>
        </div>
        <p class="meta">
          <span>
            {() => a.labels().appId} <code>{() => a.clientId()}</code>
          </span>
          <span>{() => a.kind()}</span>
          <span>{() => a.environment()}</span>
        </p>
      </div>
      <div class="actions">
        <Show when={a.action()}>
          {(action: { label: string; href: string }) => (
            <Button variant="solid" disabled={a.busy()} onPress={() => (action.href ? navigate(action.href) : void a.publish())}>
              {action.label}
            </Button>
          )}
        </Show>
        <Show when={a.error()}>
          <p class="alert" role="alert">
            {() => a.error()}
          </p>
        </Show>
        <Show when={a.missing().length}>
          <p class="alert" role="alert">
            {() => `${a.labels().missing} ${a.missing().join(', ')}`}
          </p>
        </Show>
      </div>
    </header>
  );
};

export const AppHeaderView = viewToken<AppHeaderLogic>('AppHeaderView', appHeaderView);
