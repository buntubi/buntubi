/** The way from an idea to an app in production, as numbered steps; apart from the look. */

export interface IdeaToLiveLabels {
  title: string;
  steps: string[];
}

export const ideaToLiveLabels: IdeaToLiveLabels = {
  title: 'From idea to live',
  steps: ['Create app', 'Choose APIs', 'Request scopes', 'Configure OAuth', 'Test in sandbox', 'Submit for review', 'Approved', 'Go live', 'Monitor'],
};

export interface IdeaToLiveLogic {
  labels: () => IdeaToLiveLabels;
}
