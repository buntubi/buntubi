/** The default look: the language as a segmented choice, the country as a list. */
import { For, Show } from '@fluixi/core';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import { infoStyles } from '../info-shared/styles.js';
import { viewToken } from '../view.js';
import type { PreferencesSectionLogic } from './logic.js';
import '../segmented/segmented.js';

export const preferencesSectionView = (p: PreferencesSectionLogic) => (
  <section part="preferences" class="card" aria-labelledby="idp-preferences-title">
    <style scoped>{`${infoStyles}
      .choice { flex: 1; min-width: 200px; display: grid; gap: 4px; justify-items: start; }
    `}</style>
    <h2 id="idp-preferences-title">{() => p.labels().title}</h2>
    <div class="row">
      <span class="label">{() => p.labels().language}</span>
      <span class="choice">
        <idp-segmented
          options={[
            { value: 'fr', label: p.labels().languages.fr },
            { value: 'en', label: p.labels().languages.en },
          ]}
          value={p.locale()}
          label={p.labels().language}
          size="md"
          onChange={(event) => void p.setLocale(event.detail.value === 'en' ? 'en' : 'fr')}
        />
        <span class="muted">{() => p.labels().languageHint}</span>
      </span>
    </div>
    <div class="row">
      <span class="label">{() => p.labels().country}</span>
      <span class="choice">
        <Select
          value={p.country()}
          placeholder={p.labels().noCountry}
          labels={(code: string) => p.countries().find((entry) => entry.code === code)?.name ?? code}
          onChange={(code: string) => void p.setCountry(code)}
        >
          <SelectTrigger part="country">
            <SelectValue />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              <For each={p.countries()}>{(entry) => <SelectItem value={entry.code}>{entry.name}</SelectItem>}</For>
            </SelectContent>
          </SelectPortal>
        </Select>
        <span class="muted">{() => p.labels().countryHint}</span>
      </span>
    </div>
    <Show when={p.notice()}>
      <p class="done" role="status">
        {() => p.notice()}
      </p>
    </Show>
    <Show when={p.error()}>
      <p class="alert" role="alert">
        {() => p.error()}
      </p>
    </Show>
  </section>
);

export const PreferencesSectionView = viewToken<PreferencesSectionLogic>('PreferencesSectionView', preferencesSectionView);
