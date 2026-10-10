/** The platform's apps a person can open, as tiles; apart from the look. */

export interface LaunchApp {
  name: string;
  url: string | null;
  logo: string | null;
}

export interface AppLauncherLogic {
  title: () => string;
  apps: () => LaunchApp[];
  initial: (app: LaunchApp) => string;
}
