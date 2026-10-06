/** Everyone with an account: what they are, and whether they may sign in. */
import { action, cache, useNavigate, useRouteData, useSubmission } from '@fluixi/start/router';
import type { RouteDataArgs } from '@fluixi/start/router';
import { Badge } from '@fluixi-ui/badge';
import { Button } from '@fluixi-ui/button';
import { Card, CardBody } from '@fluixi-ui/card';
import { Input } from '@fluixi-ui/input';
import { valueOf } from '../components/field.js';
import { errorText, t } from '../lib/i18n.js';
import { searchOf } from '../lib/params.js';
import type { UserRow } from '../lib/types.js';
import { loadUsers, setUserDisabled } from '../server/admin.js';
import { settle } from '../lib/settle.js';

const users = cache((q: string) => loadUsers(q), 'users');
export const routeData = (args: RouteDataArgs) => users(searchOf(args, 'q'));

const toggle = action((input: { id: string; disabled: boolean }) => setUserDisabled(input), 'user.toggle', {
  invalidates: ['users', 'overview'],
});

export default function UsersPage() {
  const data = useRouteData<UserRow[]>();
  const navigate = useNavigate();
  const q = $signal('');
  const submission = useSubmission(toggle);
  return (
    <section>
      <h1>{() => t('users.title')}</h1>
      <form
        class="form-row search"
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          navigate(`/users?q=${encodeURIComponent(q().trim())}`);
        }}
      >
        <Input type="search" value={q()} onInput={(e: InputEvent) => q.set(valueOf(e))} aria-label={t('common.search')} />
        <Button type="submit" variant="outline">
          {() => t('common.search')}
        </Button>
      </form>
      <Show when={submission()?.error}>
        {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
      </Show>
      <Card class="panel">
        <CardBody>
          <ul class="rows">
            <For each={data() ?? []}>
              {(user) => (
                <li classList={{ inactive: user.disabled }}>
                  <span class="row-text">
                    <strong>{`${user.given_name} ${user.family_name}`.trim() || user.email}</strong>
                    <span class="muted">{user.email}</span>
                  </span>
                  <span class="badges">
                    <Show when={user.roles.includes('admin')}>
                      <Badge variant="soft" tone="primary">{() => t('users.admin')}</Badge>
                    </Show>
                    <Show when={user.developer}>
                      <Badge variant="soft" tone="info">{() => t('users.developer')}</Badge>
                    </Show>
                    <Show when={user.mfa}>
                      <Badge variant="outline" tone="success">{() => t('users.mfa')}</Badge>
                    </Show>
                    <Show when={!user.email_verified}>
                      <Badge variant="outline" tone="warning">{() => t('users.unverified')}</Badge>
                    </Show>
                  </span>
                  <Button variant="ghost" onPress={() => settle(toggle({ id: user.id, disabled: !user.disabled }))}>
                    {() => (user.disabled ? t('users.enable') : t('users.disable'))}
                  </Button>
                </li>
              )}
            </For>
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
