import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { ErrorState, LoadingState } from '@/components/feedback';
import { Button } from '@/components/ui';
import type { LegalDocumentResponse } from '@/generated/api/types.gen';
import { useSession } from '@/providers/session-provider';
import { AppError } from '@/core/errors';
import { spacing, typography } from '@/theme';

import { authApi } from '../auth/auth.api';

export function LegalScreen({
  publicType,
}: {
  publicType?: 'terms' | 'privacy';
}) {
  const session = useSession();
  const [documents, setDocuments] = useState<LegalDocumentResponse[] | null>(
    session.snapshot?.currentLegal ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (publicType === 'terms')
      return documents.filter(
        (item) => item.documentType === 'TERMS_OF_SERVICE',
      );
    if (publicType === 'privacy')
      return documents.filter((item) => item.documentType === 'PRIVACY_POLICY');
    return documents;
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
        Điều khoản hiện hành
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
      {!publicType ? (
        <>
          {error ? <Text accessibilityRole="alert">{error}</Text> : null}
          <Button
            label="Tôi đồng ý"
            loading={busy}
            onPress={() => {
              setBusy(true);
              setError(null);
              void Promise.all(visible.map((item) => authApi.consent(item.id)))
                .then(() => session.reload())
                .catch(async (caught: unknown) => {
                  if (
                    caught instanceof AppError &&
                    caught.businessCode === 'STALE_LEGAL_VERSION'
                  ) {
                    await load();
                    setError(
                      'Điều khoản vừa được cập nhật. Vui lòng xem lại phiên bản mới.',
                    );
                  } else {
                    setError('Không thể ghi nhận đồng ý. Vui lòng thử lại.');
                  }
                })
                .finally(() => setBusy(false));
            }}
          />
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: typography.bold, fontSize: 26 },
  document: { gap: spacing.sm, paddingVertical: spacing.md },
  name: { fontFamily: typography.semibold },
});
