/** A new account, invited by email or ready to use; the new account's page opens after. */
import { Stack } from '@fluixi-ui/layout';
import { useNavigate } from '@fluixi/start/router';
import '@idp/elements/page-header';
import '@idp/elements/user-create';
import { errorText, locale, t } from '../../lib/i18n.js';
import { formMessages, userCreateLabels } from '../../lib/labels.js';
import { paths } from '../../lib/paths.js';

export default function NewUserPage() {
  const navigate = useNavigate();
  return (
    <Stack gap={5}>
      <idp-page-header
        title={t('users.new')}
        intro={t('users.newIntro')}
        actions={[{ label: t('users.back'), href: paths.users(), variant: 'outline' }]}
      />
      <idp-user-create
        locale={locale()}
        labels={userCreateLabels()}
        messages={formMessages()}
        describe={errorText}
        onCreated={(event) => navigate(paths.user(event.detail.id))}
      />
    </Stack>
  );
}
