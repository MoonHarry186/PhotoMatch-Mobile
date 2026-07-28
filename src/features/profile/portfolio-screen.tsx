import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import {
  AccessDeniedState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import {
  ImageUploader,
  MediaPlaceholder,
  UploadThumbnail,
  type PickedImage,
} from '@/components/media/media-components';
import { Button, ConfirmDialog, Select, TextField } from '@/components/ui';
import { onboardingApi } from '@/features/onboarding/onboarding.api';
import { portfolioWarning } from '@/features/onboarding/onboarding.model';
import { useAppSnackbar } from '@/hooks/use-app-snackbar';
import { useSession } from '@/providers/session-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';
import { profileApi } from './profile.api';
import type { PortfolioDraft } from './profile.types';

const emptyDraft: PortfolioDraft = { title: '', description: '' };

export function PortfolioScreen() {
  const session = useSession();
  const router = useRouter();
  const client = useQueryClient();
  const { showSnackbar } = useAppSnackbar();
  const user = session.snapshot?.user;
  const roleId = user?.currentRoleId;
  const role = user?.roles.find((item) => item.id === roleId)?.code;
  const scope = { userId: user?.id ?? 'unknown', roleId: roleId ?? null };
  const portfolio = useQuery({
    queryKey: [...queryKeys.portfolio(scope), roleId ?? 'no-role'],
    queryFn: () => profileApi.portfolio(roleId!),
    enabled: role === 'PHOTOGRAPHER' && Boolean(roleId),
  });
  const services = useQuery({
    queryKey: [...queryKeys.selectedServices(scope), roleId ?? 'no-role'],
    queryFn: () => onboardingApi.selectedServices(roleId!),
    enabled: role === 'PHOTOGRAPHER' && Boolean(roleId),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<{
    id: string;
    draft: PortfolioDraft;
    original: PortfolioDraft;
  } | null>(null);
  const [deleteItem, setDeleteItem] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    'queued' | 'uploading' | 'failed'
  >('queued');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draft, setDraft] = useState<PortfolioDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const offeredServices = useMemo(
    () =>
      (services.data ?? []).filter((item) => item.serviceMode === 'OFFERED'),
    [services.data],
  );
  const refresh = () => {
    void client.invalidateQueries({ queryKey: queryKeys.portfolio(scope) });
    void client.invalidateQueries({ queryKey: queryKeys.onboarding(scope) });
  };
  const uploadAndCreate = async () => {
    if (!picked || !roleId) return;
    setBusy(true);
    setUploadStatus('uploading');
    try {
      const asset = await profileApi.uploadPortfolio(picked, setUploadProgress);
      await profileApi.createPortfolio(roleId, {
        assetId: asset.id,
        title: draft.title.trim() || undefined,
        description: draft.description.trim() || undefined,
        serviceId: draft.serviceId,
      });
      setCreateOpen(false);
      setPicked(null);
      setDraft(emptyDraft);
      setUploadProgress(0);
      refresh();
      showSnackbar({ message: 'Đã thêm ảnh vào portfolio' });
    } catch (error) {
      setUploadStatus('failed');
      showSnackbar({
        message: error instanceof Error ? error.message : 'Không thể thêm ảnh',
      });
    } finally {
      setBusy(false);
    }
  };
  const saveEdit = async () => {
    if (!roleId || !editItem) return;
    setBusy(true);
    try {
      await profileApi.updatePortfolio(roleId, editItem.id, {
        title: editItem.draft.title.trim() || undefined,
        description: editItem.draft.description.trim() || undefined,
        serviceId: editItem.draft.serviceId,
      });
      setEditItem(null);
      refresh();
      showSnackbar({ message: 'Đã cập nhật thông tin ảnh' });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : 'Không thể cập nhật ảnh',
      });
    } finally {
      setBusy(false);
    }
  };
  const openEdit = async (item: { id: string }) => {
    if (!roleId) return;
    try {
      const detail = await profileApi.portfolioDetail(roleId, item.id);
      const original = {
        title: detail.title ?? '',
        description: detail.description ?? '',
        serviceId: detail.serviceId ?? undefined,
      };
      setEditItem({ id: detail.id, draft: original, original });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : 'Không thể tải chi tiết ảnh',
      });
    }
  };
  const confirmDelete = async () => {
    if (!roleId || !deleteItem) return;
    setBusy(true);
    try {
      await profileApi.deletePortfolio(roleId, deleteItem);
      setDeleteItem(null);
      refresh();
      showSnackbar({ message: 'Ảnh đã được xoá khỏi portfolio' });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : 'Không thể xoá ảnh',
      });
    } finally {
      setBusy(false);
    }
  };
  const move = async (index: number, direction: -1 | 1) => {
    if (!roleId || !portfolio.data) return;
    const target = index + direction;
    if (target < 0 || target >= portfolio.data.length) return;
    const items = [...portfolio.data];
    const current = items[index];
    const next = items[target];
    if (!current || !next) return;
    items[index] = next;
    items[target] = current;
    try {
      await profileApi.reorderPortfolio(
        roleId,
        items.map((item, sortOrder) => ({ id: item.id, sortOrder })),
      );
      refresh();
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error
            ? error.message
            : 'Không thể sắp xếp portfolio',
      });
    }
  };
  if (!user || portfolio.isPending)
    return <LoadingState label="Đang tải portfolio…" />;
  if (role !== 'PHOTOGRAPHER' || !roleId)
    return (
      <AccessDeniedState message="Chỉ Photographer mới có thể quản lý portfolio." />
    );
  if (portfolio.isError || !portfolio.data)
    return (
      <ErrorState
        title="Không thể tải portfolio"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void portfolio.refetch()}
      />
    );
  const warning = portfolioWarning('PHOTOGRAPHER', portfolio.data.length);
  return (
    <AppScreen>
      <Button
        label="Quay lại hồ sơ"
        variant="ghost"
        onPress={() => router.back()}
      />
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.title}>
            Quản lý portfolio
          </Text>
          <Text style={styles.muted}>
            {portfolio.data.length}/6 ảnh tối thiểu
          </Text>
        </View>
        <Button
          label="Thêm ảnh"
          onPress={() => {
            setCreateOpen(true);
            setUploadStatus('queued');
          }}
        />
      </View>
      {warning ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ) : null}
      {portfolio.data.length === 0 ? (
        <EmptyState
          title="Portfolio đang trống"
          message="Thêm ảnh đầu tiên để giới thiệu phong cách của bạn."
        />
      ) : (
        <View style={styles.list}>
          {portfolio.data.map((item, index) => (
            <PortfolioRow
              key={item.id}
              item={item}
              index={index}
              onEdit={() => void openEdit(item)}
              onDelete={() => setDeleteItem(item.id)}
              onMove={(direction) => void move(index, direction)}
            />
          ))}
        </View>
      )}
      <Modal
        visible={createOpen}
        animationType="slide"
        onRequestClose={() => !busy && setCreateOpen(false)}
      >
        <AppScreen>
          <Text accessibilityRole="header" style={styles.title}>
            Thêm ảnh portfolio
          </Text>
          <Text style={styles.muted}>
            Ảnh JPG, PNG hoặc WebP, tối đa 10 MB.
          </Text>
          {picked ? (
            <UploadThumbnail
              uri={picked.uri}
              status={uploadStatus}
              progress={uploadProgress}
              onRetry={() => void uploadAndCreate()}
              onRemove={() => setPicked(null)}
            />
          ) : (
            <ImageUploader
              onPick={(image) => setPicked(image)}
              loading={busy}
            />
          )}
          <TextField
            label="Tiêu đề"
            value={draft.title}
            onChangeText={(title) => setDraft((value) => ({ ...value, title }))}
            maxLength={120}
          />
          <TextField
            label="Mô tả"
            value={draft.description}
            onChangeText={(description) =>
              setDraft((value) => ({ ...value, description }))
            }
            multiline
            maxLength={500}
          />
          <ServiceSelect
            services={offeredServices}
            value={draft.serviceId}
            onChange={(serviceId) =>
              setDraft((value) => ({ ...value, serviceId }))
            }
          />
          <Button
            label="Tải lên và lưu"
            onPress={() => void uploadAndCreate()}
            disabled={!picked}
            loading={busy}
          />
          <Button
            label="Huỷ"
            variant="secondary"
            onPress={() => setCreateOpen(false)}
            disabled={busy}
          />
        </AppScreen>
      </Modal>
      <Modal
        visible={Boolean(editItem)}
        animationType="slide"
        onRequestClose={() => {
          if (!busy && editItem && !dirty(editItem.draft, editItem.original))
            setEditItem(null);
        }}
      >
        {editItem ? (
          <AppScreen>
            <Text accessibilityRole="header" style={styles.title}>
              Chỉnh sửa ảnh
            </Text>
            <TextField
              label="Tiêu đề"
              value={editItem.draft.title}
              onChangeText={(title) =>
                setEditItem(
                  (value) =>
                    value && { ...value, draft: { ...value.draft, title } },
                )
              }
            />
            <TextField
              label="Mô tả"
              value={editItem.draft.description}
              onChangeText={(description) =>
                setEditItem(
                  (value) =>
                    value && {
                      ...value,
                      draft: { ...value.draft, description },
                    },
                )
              }
              multiline
            />
            <ServiceSelect
              services={offeredServices}
              value={editItem.draft.serviceId}
              onChange={(serviceId) =>
                setEditItem(
                  (value) =>
                    value && { ...value, draft: { ...value.draft, serviceId } },
                )
              }
            />
            <Button
              label="Lưu thay đổi"
              onPress={() => void saveEdit()}
              loading={busy}
            />
            <Button
              label="Huỷ"
              variant="secondary"
              onPress={() => {
                if (!dirty(editItem.draft, editItem.original))
                  setEditItem(null);
                else showSnackbar({ message: 'Bạn còn thay đổi chưa lưu' });
              }}
              disabled={busy}
            />
          </AppScreen>
        ) : null}
      </Modal>
      <ConfirmDialog
        visible={Boolean(deleteItem)}
        title="Xoá ảnh portfolio?"
        message="Ảnh sẽ bị ẩn khỏi hồ sơ công khai và không còn tính vào điều kiện 6 ảnh."
        confirmLabel="Xoá ảnh"
        destructive
        loading={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteItem(null)}
      />
    </AppScreen>
  );
}

function PortfolioRow({
  item,
  index,
  onEdit,
  onDelete,
  onMove,
}: {
  item: {
    id: string;
    assetId: string;
    title?: string | null;
    description?: string | null;
  };
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const url = useQuery({
    queryKey: queryKeys.public('asset', { assetId: item.assetId }),
    queryFn: () => profileApi.assetUrl(item.assetId),
    retry: 1,
  });
  return (
    <View style={styles.row}>
      {url.data ? (
        <Image
          source={{ uri: url.data }}
          style={styles.rowImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.rowImage}>
          <MediaPlaceholder label="Ảnh không khả dụng" />
        </View>
      )}
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{item.title || 'Chưa đặt tiêu đề'}</Text>
        {item.description ? (
          <Text numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label="Lên"
            variant="ghost"
            onPress={() => onMove(-1)}
            disabled={index === 0}
          />
          <Button label="Xuống" variant="ghost" onPress={() => onMove(1)} />
          <Button label="Sửa" variant="secondary" onPress={onEdit} />
          <Button label="Xoá" variant="danger" onPress={onDelete} />
        </View>
      </View>
    </View>
  );
}

function ServiceSelect({
  services,
  value,
  onChange,
}: {
  services: { service: { id: string; name: string } }[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      label="Dịch vụ liên kết (tuỳ chọn)"
      options={services.map((item) => ({
        value: item.service.id,
        label: item.service.name,
      }))}
      value={value}
      onChange={(next) => onChange(next as string)}
    />
  );
}

function dirty(a: PortfolioDraft, b: PortfolioDraft) {
  return (
    a.title !== b.title ||
    a.description !== b.description ||
    a.serviceId !== b.serviceId
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 24,
  },
  muted: { color: colors.light.muted },
  warning: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.light.warningContainer,
  },
  warningText: { color: colors.warning, fontFamily: typography.semibold },
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
  },
  rowImage: {
    width: 100,
    height: 100,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.light.surfaceVariant,
  },
  rowContent: { flex: 1, gap: spacing.xs },
  rowTitle: { fontFamily: typography.semibold },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
