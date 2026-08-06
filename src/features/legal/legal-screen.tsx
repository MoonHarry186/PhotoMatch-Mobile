import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { ErrorState, LoadingState } from '@/components/feedback';
import { Button } from '@/components/ui';
import type { LegalDocumentResponse } from '@/generated/api/types.gen';
import { useI18n } from '@/i18n/i18n-provider';
import { spacing, typography } from '@/theme';

import { authApi } from '../auth/auth.api';

export function LegalScreen({
  publicType,
}: {
  publicType: 'terms' | 'privacy';
}) {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<LegalDocumentResponse[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      setDocuments(await authApi.currentLegal());
    } catch {
      setError(t('legal.loadError'));
    }
  };
  useEffect(() => {
    if (documents) return;
    void authApi
      .currentLegal()
      .then(setDocuments)
      .catch(() => setError(t('legal.loadError')));
  }, [documents, t]);

  const visible = useMemo(() => {
    if (!documents) return [];
    const documentType =
      publicType === 'terms' ? 'TERMS_OF_SERVICE' : 'PRIVACY_POLICY';
    return documents.filter((item) => item.documentType === documentType);
  }, [documents, publicType]);

  if (!documents)
    return error ? (
      <ErrorState message={error} onAction={() => void load()} />
    ) : (
      <LoadingState />
    );

  return (
    <AppScreen>
      <Text accessibilityRole="header" style={styles.title}>
        {publicType === 'terms'
          ? t('legal.termsTitle')
          : t('legal.privacyTitle')}
      </Text>
      {visible.map((document) => (
        <View key={document.id} style={styles.document}>
          <Text style={styles.name}>
            {publicType === 'terms'
              ? t('legal.termsTitle')
              : t('legal.privacyTitle')}
          </Text>
          <Text>{t('legal.version', { version: document.version })}</Text>
          <Button
            label={t('legal.viewContent')}
            variant="secondary"
            onPress={() => void Linking.openURL(document.contentUrl)}
          />
        </View>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: typography.bold, fontSize: 26 },
  document: { gap: spacing.sm, paddingVertical: spacing.md },
  name: { fontFamily: typography.semibold },
});
