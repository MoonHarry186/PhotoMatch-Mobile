import { useRouter } from 'expo-router';

import { ErrorState } from '@/components/feedback';
import { useI18n } from '@/i18n/i18n-provider';

export default function NotFoundRoute() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <ErrorState
      title={t('common.noContent')}
      message={t('common.invalidLink')}
      actionLabel={t('common.goHome')}
      onAction={() => router.replace('/')}
    />
  );
}
