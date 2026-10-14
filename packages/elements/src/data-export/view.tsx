/** The default look, after the board: title, what the file holds, the button and the last copy. */
import { css, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { DataExportLogic } from './logic.js';

const styles = css`
  .card { display: grid; gap: 12px; padding: 18px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
  h2 { margin: 0; font-size: 15px; font-weight: 600; }
  .about { margin: 0; max-width: 640px; color: var(--idp-muted); font-size: 13px; }
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
  .muted { color: var(--idp-muted); font-size: 12.5px; }
  .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
`;

export const dataExportView = (d: DataExportLogic) => (
  <section part="data-export" class="card" aria-labelledby="idp-export-title">
    <style scoped>{`${styles}`}</style>
    <h2 id="idp-export-title">{() => d.labels().title}</h2>
    <p class="about">{() => d.labels().about}</p>
    <div class="actions">
      <Button variant="solid" size="sm" disabled={d.busy()} onPress={() => void d.download()}>
        {() => (d.busy() ? d.labels().working : d.labels().download)}
      </Button>
      <span class="muted">{() => d.last()}</span>
    </div>
    <Show when={d.error()}>
      <p class="alert" role="alert">
        {() => d.error()}
      </p>
    </Show>
  </section>
);

export const DataExportView = viewToken<DataExportLogic>('idp-data-export', dataExportView);
