/**
 * Creating an app, default look: the steps, the step's blocks, a message when something is
 * missing, and the footer. Each block is its own element with its own view.
 */
import { Show } from '@fluixi/core';
import { Grid, Stack } from '@fluixi-ui/layout';
import type { InfoField, AppInfoFormLabels, PlatformEntry } from '../app-info-form/logic.js';
import type { KindEntry } from '../kind-picker/logic.js';
import type { ProductEntry } from '../product-picker/logic.js';
import type { StepEntry } from '../step-indicator/logic.js';
import { viewToken } from '../view.js';
import type { CreateStep } from './logic.js';

export interface CreateAppLogic {
  step: () => CreateStep;
  steps: () => StepEntry[];
  stepsLabel: () => string;
  kindTitle: () => string;
  kindIntro: () => string;
  kinds: () => KindEntry[];
  kind: () => string;
  chooseKind: (kind: string) => void;
  infoLabels: () => AppInfoFormLabels;
  values: () => Partial<Record<InfoField, string>>;
  edit: (field: InfoField, value: string) => void;
  platforms: () => PlatformEntry[];
  togglePlatform: (platform: string) => void;
  preview: () => { title: string; text: string; links: string; note: string };
  appName: () => string;
  logo: () => string;
  platform: () => string;
  productsTitle: () => string;
  productsIntro: () => string;
  noProducts: () => string;
  products: () => ProductEntry[];
  toggleProduct: (slug: string) => void;
  backLabel: () => string;
  nextLabel: () => string;
  note: () => string;
  back: () => void;
  next: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}

export const createAppView = (c: CreateAppLogic) => (
  <Stack part="create-app" gap={6}>
    <style scoped>{`
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      .preview { position: sticky; top: 16px; }
    `}</style>
    <idp-step-indicator steps={c.steps()} label={c.stepsLabel()} />
    <Show when={c.step() === 1}>
      <idp-kind-picker
        kinds={c.kinds()}
        selected={c.kind()}
        title={c.kindTitle()}
        intro={c.kindIntro()}
        onChoose={(event) => c.chooseKind(event.detail.kind)}
      />
    </Show>
    <Show when={c.step() === 2}>
      <Grid columns={{ base: 1, md: 'minmax(0, 1fr) 312px' }} gap={5} align="start">
        <idp-app-info-form
          values={c.values()}
          platforms={c.platforms()}
          labels={c.infoLabels()}
          onEdit={(event) => c.edit(event.detail.field, event.detail.value)}
          onPlatform={(event) => c.togglePlatform(event.detail.platform)}
        />
        <idp-consent-preview
          class="preview"
          app={c.appName()}
          platform={c.platform()}
          logo={c.logo()}
          title={c.preview().title}
          text={c.preview().text}
          links={c.preview().links}
          note={c.preview().note}
        />
      </Grid>
    </Show>
    <Show when={c.step() === 3}>
      <idp-product-picker
        products={c.products()}
        title={c.productsTitle()}
        intro={c.productsIntro()}
        empty={c.noProducts()}
        onToggle={(event) => c.toggleProduct(event.detail.slug)}
      />
    </Show>
    <Show when={c.error()}>
      <p class="alert" role="alert">
        {() => c.error()}
      </p>
    </Show>
    <idp-wizard-footer
      backLabel={c.backLabel()}
      nextLabel={c.nextLabel()}
      note={c.note()}
      busy={c.busy()}
      onBack={() => c.back()}
      onNext={() => void c.next()}
    />
  </Stack>
);

export const CreateAppView = viewToken<CreateAppLogic>('CreateAppView', createAppView);
