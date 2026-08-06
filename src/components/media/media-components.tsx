import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useOptionalI18n } from '@/i18n/i18n-provider';
import { messages } from '@/i18n/messages';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

import { Button } from '../ui';

export type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

export type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

export function UploadThumbnail({
  uri,
  status,
  progress = 0,
  onRetry,
  onRemove,
}: {
  uri: string;
  status: UploadStatus;
  progress?: number;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const i18n = useOptionalI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const t = i18n?.t ?? ((key: keyof typeof messages.vi) => messages.vi[key]);
  return (
    <View
      style={[styles.thumbnail, { backgroundColor: palette.surfaceVariant }]}
    >
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      {status === 'uploading' ? (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator color={colors.onBrand} />
          <Text style={styles.overlayText}>
            {t('common.uploadingPercent', {
              percent: Math.round(progress * 100),
            })}
          </Text>
        </View>
      ) : null}
      {status === 'failed' ? (
        <View style={styles.uploadOverlay}>
          <Text style={styles.overlayText}>{t('common.uploadFailed')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.retryUpload')}
            style={styles.inlineAction}
            onPress={onRetry}
          >
            <Text style={styles.inlineActionText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.removePhoto')}
        style={styles.remove}
        onPress={onRemove}
      >
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </View>
  );
}

export function AvatarPicker({
  uri,
  onPick,
  onPermissionDenied,
  uploading = false,
  progress = 0,
}: {
  uri?: string | null;
  onPick: (asset: PickedImage) => void;
  onPermissionDenied?: (canAskAgain: boolean) => void;
  uploading?: boolean;
  progress?: number;
}) {
  const i18n = useOptionalI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const t = i18n?.t ?? ((key: keyof typeof messages.vi) => messages.vi[key]);
  const actionLabel = uri ? t('common.changePhoto') : t('common.selectAvatar');
  const pick = async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    const permission = current.granted
      ? current
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onPermissionDenied?.(permission.canAskAgain);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) onPick(asset);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={actionLabel}
      disabled={uploading}
      onPress={pick}
      style={styles.avatarPicker}
    >
      <View style={styles.avatarFrame}>
        {uri ? (
          <Image source={{ uri }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.placeholder,
              { backgroundColor: palette.infoContainer },
            ]}
          >
            <SymbolView
              name={{
                ios: 'person.crop.circle.badge.plus',
                android: 'add_a_photo',
                web: 'add_a_photo',
              }}
              size={42}
              tintColor={colors.brand}
            />
          </View>
        )}
        {uploading ? (
          <View style={styles.avatarUploadOverlay}>
            <ActivityIndicator color={colors.onBrand} />
            <Text style={styles.avatarUploadText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        ) : (
          <View style={styles.editBadge}>
            <SymbolView
              name={{
                ios: uri ? 'pencil' : 'plus',
                android: uri ? 'edit' : 'add',
                web: uri ? 'edit' : 'add',
              }}
              size={18}
              tintColor={palette.surface}
            />
          </View>
        )}
      </View>
      <Text style={styles.avatarAction}>{actionLabel}</Text>
      <Text style={styles.avatarHint}>{t('common.avatarHint')}</Text>
    </Pressable>
  );
}

export function ImageUploader({
  onPick,
  loading,
}: {
  onPick: (asset: PickedImage) => void;
  loading?: boolean;
}) {
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? ((key: keyof typeof messages.vi) => messages.vi[key]);
  return (
    <Button
      label={t('common.selectPhoto')}
      loading={loading}
      variant="secondary"
      onPress={async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          allowsMultipleSelection: false,
        });
        const asset = result.assets?.[0];
        if (!result.canceled && asset) onPick(asset);
      }}
    />
  );
}

export function FileUploader({
  onPick,
  loading,
}: {
  onPick: (asset: DocumentPicker.DocumentPickerAsset) => void;
  loading?: boolean;
}) {
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? ((key: keyof typeof messages.vi) => messages.vi[key]);
  return (
    <Button
      label={t('common.selectFile')}
      loading={loading}
      variant="secondary"
      onPress={async () => {
        const result = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets[0]) onPick(result.assets[0]);
      }}
    />
  );
}

export function MediaPlaceholder({ label }: { label?: string }) {
  const i18n = useOptionalI18n();
  const resolvedLabel =
    label ?? i18n?.t('common.noContent') ?? messages.vi['common.noContent'];
  return (
    <View accessibilityLabel={resolvedLabel} style={styles.mediaPlaceholder}>
      <Text style={styles.placeholderText}>▧</Text>
      <Text>{resolvedLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 144,
    height: 144,
    overflow: 'hidden',
    borderRadius: radius.md,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.discovery.scrim,
  },
  overlayText: {
    color: colors.onBrand,
    fontFamily: typography.semibold,
    textAlign: 'center',
  },
  inlineAction: {
    minHeight: 44,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionText: { color: colors.onBrand, textDecorationLine: 'underline' },
  remove: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.discovery.scrimSoft,
  },
  removeText: { color: colors.onBrand, fontSize: 24 },
  avatarPicker: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatarFrame: {
    position: 'relative',
    width: 152,
    height: 152,
  },
  avatar: { width: 152, height: 152, borderRadius: 76 },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand,
  },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 8,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
  },
  avatarUploadOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.discovery.scrim,
  },
  avatarUploadText: {
    color: colors.onBrand,
    fontFamily: typography.semibold,
  },
  avatarAction: {
    color: colors.brand,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  avatarHint: {
    fontFamily: typography.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  placeholderText: { color: colors.brand, fontFamily: typography.semibold },
  mediaPlaceholder: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
});
