import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  AvatarPicker,
  UploadThumbnail,
  type PickedImage,
  type UploadStatus,
} from '@/components/media/media-components';
import { Button, MultiSelect, Select, TextField } from '@/components/ui';
import {
  AppError,
  applyServerFieldErrors,
  getUserErrorMessage,
  normalizeError,
} from '@/core/errors';
import type {
  OnboardingProgressResponse,
  ServiceSelectionDto,
  UserSummary,
} from '@/generated/api/types.gen';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';

import { onboardingApi, uploadAndAttachAvatar } from './onboarding.api';
import {
  canChooseAdditionalRole,
  discoveryReasonLabels,
  findRole,
  invalidCatalogSelection,
  missingLabels,
  portfolioWarning,
} from './onboarding.model';
import {
  personalProfileSchema,
  servicesSchema,
  type PersonalProfileForm,
  type ServicesForm,
} from './onboarding.schemas';
import type { RoleCode, SelfProfile } from './onboarding.types';

type Scope = { userId: string; roleId?: string | null };
type ResolvedScope = { userId: string; roleId: string };

function actionErrorMessage(caught: unknown) {
  if (caught instanceof AppError) return getUserErrorMessage(caught);
  if (caught instanceof Error && caught.message) return caught.message;
  return getUserErrorMessage(normalizeError(caught));
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

function FormError({ message }: { message?: string | null }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

export function PersonalProfileSection({
  profile,
  scope,
  onSaved,
}: {
  profile?: SelfProfile;
  scope: Scope;
  onSaved: () => Promise<void> | void;
}) {
  const cities = useQuery({
    queryKey: queryKeys.public('cities'),
    queryFn: onboardingApi.cities,
  });
  const mutation = useMutation({ mutationFn: onboardingApi.updateSelf });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PersonalProfileForm>({
    resolver: zodResolver(personalProfileSchema),
    defaultValues: {
      displayName: profile?.displayName ?? '',
      dateOfBirth: profile?.dateOfBirth?.slice(0, 10) ?? '',
      cityId: profile?.cityId ?? '',
      bio: profile?.bio ?? '',
    },
  });

  useEffect(() => {
    reset({
      displayName: profile?.displayName ?? '',
      dateOfBirth: profile?.dateOfBirth?.slice(0, 10) ?? '',
      cityId: profile?.cityId ?? '',
      bio: profile?.bio ?? '',
    });
  }, [profile, reset]);

  const submit = handleSubmit(async (value) => {
    try {
      await mutation.mutateAsync(value);
      await onSaved();
    } catch (caught) {
      const error = normalizeError(caught);
      applyServerFieldErrors(error.fieldErrors, (field, message) => {
        if (
          field === 'displayName' ||
          field === 'dateOfBirth' ||
          field === 'cityId' ||
          field === 'bio'
        ) {
          setError(field, { message });
        }
      });
      setError('root', { message: getUserErrorMessage(error) });
    }
  });

  return (
    <>
      <SectionHeader
        title="Thông tin cá nhân"
        description="Thông tin cơ bản giúp hồ sơ của bạn rõ ràng và đáng tin cậy hơn."
      />
      <Controller
        control={control}
        name="displayName"
        render={({ field }) => (
          <TextField
            label="Tên hiển thị"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.displayName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="dateOfBirth"
        render={({ field }) => (
          <TextField
            label="Ngày sinh"
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.dateOfBirth?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="cityId"
        render={({ field }) => (
          <Select
            label="Thành phố"
            value={field.value}
            options={(cities.data ?? []).map((city) => ({
              value: city.id,
              label: city.name,
            }))}
            onChange={(value) => field.onChange(value)}
            error={errors.cityId?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="bio"
        render={({ field }) => (
          <TextField
            label="Giới thiệu"
            multiline
            numberOfLines={4}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.bio?.message}
          />
        )}
      />
      <FormError message={errors.root?.message} />
      <Button
        label="Lưu và tiếp tục"
        loading={isSubmitting || mutation.isPending}
        onPress={() => void submit()}
      />
    </>
  );
}

export function AvatarSection({
  profile,
  scope,
  onSaved,
  onSkip,
}: {
  profile?: SelfProfile;
  scope: Scope;
  onSaved: () => Promise<void> | void;
  onSkip?: () => void;
}) {
  const queryClient = useQueryClient();
  const avatarUrl = useQuery({
    queryKey: profile?.avatarAssetId
      ? queryKeys.assetUrl(scope, profile.avatarAssetId)
      : [...queryKeys.selfProfile(scope), 'no-avatar'],
    queryFn: () => onboardingApi.assetUrl(profile?.avatarAssetId ?? ''),
    enabled: Boolean(profile?.avatarAssetId),
  });
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [status, setStatus] = useState<UploadStatus>('queued');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [settingsRequired, setSettingsRequired] = useState(false);

  const upload = async (asset: PickedImage) => {
    setError(null);
    setStatus('uploading');
    try {
      await uploadAndAttachAvatar(asset, setProgress);
      setStatus('uploaded');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.selfProfile(scope),
      });
      await onSaved();
    } catch (caught) {
      setStatus('failed');
      setError(actionErrorMessage(caught));
    }
  };

  return (
    <>
      <SectionHeader
        title="Ảnh đại diện"
        description="Chọn ảnh vuông, rõ khuôn mặt. Bạn có thể bỏ qua và bổ sung sau."
      />
      <View style={styles.center}>
        <AvatarPicker
          uri={picked?.uri ?? avatarUrl.data}
          onPick={(asset) => {
            setPicked(asset);
            setStatus('queued');
            setProgress(0);
            void upload(asset);
          }}
          onPermissionDenied={(canAskAgain) => {
            setSettingsRequired(!canAskAgain);
            setError(
              canAskAgain
                ? 'PhotoMatch cần quyền truy cập ảnh để chọn ảnh đại diện.'
                : 'Quyền truy cập ảnh đang bị tắt. Hãy bật lại trong Cài đặt.',
            );
          }}
        />
      </View>
      {picked ? (
        <UploadThumbnail
          uri={picked.uri}
          status={status}
          progress={progress}
          onRetry={() => void upload(picked)}
          onRemove={() => {
            setPicked(null);
            setProgress(0);
            setStatus('queued');
          }}
        />
      ) : null}
      <FormError message={error} />
      {settingsRequired ? (
        <Button
          label="Mở Cài đặt"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
      {onSkip ? (
        <Button label="Bổ sung sau" variant="ghost" onPress={onSkip} />
      ) : null}
    </>
  );
}

export function RoleSection({
  user,
  onSelected,
}: {
  user: UserSummary;
  onSelected: () => Promise<void> | void;
}) {
  const available = useQuery({
    queryKey: queryKeys.availableRoles({
      userId: user.id,
      roleId: user.currentRoleId,
    }),
    queryFn: onboardingApi.availableRoles,
  });
  const mutation = useMutation({
    mutationFn: async (role: RoleCode) => {
      const existing = findRole(user.roles, role);
      const selected =
        existing ??
        (canChooseAdditionalRole(user.roles, user.onboardingCompletedAt)
          ? await onboardingApi.addRole(role)
          : undefined);
      if (!selected)
        throw new Error('Vai trò bổ sung đã được chọn và không thể thay thế');
      if (selected.id !== user.currentRoleId)
        await onboardingApi.switchRole(selected.id);
    },
  });
  const [error, setError] = useState<string | null>(null);

  const choose = async (role: RoleCode) => {
    try {
      setError(null);
      await mutation.mutateAsync(role);
      await onSelected();
    } catch (caught) {
      setError(actionErrorMessage(caught));
    }
  };
  const immutable = !canChooseAdditionalRole(
    user.roles,
    user.onboardingCompletedAt,
  );

  return (
    <>
      <SectionHeader
        title="Bạn dùng PhotoMatch với vai trò nào?"
        description="Mọi tài khoản luôn có vai trò khách hàng. Bạn có thể chọn thêm Photographer một lần."
      />
      {(available.data ?? []).map((role) => {
        const owned = Boolean(findRole(user.roles, role.code));
        const disabled = immutable && !owned;
        return (
          <Pressable
            key={role.id}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: owned }}
            disabled={disabled || mutation.isPending}
            onPress={() => void choose(role.code)}
            style={[styles.roleCard, owned && styles.roleCardSelected]}
          >
            <Text style={styles.cardTitle}>{role.name}</Text>
            <Text style={styles.description}>
              {role.code === 'CUSTOMER'
                ? 'Tìm và đặt lịch photographer phù hợp.'
                : 'Nhận nhu cầu, giới thiệu dịch vụ và portfolio.'}
            </Text>
            {owned ? (
              <Text style={styles.success}>Đã có trên tài khoản</Text>
            ) : null}
          </Pressable>
        );
      })}
      {immutable ? (
        <Text style={styles.note}>
          Vai trò bổ sung đã được xác nhận và không thể thay thế.
        </Text>
      ) : null}
      <FormError message={error} />
    </>
  );
}

export function ActivityFieldsSection({
  scope,
  role,
  onSaved,
}: {
  scope: ResolvedScope;
  role: RoleCode;
  onSaved: () => Promise<void> | void;
}) {
  const catalog = useQuery({
    queryKey: queryKeys.public('activity-fields', { role }),
    queryFn: () => onboardingApi.fieldsForRole(role),
  });
  const selected = useQuery({
    queryKey: queryKeys.activityFields(scope),
    queryFn: () => onboardingApi.selectedFields(scope.roleId),
  });
  const [valueOverride, setValueOverride] = useState<string[] | null>(null);
  const values =
    valueOverride ?? selected.data?.map((item) => item.activityField.id) ?? [];
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => onboardingApi.replaceFields(scope.roleId, values),
  });

  return (
    <>
      <SectionHeader
        title="Lĩnh vực hoạt động"
        description="Danh mục được lọc theo vai trò hiện tại và được lưu thay thế nguyên tử."
      />
      <MultiSelect
        label="Chọn một hoặc nhiều lĩnh vực"
        options={(catalog.data ?? []).map((item) => ({
          value: item.id,
          label: item.name,
        }))}
        values={values}
        onChange={(value) => setValueOverride(value as string[])}
        error={error ?? undefined}
      />
      <Button
        label="Lưu và tiếp tục"
        loading={mutation.isPending}
        onPress={() => {
          if (!values.length) {
            setError('Chọn ít nhất một lĩnh vực');
            return;
          }
          if (
            invalidCatalogSelection(
              values,
              (catalog.data ?? []).map((item) => item.id),
            ).length
          ) {
            setError(
              'Danh mục vừa thay đổi. Vui lòng bỏ lựa chọn không còn hợp lệ.',
            );
            void catalog.refetch();
            return;
          }
          setError(null);
          void mutation
            .mutateAsync()
            .then(onSaved)
            .catch((caught) =>
              setError(getUserErrorMessage(normalizeError(caught))),
            );
        }}
      />
    </>
  );
}

type ServiceDraft = {
  mode: 'OFFERED' | 'WANTED';
  min: string;
  max: string;
  unit: string;
};

export function ServicesSection({
  scope,
  role,
  onSaved,
}: {
  scope: ResolvedScope;
  role: RoleCode;
  onSaved: () => Promise<void> | void;
}) {
  const fields = useQuery({
    queryKey: queryKeys.activityFields(scope),
    queryFn: () => onboardingApi.selectedFields(scope.roleId),
  });
  const fieldIds = useMemo(
    () => fields.data?.map((item) => item.activityField.id) ?? [],
    [fields.data],
  );
  const catalog = useQuery({
    queryKey: queryKeys.public('services', { activityFieldIds: fieldIds }),
    queryFn: () => onboardingApi.servicesForFields(fieldIds),
    enabled: fieldIds.length > 0,
  });
  const selected = useQuery({
    queryKey: queryKeys.selectedServices(scope),
    queryFn: () => onboardingApi.selectedServices(scope.roleId),
  });
  const [selectedIdsOverride, setSelectedIdsOverride] = useState<
    string[] | null
  >(null);
  const selectedIds =
    selectedIdsOverride ?? selected.data?.map((item) => item.service.id) ?? [];
  const [drafts, setDrafts] = useState<Record<string, ServiceDraft>>({});
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (services: ServiceSelectionDto[]) =>
      onboardingApi.replaceServices(scope.roleId, services),
  });
  const draftFor = (id: string): ServiceDraft =>
    drafts[id] ??
    (() => {
      const saved = selected.data?.find((item) => item.service.id === id);
      return {
        mode:
          saved?.serviceMode ??
          (role === 'PHOTOGRAPHER' ? 'OFFERED' : 'WANTED'),
        min: saved?.minPrice?.toString() ?? '',
        max: saved?.maxPrice?.toString() ?? '',
        unit: saved?.priceUnit ?? '',
      };
    })();
  const update = (id: string, value: Partial<ServiceDraft>) =>
    setDrafts((current) => ({
      ...current,
      [id]: { ...draftFor(id), ...value },
    }));

  const save = async () => {
    const services: ServicesForm['services'] = selectedIds.map((serviceId) => {
      const draft = draftFor(serviceId);
      return {
        serviceId,
        serviceMode: draft.mode,
        ...(draft.min ? { minPrice: Number(draft.min) } : {}),
        ...(draft.max ? { maxPrice: Number(draft.max) } : {}),
        ...(draft.unit ? { priceUnit: draft.unit } : {}),
      };
    });
    const parsed = servicesSchema.safeParse({ services });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ');
      return;
    }
    try {
      setError(null);
      await mutation.mutateAsync(parsed.data.services);
      await onSaved();
    } catch (caught) {
      setError(actionErrorMessage(caught));
    }
  };

  return (
    <>
      <SectionHeader
        title="Dịch vụ và mức giá"
        description="Dịch vụ phải thuộc lĩnh vực đã chọn. Đơn vị tiền tệ được cố định là VND."
      />
      <MultiSelect
        label="Dịch vụ"
        options={(catalog.data ?? []).map((item) => ({
          value: item.id,
          label: item.name,
        }))}
        values={selectedIds}
        onChange={(value) => setSelectedIdsOverride(value as string[])}
      />
      {selectedIds.map((id) => {
        const service = catalog.data?.find((item) => item.id === id);
        const draft = draftFor(id);
        return (
          <View key={id} style={styles.serviceCard}>
            <Text style={styles.cardTitle}>{service?.name ?? 'Dịch vụ'}</Text>
            <Select
              label="Nhu cầu"
              value={draft.mode}
              options={
                role === 'PHOTOGRAPHER'
                  ? [{ value: 'OFFERED', label: 'Cung cấp' }]
                  : [
                      { value: 'WANTED', label: 'Đang tìm' },
                      { value: 'OFFERED', label: 'Cung cấp' },
                    ]
              }
              onChange={(value) =>
                update(id, { mode: value as ServiceDraft['mode'] })
              }
            />
            {draft.mode === 'OFFERED' ? (
              <>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <TextField
                      label="Giá từ (VND)"
                      keyboardType="number-pad"
                      value={draft.min}
                      onChangeText={(min) => update(id, { min })}
                    />
                  </View>
                  <View style={styles.flex}>
                    <TextField
                      label="Giá đến (VND)"
                      keyboardType="number-pad"
                      value={draft.max}
                      onChangeText={(max) => update(id, { max })}
                    />
                  </View>
                </View>
                <TextField
                  label="Đơn vị giá"
                  placeholder="Ví dụ: buổi, giờ, gói"
                  value={draft.unit}
                  onChangeText={(unit) => update(id, { unit })}
                />
              </>
            ) : null}
          </View>
        );
      })}
      <FormError message={error} />
      <Button
        label="Lưu và tiếp tục"
        loading={mutation.isPending}
        onPress={() => void save()}
      />
    </>
  );
}

export function LocationSection({
  scope,
  onSaved,
  onSkip,
}: {
  scope: ResolvedScope;
  onSaved: () => Promise<void> | void;
  onSkip?: () => void;
}) {
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setPermissionBlocked(!permission.canAskAgain);
        throw new Error(
          permission.canAskAgain
            ? 'Bạn chưa cấp quyền vị trí. Có thể thử lại khi sẵn sàng.'
            : 'Quyền vị trí đang bị tắt. Hãy bật lại trong Cài đặt.',
        );
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return onboardingApi.putLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        ...(location.coords.accuracy !== null
          ? { accuracyMeters: location.coords.accuracy }
          : {}),
        capturedAt: new Date(location.timestamp).toISOString(),
      });
    },
  });
  const save = async () => {
    try {
      setError(null);
      await mutation.mutateAsync();
      await onSaved();
    } catch (caught) {
      setError(actionErrorMessage(caught));
    }
  };

  return (
    <>
      <SectionHeader
        title="Vị trí gần bạn"
        description="PhotoMatch chỉ hỏi quyền khi bạn bấm nút dưới đây. Tọa độ chính xác được lưu riêng cho bạn; người khác chỉ thấy khoảng cách đã làm mờ."
      />
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Bạn vẫn kiểm soát việc hiển thị</Text>
        <Text style={styles.description}>
          Lưu vị trí không tự bật trạng thái xuất hiện trong Khám phá. Bạn có
          thể bật/tắt presence sau khi hồ sơ đủ điều kiện.
        </Text>
      </View>
      <FormError message={error} />
      <Button
        label="Dùng vị trí hiện tại"
        loading={mutation.isPending}
        onPress={() => void save()}
      />
      {permissionBlocked ? (
        <Button
          label="Mở Cài đặt"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
      {onSkip ? (
        <Button label="Bổ sung sau" variant="ghost" onPress={onSkip} />
      ) : null}
    </>
  );
}

export function PresenceControl({
  scope,
  progress,
}: {
  scope: ResolvedScope;
  progress: OnboardingProgressResponse;
}) {
  const queryClient = useQueryClient();
  const presence = useQuery({
    queryKey: queryKeys.presence(scope),
    queryFn: onboardingApi.presence,
    enabled: progress.discoveryEligible,
  });
  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      onboardingApi.putPresence({
        userRoleId: scope.roleId,
        enabled,
        visibilityHours: 24,
      }),
    onSuccess: (value) =>
      queryClient.setQueryData(queryKeys.presence(scope), value),
  });
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>Xuất hiện trong Khám phá</Text>
        <Text style={styles.description}>
          {progress.discoveryEligible
            ? 'Hiển thị vị trí gần đúng trong 24 giờ.'
            : 'Hoàn thiện các mục eligibility trước khi bật.'}
        </Text>
      </View>
      <Switch
        accessibilityLabel="Xuất hiện trong Khám phá"
        disabled={!progress.discoveryEligible || mutation.isPending}
        value={presence.data?.isVisible ?? false}
        onValueChange={(value) => mutation.mutate(value)}
      />
      {mutation.error ? (
        <Text style={styles.error}>{actionErrorMessage(mutation.error)}</Text>
      ) : null}
    </View>
  );
}

export function OnboardingSummary({
  progress,
  portfolioCount,
  scope,
  onResume,
  onComplete,
}: {
  progress: OnboardingProgressResponse;
  portfolioCount: number;
  scope: ResolvedScope;
  onResume: () => void;
  onComplete: () => Promise<void> | void;
}) {
  const warning = portfolioWarning(progress.role, portfolioCount);
  return (
    <>
      <SectionHeader
        title={progress.complete ? 'Hồ sơ đã sẵn sàng' : 'Tổng kết hồ sơ'}
        description="Trạng thái dưới đây được lấy trực tiếp từ server."
      />
      {progress.missing.length ? (
        <View style={styles.warningCard}>
          <Text style={styles.cardTitle}>Cần bổ sung</Text>
          {progress.missing.map((item) => (
            <Text key={item}>• {missingLabels[item] ?? item}</Text>
          ))}
        </View>
      ) : (
        <View style={styles.successCard}>
          <Text style={styles.cardTitle}>Đã hoàn tất onboarding</Text>
        </View>
      )}
      {warning ? <Text style={styles.warning}>{warning}</Text> : null}
      {!progress.discoveryEligible ? (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Chưa đủ điều kiện Khám phá</Text>
          {progress.discoveryReasons.map((reason) => (
            <Text key={reason}>
              • {discoveryReasonLabels[reason] ?? reason}
            </Text>
          ))}
        </View>
      ) : (
        <PresenceControl scope={scope} progress={progress} />
      )}
      {progress.complete ? (
        <Button label="Bắt đầu khám phá" onPress={() => void onComplete()} />
      ) : (
        <Button label="Quay lại bổ sung" onPress={onResume} />
      )}
    </>
  );
}

export function PortfolioRequirement({
  role,
  count,
  onSummary,
}: {
  role: RoleCode;
  count: number;
  onSummary: () => void;
}) {
  return (
    <>
      <SectionHeader
        title="Portfolio photographer"
        description="Photographer cần ít nhất 6 ảnh đã upload thành công để hoàn tất onboarding và đủ điều kiện Khám phá."
      />
      <View style={styles.warningCard}>
        <Text style={styles.cardTitle}>{count}/6 ảnh</Text>
        <Text>
          Quản lý upload, retry và sắp xếp portfolio được thực hiện trong màn
          Portfolio. Hồ sơ sẽ không được ghi nhận là discoverable khi chưa đủ 6
          ảnh.
        </Text>
      </View>
      <Button label="Xem tổng kết" variant="secondary" onPress={onSummary} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 26,
  },
  description: { color: colors.light.muted, lineHeight: 21 },
  error: { color: colors.danger },
  warning: { color: colors.warning, fontFamily: typography.semibold },
  success: { color: colors.success, fontFamily: typography.semibold },
  note: {
    color: colors.light.muted,
    backgroundColor: colors.light.surfaceVariant,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  cardTitle: { fontFamily: typography.semibold, color: colors.light.text },
  roleCard: {
    minHeight: 88,
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
  },
  roleCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.light.infoContainer,
  },
  serviceCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
  },
  infoCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.light.infoContainer,
  },
  warningCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.light.warningContainer,
  },
  successCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.light.successContainer,
  },
  switchRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
});
