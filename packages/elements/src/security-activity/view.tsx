/** The default look: a card with a table; it scrolls sideways on a phone rather than squeezing. */
import { css, For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { SecurityActivityLogic } from './logic.js';

const styles = css`
  .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--idp-border); }
  h2 { margin: 0; font-size: 15px; font-weight: 600; }
  .muted { color: var(--idp-muted); font-size: 12.5px; }
  .scroll { overflow-x: auto; }
  table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 13.5px; }
  th { padding: 10px 8px; text-align: left; color: var(--idp-muted); font-size: 12px; font-weight: 500; }
  td { padding: 12px 8px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); }
  th:first-child, td:first-child { padding-left: 18px; }
  th:last-child, td:last-child { padding-right: 18px; text-align: right; white-space: nowrap; }
  .what { display: flex; align-items: center; gap: 10px; color: var(--idp-text); font-weight: 500; }
  .dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: var(--tone); }
  .ok { --tone: var(--idp-ok); }
  .warn { --tone: var(--idp-warn); }
  .info { --tone: var(--idp-accent); }
  .empty { margin: 0; padding: 18px; color: var(--idp-muted); }
  .advice { margin: 0; padding: 12px 18px; border-top: 1px solid var(--idp-border); color: var(--idp-muted); font-size: 12.5px; }
`;

export const securityActivityView = (a: SecurityActivityLogic) => (
  <section part="activity" class="card" aria-labelledby="idp-activity-title">
    <style scoped>{`${styles}`}</style>
    <div class="head">
      <h2 id="idp-activity-title">{() => a.labels().title}</h2>
      <span class="muted">{() => a.period()}</span>
    </div>
    <Show when={a.rows().length} fallback={<p class="empty">{() => a.labels().empty}</p>}>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{() => a.labels().what}</th>
              <th scope="col">{() => a.labels().where}</th>
              <th scope="col">{() => a.labels().when}</th>
            </tr>
          </thead>
          <tbody>
            <For each={a.rows()} by={(row) => row.key}>
              {(row) => (
                <tr>
                  <td>
                    <span class="what">
                      <span class={`dot ${row().tone}`} aria-hidden="true" />
                      {() => row().what}
                    </span>
                  </td>
                  <td>{() => row().where}</td>
                  <td>{() => row().when}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
    <p class="advice">{() => a.labels().advice}</p>
  </section>
);

export const SecurityActivityView = viewToken<SecurityActivityLogic>('SecurityActivityView', securityActivityView);
