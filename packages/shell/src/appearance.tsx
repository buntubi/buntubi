/**
 * The appearance dialog and the sync that keeps a person's choices on their account. The dialog
 * offers every control fluixi-ui has for it (the skin's own ones appear only under a skin that
 * reads them), minus the axes the deployment locks. `AppearanceSync` loads the choices when the
 * page opens and saves what changes, so the look follows the person between the provider and the
 * products.
 */
import { Show, onMount } from '@fluixi/core';
import type { ComponentChild } from '@fluixi/dom';
import { effect, signal } from '@fluixi/reactive/signal';
import { AccentPicker, BackdropSelect, CardsPicker, ColorSchemePicker, CornerPicker, DEFAULT_APPEARANCE_LABELS, HoverPicker, LightPicker, RimControl, SkinSelect, TransparencyControl, type AppearanceLabels } from '@fluixi-ui/appearance';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@fluixi-ui/dialog';
import { useAppearance } from '@fluixi-ui/theme';
import { createAppearanceSync, type AppearanceAxis, type AppearanceChoices, type AppearanceState } from '@buntubi/sdk/appearance';

const RIM_KEYS = ['opacity', 'width', 'glow'] as const;

/** Whether the dialog is open: shared, so a row on a page opens the dialog the theme menu holds. */
export const appearanceDialogOpen = signal(false);
export const openAppearanceDialog = () => appearanceDialogOpen.set(true);

/** The axes the deployment locks, once the account has answered. */
const locked = signal<readonly AppearanceAxis[]>([]);

export interface AppearanceDialogLabels {
  title: string;
  description: string;
  done: string;
  /** Shown in place of a control the deployment locks. */
  lockedNote: string;
  /** The close button's name. */
  close: string;
  /** fluixi-ui's control labels and names, in the page's language. */
  controls?: Partial<AppearanceLabels>;
  names?: Record<string, string>;
}

export interface AppearanceDialogProps {
  labels: AppearanceDialogLabels;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Leave out the accent row, for a product with one brand colour. */
  hideAccent?: boolean;
}

export function AppearanceDialog(props: AppearanceDialogProps): ComponentChild {
  const appearance = useAppearance();
  const label = (key: keyof AppearanceLabels) => props.labels.controls?.[key] ?? DEFAULT_APPEARANCE_LABELS[key];
  // A field is offered while none of its axes is locked.
  const free = (axes: AppearanceAxis[]) => axes.every((axis) => !locked().includes(axis));
  const Field = (field: { axis: AppearanceAxis | AppearanceAxis[]; title: string; children: ComponentChild }) => (
    <div class="field">
      <span class="field-title">{field.title}</span>
      <Show when={free([field.axis].flat())} fallback={<span class="field-locked">{props.labels.lockedNote}</span>}>
        {field.children}
      </Show>
    </div>
  );
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <style scoped>{`
        /* The body scrolls inside a dialog of fixed height; the title and the button stay in view. */
        .body { display: grid; align-content: start; gap: 16px; margin-top: 12px; overflow-y: auto; min-height: 0; flex: 1; padding-inline-end: 4px; }
        .field { display: grid; gap: 8px; }
        .head { display: flex; align-items: flex-start; gap: 12px; flex: none; }
        .titles { flex: 1; display: grid; gap: 3px; }
        .titles :deep(h2) { margin: 0; font-size: 17px; font-weight: 600; }
        .titles :deep(p) { margin: 0; font-size: 13px; color: var(--flx-ui-color-fg-muted); }
        .field-title { font-size: 13px; font-weight: 500; }
        .field-locked { font-size: 13px; color: var(--flx-ui-color-fg-muted); }
        .footer { display: flex; justify-content: flex-end; margin-top: 16px; flex: none; }
      `}</style>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent style="display: flex; flex-direction: column; height: min(85vh, 720px); overflow: hidden">
          <div class="head">
            <div class="titles">
              <DialogTitle>{props.labels.title}</DialogTitle>
              <DialogDescription>{props.labels.description}</DialogDescription>
            </div>
            <DialogClose data-variant="ghost" data-tone="neutral" data-size="sm" aria-label={props.labels.close} title={props.labels.close}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </DialogClose>
          </div>
          <div class="body">
            <Field axis="skin" title={label('skin')}>
              <SkinSelect label={label('skin')} names={props.labels.names} />
            </Field>
            <Field axis="scheme" title={label('scheme')}>
              <ColorSchemePicker label={label('scheme')} labels={props.labels.controls} />
            </Field>
            <Field axis="corner" title={label('corner')}>
              <CornerPicker label={label('corner')} names={props.labels.names} />
            </Field>
            <Show when={!props.hideAccent}>
              <Field axis="accent" title={label('accent')}>
                <AccentPicker label={label('accent')} names={props.labels.names} />
              </Field>
            </Show>
            <Show when={appearance.supportsTransparency()}>
              <Field axis="transparency" title={label('transparency')}>
                <TransparencyControl label={label('transparency')} sliderLabel={label('opacity')} names={props.labels.names} />
              </Field>
            </Show>
            <Show when={appearance.supportsRim()}>
              <Field axis={['rim_opacity', 'rim_width', 'rim_glow']} title={label('rim')}>
                <RimControl label={label('rim')} labels={props.labels.controls} />
              </Field>
            </Show>
            <Show when={appearance.supportsLight()}>
              <Field axis="light" title={label('glassLight')}>
                <LightPicker label={label('glassLight')} names={props.labels.names} />
              </Field>
              <Field axis="cards" title={label('glassCards')}>
                <CardsPicker label={label('glassCards')} names={props.labels.names} />
              </Field>
              <Field axis="hover" title={label('glassHover')}>
                <HoverPicker label={label('glassHover')} names={props.labels.names} />
              </Field>
            </Show>
            <Show when={appearance.backdrops().length > 0}>
              <Field axis="backdrop" title={label('backdrop')}>
                <BackdropSelect label={label('backdrop')} names={props.labels.names} />
              </Field>
            </Show>
          </div>
          <div class="footer">
            {/* The close control wears fluixi-ui's button attributes, as the theme menu's trigger does. */}
            <DialogClose data-variant="solid" data-tone="primary" data-size="md">
              {props.labels.done}
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export interface AppearanceSyncProps {
  load: () => Promise<AppearanceState>;
  save: (changes: Partial<Record<AppearanceAxis, unknown>>) => Promise<AppearanceState>;
  onError?: (error: unknown) => void;
}

/** Renders nothing: loads the account's choices into the page, then saves its changes. */
export function AppearanceSync(props: AppearanceSyncProps): ComponentChild {
  const appearance = useAppearance();
  const started = signal(false);
  const read = (): AppearanceChoices => {
    const backdrop = appearance.backdrop.value();
    return {
      skin: appearance.skin.value(),
      scheme: appearance.scheme.value() as AppearanceChoices['scheme'],
      accent: appearance.accent.value(),
      corner: appearance.corner.value(),
      transparency: appearance.transparency.custom() ? appearance.transparency.opacity() : appearance.transparency.preset(),
      ...(backdrop ? { backdrop } : {}),
      // A rim value only while one is chosen: left alone, it is the skin's own and not the person's.
      ...Object.fromEntries(RIM_KEYS.filter((key) => appearance.rim.custom(key)).map((key) => [`rim_${key}`, appearance.rim.value(key)])),
      light: appearance.light.value(),
      hover: appearance.hover.value(),
      cards: appearance.cards.value(),
    };
  };
  const apply = (choices: AppearanceChoices) => {
    if (choices.skin) appearance.skin.set(choices.skin);
    if (choices.scheme) appearance.scheme.set(choices.scheme);
    if (choices.accent) appearance.accent.set(choices.accent);
    if (choices.corner) appearance.corner.set(choices.corner);
    if (typeof choices.transparency === 'number') appearance.transparency.setOpacity(choices.transparency);
    else if (choices.transparency) appearance.transparency.setPreset(choices.transparency as Parameters<typeof appearance.transparency.setPreset>[0]);
    if (choices.backdrop) appearance.backdrop.set(choices.backdrop);
    for (const key of RIM_KEYS) {
      const value = choices[`rim_${key}` as const];
      if (typeof value === 'number') appearance.rim.set(key, value);
    }
    if (choices.light) appearance.light.set(choices.light);
    if (choices.hover) appearance.hover.set(choices.hover);
    if (choices.cards) appearance.cards.set(choices.cards);
  };
  const sync = createAppearanceSync({ load: props.load, save: props.save, read, apply, onError: props.onError });
  onMount(() => {
    void sync.start().then((loaded) => {
      locked.set(sync.locked());
      started.set(loaded);
    });
    return () => sync.stop();
  });
  // Every choice read here is tracked: a change on the page schedules a save.
  effect(() => {
    read();
    if (started()) sync.changed();
  });
  return null;
}
