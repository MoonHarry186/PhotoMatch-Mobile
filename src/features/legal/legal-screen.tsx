import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { ErrorState, LoadingState } from '@/components/feedback';
import { Button } from '@/components/ui';
import type { LegalDocumentResponse } from '@/generated/api/types.gen';
import { spacing, typography } from '@/theme';

import { authApi } from '../auth/auth.api';

export function LegalScreen({
  publicType,
}: {
  publicType: 'terms' | 'privacy';
}) {
  const [documents, setDocuments] = useState<LegalDocumentResponse[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      setDocuments(await authApi.currentLegal());
    } catch {
      setError('Không thể tải văn bản pháp lý hiện hành.');
    }
  };
  useEffect(() => {
    if (documents) return;
    void authApi
      .currentLegal()
      .then(setDocuments)
      .catch(() => setError('Không thể tải văn bản pháp lý hiện hành.'));
  }, [documents]);

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
          ? 'Điều khoản sử dụng'
          : 'Chính sách quyền riêng tư'}
      </Text>
      {visible.map((document) => (
        <View key={document.id} style={styles.document}>
          <Text style={styles.name}>
            {document.documentType.replaceAll('_', ' ')}
          </Text>
          <Text>Phiên bản {document.version}</Text>
          <Button
            label="Xem nội dung"
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
