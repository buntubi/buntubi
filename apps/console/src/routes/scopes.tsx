/** The scope catalog: what apps and keys can ask for, and the words consent shows for it. */
import { action, cache, useRouteData, useSubmission } from '@fluixi/start/router';
import { Badge } from '@fluixi-ui/badge';
import { Button } from '@fluixi-ui/button';
import { Card, CardBody } from '@fluixi-ui/card';
import { Input } from '@fluixi-ui/input';
import { ChoiceField, Field, valueOf } from '../components/field.js';
import { errorText, locale, t } from '../lib/i18n.js';
import type { ScopeRow } from '../lib/types.js';
import { createScope, loadScopes } from '../server/admin.js';
import { settle } from '../lib/settle.js';

const scopes = cache(() => loadScopes(), 'scopes');
export const routeData = () => scopes();

const create = action((input: ScopeRow) => createScope(input), 'scope.create', { invalidates: ['scopes'] });

const TONE = { public: 'success', sensitive: 'warning', restricted: 'danger' } as const;
const SENSITIVITIES = ['public', 'sensitive', 'restricted'] as const;

export default function ScopesPage() {
  const data = useRouteData<ScopeRow[]>();
  const name = $signal('');
  const sensitivity = $signal<ScopeRow['sensitivity']>('public');
  const resource = $signal('');
  const fr = $signal('');
  const en = $signal('');
  const submission = useSubmission(create);
  const submit = async () => {
    await create({
      name: name().trim(),
      sensitivity: sensitivity(),
      resource: resource().trim(),
      descriptions: { fr: fr().trim(), en: en().trim() },
      notes: '',
    });
    name.set('');
    resource.set('');
    fr.set('');
    en.set('');
  };
  return (
    <section class="legacy">
      <h1>{() => t('scopes.title')}</h1>
      <Card class="panel">
        <CardBody>
          <ul class="rows">
            <For each={data() ?? []}>
              {(scope) => (
                <li>
                  <span class="row-text">
                    <code class="mono">{scope.name}</code>
                    <span class="muted">{() => scope.descriptions[locale()] ?? ''}</span>
                    <Show when={scope.resource}>
                      <span class="muted">{`API ${scope.resource}`}</span>
                    </Show>
                  </span>
                  <Badge variant="soft" tone={TONE[scope.sensitivity]}>
                    {() => t(`scopes.${scope.sensitivity}`)}
                  </Badge>
                </li>
              )}
            </For>
          </ul>
        </CardBody>
      </Card>
      <Card class="panel">
        <CardBody>
          <h2>{() => t('scopes.new')}</h2>
          <form
            class="form-stack"
            onSubmit={(event: SubmitEvent) => {
              event.preventDefault();
              settle(submit());
            }}
          >
            <Field label={t('scopes.name')}>
              <Input value={name()} onInput={(e: InputEvent) => name.set(valueOf(e))} placeholder="orders.read" required />
            </Field>
            <ChoiceField name="sensitivity" label={t('scopes.sensitivity')}>
              <For each={SENSITIVITIES}>
                {(value) => (
                  <Button
                    type="button"
                    variant={sensitivity() === value ? 'solid' : 'outline'}
                    onPress={() => sensitivity.set(value)}
                  >
                    {() => t(`scopes.${value}`)}
                  </Button>
                )}
              </For>
            </ChoiceField>
            <Field label={t('scopes.resource')}>
              <Input value={resource()} onInput={(e: InputEvent) => resource.set(valueOf(e))} placeholder="orders" />
            </Field>
            <Field label={t('scopes.fr')}>
              <Input value={fr()} onInput={(e: InputEvent) => fr.set(valueOf(e))} required />
            </Field>
            <Field label={t('scopes.en')}>
              <Input value={en()} onInput={(e: InputEvent) => en.set(valueOf(e))} required />
            </Field>
            <div>
              <Button type="submit" variant="solid" disabled={submission()?.pending}>
                {() => t('scopes.create')}
              </Button>
            </div>
          </form>
          <Show when={submission()?.error}>
            {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
          </Show>
        </CardBody>
      </Card>
    </section>
  );
}
