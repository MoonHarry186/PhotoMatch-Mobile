import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { ErrorState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/i18n-provider';
import { idRouteParamsSchema } from '@/schemas/route-params';

export function DetailScreen({
  entity,
  id,
}: {
  entity: string;
  id: string | string[] | undefined;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const parsed = idRouteParamsSchema.safeParse({
    id: Array.isArray(id) ? id[0] : id,
  });
  if (!parsed.success) {
    return (
      <ErrorState
        title={t('common.invalidLink')}
        message={t('common.invalidContentId')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }
  return (
    <AppScreen>
      <Text accessibilityRole="header">{entity}</Text>
      <Text selectable>{parsed.data.id}</Text>
      <Text>{t('common.featurePlaceholder')}</Text>
      <Button
        label={t('common.back')}
        variant="secondary"
        onPress={() => router.back()}
      />
    </AppScreen>
  );
}
