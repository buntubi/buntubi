/** Where a flow is among its steps; apart from the look. */

export type StepState = 'done' | 'now' | 'todo';

export interface StepEntry {
  label: string;
  state: StepState;
}

export interface StepIndicatorLogic {
  steps: () => StepEntry[];
  label: () => string;
}
