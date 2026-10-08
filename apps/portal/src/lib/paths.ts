/** Addresses in the workspace, apart from the routes, so any module may build them. */

/** An app's address in its organization's workspace, or one of its sections. */
export const appPath = (organization: string, clientId: string, section = '') =>
  `/o/${organization}/apps/${clientId}${section ? `/${section}` : ''}`;
