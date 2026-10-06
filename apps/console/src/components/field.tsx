/** A label above a control, and an optional hint under it. Layout only; the control is fluixi-ui's. */
import type { ComponentChild } from '@fluixi/dom';

export function Field(props: { label: string; hint?: string; children?: ComponentChild }): ComponentChild {
  return (
    <label class="field">
      <span class="field-label">{() => props.label}</span>
      {props.children}
      {() => (props.hint ? <span class="field-hint">{props.hint}</span> : null)}
    </label>
  );
}

/**
 * A label over several controls (a choice of buttons): a group named by its label. A `<label>`
 * there would name, and click, the first button only.
 */
export function ChoiceField(props: {
  name: string;
  label: string;
  hint?: string;
  children?: ComponentChild;
}): ComponentChild {
  // Named by the caller, so the server and the browser give it the same id.
  const id = `choice-${props.name}`;
  return (
    <div class="field" role="group" aria-labelledby={id}>
      <span class="field-label" id={id}>
        {() => props.label}
      </span>
      <div class="choice">{props.children}</div>
      {() => (props.hint ? <span class="field-hint">{props.hint}</span> : null)}
    </div>
  );
}

/** The value typed into an input event's control. */
export const valueOf = (event: Event): string => (event.currentTarget as HTMLInputElement).value;
