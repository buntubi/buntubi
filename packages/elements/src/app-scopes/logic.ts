/** What an app may ask for, by stage; apart from the look. */

export interface AppScopesLabels {
  title: string;
  manage: string;
  live: string;
  waiting: string;
  sandbox: string;
  none: string;
}

export const appScopesLabels: AppScopesLabels = {
  title: 'Access',
  manage: 'Manage',
  live: 'Live for everyone',
  waiting: 'Waiting for review',
  sandbox: 'Sandbox only',
  none: 'None',
};

export interface StageScopes {
  live: string[];
  waiting: string[];
  sandbox: string[];
}

export interface AppScopesLogic {
  labels: () => AppScopesLabels;
  manageHref: () => string;
  rows: () => { key: keyof StageScopes; label: string; scopes: string[] }[];
}
