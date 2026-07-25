import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

import { Button } from '../ui';

type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
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
  return (
    <View style={styles.thumbnail}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      {status === 'uploading' ? (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.overlayText}>
            Đang tải {Math.round(progress * 100)}%
          </Text>
        </View>
      ) : null}
      {status === 'failed' ? (
        <View style={styles.uploadOverlay}>
          <Text style={styles.overlayText}>⚠ Upload thất bại</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thử tải lại ảnh"
            style={styles.inlineAction}
            onPress={onRetry}
          >
            <Text style={styles.inlineActionText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xóa ảnh"
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
}: {
  uri?: string | null;
  onPick: (asset: PickedImage) => void;
}) {
  const pick = async () => {
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
      accessibilityLabel="Chọn ảnh đại diện"
      onPress={pick}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.placeholder]}>
          <Text style={styles.placeholderText}>Ảnh</Text>
        </View>
      )}
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
  return (
    <Button
      label="Chọn ảnh"
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
  return (
    <Button
      label="Chọn tệp"
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

export function MediaPlaceholder({
  label = 'Không thể tải nội dung',
}: {
  label?: string;
}) {
  return (
    <View accessibilityLabel={label} style={styles.mediaPlaceholder}>
      <Text style={styles.placeholderText}>▧</Text>
      <Text>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 144,
    height: 144,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.light.surfaceVariant,
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
    backgroundColor: 'rgba(2,6,23,0.68)',
  },
  overlayText: {
    color: '#FFFFFF',
    fontFamily: typography.semibold,
    textAlign: 'center',
  },
  inlineAction: {
    minHeight: 44,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionText: { color: '#FFFFFF', textDecorationLine: 'underline' },
  remove: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(2,6,23,0.64)',
  },
  removeText: { color: '#FFFFFF', fontSize: 24 },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: colors.brand,
  },
  placeholderText: { color: colors.brand, fontFamily: typography.semibold },
  mediaPlaceholder: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#E2E8F0',
  },
});
