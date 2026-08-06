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
import { useI18n } from '@/i18n/i18n-provider';
import { onboardingApi } from '@/features/onboarding/onboarding.api';
import { portfolioWarning } from '@/features/onboarding/onboarding.model';
import { useAppSnackbar } from '@/hooks/use-app-snackbar';
import { useSession } from '@/providers/session-provider';
import { useTheme } from '@/providers/theme-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';
import { profileApi } from './profile.api';
import type { PortfolioDraft } from './profile.types';

const emptyDraft: PortfolioDraft = { title: '', description: '' };

export function PortfolioScreen() {
  const session = useSession();
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
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
      showSnackbar({ message: t('profile.addedPhoto') });
    } catch {
      setUploadStatus('failed');
      showSnackbar({
        message: t('profile.cannotAddPhoto'),
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
      showSnackbar({ message: t('profile.updatedPhoto') });
    } catch {
      showSnackbar({
        message: t('profile.cannotUpdatePhoto'),
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
    } catch {
      showSnackbar({
        message: t('profile.cannotLoadPhoto'),
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
      showSnackbar({ message: t('profile.deletedPhoto') });
    } catch {
      showSnackbar({
        message: t('profile.cannotDeletePhoto'),
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
    } catch {
      showSnackbar({
        message: t('profile.cannotReorder'),
      });
    }
  };
  if (!user || portfolio.isPending)
    return <LoadingState label={t('profile.portfolioLoading')} />;
  if (role !== 'PHOTOGRAPHER' || !roleId)
    return <AccessDeniedState message={t('common.accessDenied')} />;
  if (portfolio.isError || !portfolio.data)
    return (
      <ErrorState
        title={t('profile.loadError')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void portfolio.refetch()}
      />
    );
  const warning = portfolioWarning('PHOTOGRAPHER', portfolio.data.length);
  return (
    <AppScreen>
      <Button
        label={t('profile.back')}
        variant="ghost"
        onPress={() => router.back()}
      />
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.text }]}
          >
            {t('profile.portfolioManageTitle')}
          </Text>
          <Text style={[styles.muted, { color: palette.muted }]}>
            {t('profile.portfolioMinimum', { count: portfolio.data.length })}
          </Text>
        </View>
        <Button
          label={t('profile.addPhoto')}
          onPress={() => {
            setCreateOpen(true);
            setUploadStatus('queued');
          }}
        />
      </View>
      {warning ? (
        <View
          style={[
            styles.warning,
            { backgroundColor: palette.warningContainer },
          ]}
        >
          <Text style={[styles.warningText, { color: palette.warning }]}>
            {t('profile.portfolioWarning')}
          </Text>
        </View>
      ) : null}
      {portfolio.data.length === 0 ? (
        <EmptyState
          title={t('profile.portfolioEmptyTitle')}
          message={t('profile.portfolioEmptyMessage')}
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
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.text }]}
          >
            {t('profile.addPortfolioPhoto')}
          </Text>
          <Text style={[styles.muted, { color: palette.muted }]}>
            {t('profile.imageRequirements')}
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
            label={t('profile.title')}
            value={draft.title}
            onChangeText={(title) => setDraft((value) => ({ ...value, title }))}
            maxLength={120}
          />
          <TextField
            label={t('profile.description')}
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
            label={t('profile.uploadSave')}
            onPress={() => void uploadAndCreate()}
            disabled={!picked}
            loading={busy}
          />
          <Button
            label={t('profile.cancel')}
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
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: palette.text }]}
            >
              {t('profile.editPhoto')}
            </Text>
            <TextField
              label={t('profile.title')}
              value={editItem.draft.title}
              onChangeText={(title) =>
                setEditItem(
                  (value) =>
                    value && { ...value, draft: { ...value.draft, title } },
                )
              }
            />
            <TextField
              label={t('profile.description')}
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
              label={t('profile.saveChanges')}
              onPress={() => void saveEdit()}
              loading={busy}
            />
            <Button
              label={t('profile.cancel')}
              variant="secondary"
              onPress={() => {
                if (!dirty(editItem.draft, editItem.original))
                  setEditItem(null);
                else showSnackbar({ message: t('profile.unsavedChanges') });
              }}
              disabled={busy}
            />
          </AppScreen>
        ) : null}
      </Modal>
      <ConfirmDialog
        visible={Boolean(deleteItem)}
        title={t('profile.deletePortfolioTitle')}
        message={t('profile.deletePortfolioMessage')}
        confirmLabel={t('profile.deletePhoto')}
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
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const url = useQuery({
    queryKey: queryKeys.public('asset', { assetId: item.assetId }),
    queryFn: () => profileApi.assetUrl(item.assetId),
    retry: 1,
  });
  return (
    <View style={[styles.row, { backgroundColor: palette.surface }]}>
      {url.data ? (
        <Image
          source={{ uri: url.data }}
          style={styles.rowImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.rowImage}>
          <MediaPlaceholder label={t('profile.imageUnavailable')} />
        </View>
      )}
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: palette.text }]}>
          {item.title || t('profile.noTitle')}
        </Text>
        {item.description ? (
          <Text numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label={t('profile.moveUp')}
            variant="ghost"
            onPress={() => onMove(-1)}
            disabled={index === 0}
          />
          <Button
            label={t('profile.moveDown')}
            variant="ghost"
            onPress={() => onMove(1)}
          />
          <Button
            label={t('profile.editShort')}
            variant="secondary"
            onPress={onEdit}
          />
          <Button
            label={t('profile.deleteShort')}
            variant="danger"
            onPress={onDelete}
          />
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
  const { t } = useI18n();
  return (
    <Select
      label={t('profile.linkedService')}
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
    fontFamily: typography.bold,
    fontSize: 24,
  },
  muted: {},
  warning: {
    padding: spacing.md,
    borderRadius: radius.md,
  },
  warningText: { fontFamily: typography.semibold },
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  rowImage: {
    width: 100,
    height: 100,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  rowContent: { flex: 1, gap: spacing.xs },
  rowTitle: { fontFamily: typography.semibold },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
