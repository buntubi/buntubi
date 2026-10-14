/** The deployment's UI plugins, composed at build time by `idpUiPlugins()` (vite.config.ts). */
declare module 'virtual:idp-ui-plugins' {
  const plugins: import('@buntubi/sdk/plugins').IdpUiPlugin[];
  export default plugins;
}
