/**
 * A secret or key just created: shown in full this once, with a copy button. The provider keeps
 * only its hash, so after this page it exists nowhere but where the developer pasted it.
 */
import type { ComponentChild } from '@fluixi/dom';
import { Button } from '@fluixi-ui/button';
import { t } from '../lib/i18n.js';

export function RevealOnce(props: { value: string; note: string }): ComponentChild {
  const copied = $signal(false);
  const copy = () =>
    navigator.clipboard?.writeText(props.value).then(
      () => copied.set(true),
      () => {},
    );
  return (
    <div class="reveal" role="status">
      <p>{() => props.note}</p>
      <div class="reveal-row">
        <code class="mono">{() => props.value}</code>
        <Button variant="outline" onPress={copy}>
          {() => (copied() ? t('common.copied') : t('common.copy'))}
        </Button>
      </div>
    </div>
  );
}
