/** Creating an organization: once made, it is the one the developer works in. */
import { Stack } from '@fluixi-ui/layout';
import { useNavigate } from '@fluixi/start/router';
import '@idp/elements/organization-form';
import '@idp/elements/page-header';
import { usePreferences } from '@idp/shell/preferences';
import { PublicPage } from '../../components/public-page.js';
import { errorText, locale, setLocale, t } from '../../lib/i18n.js';
import { organizationFormLabels, formMessages } from '../../lib/labels.js';
import { paths } from '../../lib/paths.js';

export default function NewOrganizationPage() {
  const navigate = useNavigate();
  const { chooseOrganization } = usePreferences('portal', { locale, setLocale });
  return (
    <PublicPage>
      <Stack gap={6}>
        <idp-page-header
          title={t('org.new.title')}
          intro={t('org.new.intro')}
          actions={[{ label: t('org.new.back'), href: paths.organizations(), variant: 'outline' }]}
        />
        <idp-organization-form
          labels={{ ...organizationFormLabels(), title: '' }}
          messages={formMessages()}
          describe={errorText}
          onCreated={(event) => {
            chooseOrganization(event.detail.id);
            navigate(paths.organization(event.detail.id));
          }}
        />
      </Stack>
    </PublicPage>
  );
}
