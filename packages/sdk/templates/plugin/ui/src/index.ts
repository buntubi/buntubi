/** {{label}}'s UI plugin: its pages in the console. Built into ui-plugins/{{id}} by the project's `pnpm build`. */
import { definePlugin } from '@buntubi/sdk/plugins';

export const plugin = definePlugin({
  id: '{{id}}',
  console: [
    {
      key: 'overview',
      label: { fr: '{{label}}', en: '{{label}}' },
      icon: 'M4 5h16v14H4z M4 9h16',
      element: '{{id}}-overview',
      load: () => import('./overview.js'),
    },
  ],
});
