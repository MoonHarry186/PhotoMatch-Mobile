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
  type PickedImage,
  type UploadStatus,
} from '@/components/media/media-components';
import {
  Button,
  DateTimeField,
  MultiSelect,
  Select,
  TextField,
} from '@/components/ui';
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
import { useI18n } from '@/i18n/i18n-provider';
import type { Locale } from '@/i18n/messages';
import { queryKeys } from '@/services/api/query-keys';
import { useTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

import { onboardingApi, uploadAndAttachAvatar } from './onboarding.api';
import {
  canChooseAdditionalRole,
  discoveryReasonLabelKeys,
  findRole,
  invalidCatalogSelection,
  missingLabelKeys,
  portfolioWarning,
} from './onboarding.model';
import {
  createPersonalProfileSchema,
  createServicesSchema,
  type PersonalProfileForm,
  type ServicesForm,
} from './onboarding.schemas';
import type { RoleCode, SelfProfile } from './onboarding.types';

type Scope = { userId: string; roleId?: string | null };
type ResolvedScope = { userId: string; roleId: string };

function actionErrorMessage(caught: unknown, locale: Locale) {
  if (caught instanceof AppError) return getUserErrorMessage(caught, locale);
  return getUserErrorMessage(normalizeError(caught), locale);
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={styles.header}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: palette.text }]}
      >
        {title}
      </Text>
      <Text style={[styles.description, { color: palette.muted }]}>
        {description}
      </Text>
    </View>
  );
}

function FormError({ message }: { message?: string | null }) {
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  return message ? (
    <Text style={[styles.error, { color: palette.error }]}>{message}</Text>
  ) : null;
}

function useOnboardingPalette() {
  const { resolved } = useTheme();
  return resolved === 'dark' ? colors.dark : colors.light;
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const { locale, t } = useI18n();
  const schema = useMemo(() => createPersonalProfileSchema(t), [t]);
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
    resolver: zodResolver(schema),
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
  const birthDateLimits = useMemo(() => {
    const today = new Date();
    return {
      maximum: new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate(),
      ),
      minimum: new Date(
        today.getFullYear() - 100,
        today.getMonth(),
        today.getDate(),
      ),
    };
  }, []);

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
      setError('root', { message: getUserErrorMessage(error, locale) });
    }
  });

  return (
    <>
      <SectionHeader
        title={t('onboarding.personalTitle')}
        description={t('onboarding.personalDescription')}
      />
      <Controller
        control={control}
        name="displayName"
        render={({ field }) => (
          <TextField
            label={t('onboarding.displayName')}
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
          <DateTimeField
            label={t('onboarding.birthDate')}
            value={parseDateOnly(field.value)}
            minimumDate={birthDateLimits.minimum}
            maximumDate={birthDateLimits.maximum}
            placeholder={t('onboarding.chooseBirthDate')}
            onChange={(value) => field.onChange(formatDateOnly(value))}
            error={errors.dateOfBirth?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="cityId"
        render={({ field }) => (
          <Select
            label={t('onboarding.city')}
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
            label={t('onboarding.bio')}
            placeholder={t('onboarding.bioPlaceholder')}
            multiline
            numberOfLines={5}
            maxLength={1000}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.bio?.message}
          />
        )}
      />
      <FormError message={errors.root?.message} />
      <Button
        label={t('onboarding.saveContinue')}
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
  showContinue = false,
}: {
  profile?: SelfProfile;
  scope: Scope;
  onSaved: () => Promise<void> | void;
  onSkip?: () => void;
  showContinue?: boolean;
}) {
  const { locale, t } = useI18n();
  const palette = useOnboardingPalette();
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
  const [isFinishing, setIsFinishing] = useState(false);

  const upload = async (asset: PickedImage) => {
    setError(null);
    setStatus('uploading');
    try {
      await uploadAndAttachAvatar(asset, setProgress);
      setStatus('uploaded');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.selfProfile(scope),
      });
    } catch (caught) {
      setStatus('failed');
      setError(actionErrorMessage(caught, locale));
    }
  };
  const finish = async () => {
    try {
      setError(null);
      setIsFinishing(true);
      await onSaved();
    } catch (caught) {
      setError(actionErrorMessage(caught, locale));
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <>
      <SectionHeader
        title={t('onboarding.avatarTitle')}
        description={t('onboarding.avatarDescription')}
      />
      <View
        style={[
          styles.avatarCard,
          {
            borderColor: palette.border,
            backgroundColor: palette.surfaceVariant,
          },
        ]}
      >
        <AvatarPicker
          uri={picked?.uri ?? avatarUrl.data}
          uploading={status === 'uploading'}
          progress={progress}
          onPick={(asset) => {
            setSettingsRequired(false);
            setPicked(asset);
            setStatus('queued');
            setProgress(0);
            void upload(asset);
          }}
          onPermissionDenied={(canAskAgain) => {
            setSettingsRequired(!canAskAgain);
            setError(
              canAskAgain
                ? t('onboarding.photoPermission')
                : t('onboarding.photoPermissionSettings'),
            );
          }}
        />
      </View>
      <FormError message={error} />
      {picked && status === 'failed' ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              label={t('onboarding.retryUpload')}
              variant="secondary"
              onPress={() => void upload(picked)}
            />
          </View>
          {profile?.avatarAssetId ? (
            <View style={styles.flex}>
              <Button
                label={t('onboarding.keepCurrent')}
                variant="ghost"
                onPress={() => {
                  setPicked(null);
                  setProgress(0);
                  setStatus('queued');
                  setError(null);
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      {settingsRequired ? (
        <Button
          label={t('common.openSettings')}
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
      {onSkip ? (
        <Button
          label={t('onboarding.addLater')}
          variant="ghost"
          onPress={onSkip}
        />
      ) : null}
      {picked && status === 'uploaded' ? (
        <Button
          label={t('onboarding.doneContinue')}
          loading={isFinishing}
          onPress={() => void finish()}
        />
      ) : null}
      {showContinue && profile?.avatarAssetId && !picked ? (
        <Button
          label={t('onboarding.continue')}
          loading={isFinishing}
          onPress={() => void finish()}
        />
      ) : null}
    </>
  );
}

export function ProviderChoiceSection({
  user,
  onSelected,
}: {
  user: UserSummary;
  onSelected: (role: RoleCode) => Promise<void> | void;
}) {
  const { locale, t } = useI18n();
  const palette = useOnboardingPalette();
  const mutation = useMutation({
    mutationFn: async (becomeProvider: boolean) => {
      const role: RoleCode = becomeProvider ? 'PHOTOGRAPHER' : 'CUSTOMER';
      const existing = findRole(user.roles, role);
      const selected = becomeProvider
        ? (existing ??
          (canChooseAdditionalRole(user.roles, user.onboardingCompletedAt)
            ? await onboardingApi.addRole(role)
            : undefined))
        : existing;
      if (!selected) {
        throw new Error(
          becomeProvider
            ? t('onboarding.providerRoleError')
            : t('onboarding.customerRoleError'),
        );
      }
      await onboardingApi.switchRole(selected.id);
      return role;
    },
  });
  const [error, setError] = useState<string | null>(null);

  const choose = async (becomeProvider: boolean) => {
    try {
      setError(null);
      const role = await mutation.mutateAsync(becomeProvider);
      await onSelected(role);
    } catch (caught) {
      setError(actionErrorMessage(caught, locale));
    }
  };

  return (
    <>
      <SectionHeader
        title={t('onboarding.providerQuestion')}
        description={t('onboarding.providerDescription')}
      />
      <Pressable
        accessibilityRole="button"
        disabled={mutation.isPending}
        onPress={() => void choose(true)}
        style={[
          styles.roleCard,
          styles.providerCard,
          { borderColor: colors.brand, backgroundColor: palette.infoContainer },
        ]}
      >
        <Text style={styles.roleEyebrow}>
          {t('onboarding.providerEyebrow')}
        </Text>
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {t('onboarding.becomeProvider')}
        </Text>
        <Text style={[styles.description, { color: palette.muted }]}>
          {t('onboarding.becomeProviderDescription')}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={mutation.isPending}
        onPress={() => void choose(false)}
        style={[
          styles.roleCard,
          { borderColor: palette.border, backgroundColor: palette.surface },
        ]}
      >
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {t('onboarding.stayCustomer')}
        </Text>
        <Text style={[styles.description, { color: palette.muted }]}>
          {t('onboarding.stayCustomerDescription')}
        </Text>
      </Pressable>
      {mutation.isPending ? (
        <Text
          style={[
            styles.note,
            { color: palette.muted, backgroundColor: palette.surfaceVariant },
          ]}
        >
          {t('onboarding.completing')}
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
  const { locale, t } = useI18n();
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
        title={t('onboarding.activityTitle')}
        description={t('onboarding.activityDescription')}
      />
      <MultiSelect
        label={t('onboarding.activitySelect')}
        options={(catalog.data ?? []).map((item) => ({
          value: item.id,
          label: item.name,
        }))}
        values={values}
        onChange={(value) => setValueOverride(value as string[])}
        error={error ?? undefined}
      />
      <Button
        label={t('onboarding.saveContinue')}
        loading={mutation.isPending}
        onPress={() => {
          if (!values.length) {
            setError(t('onboarding.activityRequired'));
            return;
          }
          if (
            invalidCatalogSelection(
              values,
              (catalog.data ?? []).map((item) => item.id),
            ).length
          ) {
            setError(t('onboarding.catalogChanged'));
            void catalog.refetch();
            return;
          }
          setError(null);
          void mutation
            .mutateAsync()
            .then(onSaved)
            .catch((caught) =>
              setError(getUserErrorMessage(normalizeError(caught), locale)),
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
  const { locale, t } = useI18n();
  const schema = useMemo(() => createServicesSchema(t), [t]);
  const palette = useOnboardingPalette();
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
    const parsed = schema.safeParse({ services });
    if (!parsed.success) {
      setError(t('onboarding.invalidData'));
      return;
    }
    try {
      setError(null);
      await mutation.mutateAsync(parsed.data.services);
      await onSaved();
    } catch (caught) {
      setError(actionErrorMessage(caught, locale));
    }
  };

  return (
    <>
      <SectionHeader
        title={t('onboarding.servicesTitle')}
        description={t('onboarding.servicesDescription')}
      />
      <MultiSelect
        label={t('onboarding.service')}
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
          <View
            key={id}
            style={[
              styles.serviceCard,
              { borderColor: palette.border, backgroundColor: palette.surface },
            ]}
          >
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              {service?.name ?? t('onboarding.service')}
            </Text>
            <Select
              label={t('onboarding.serviceNeed')}
              value={draft.mode}
              options={
                role === 'PHOTOGRAPHER'
                  ? [{ value: 'OFFERED', label: t('onboarding.offer') }]
                  : [
                      { value: 'WANTED', label: t('onboarding.wanted') },
                      { value: 'OFFERED', label: t('onboarding.offer') },
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
                      label={t('onboarding.minPrice')}
                      keyboardType="number-pad"
                      value={draft.min}
                      onChangeText={(min) => update(id, { min })}
                    />
                  </View>
                  <View style={styles.flex}>
                    <TextField
                      label={t('onboarding.maxPrice')}
                      keyboardType="number-pad"
                      value={draft.max}
                      onChangeText={(max) => update(id, { max })}
                    />
                  </View>
                </View>
                <TextField
                  label={t('onboarding.priceUnit')}
                  placeholder={t('onboarding.priceUnitPlaceholder')}
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
        label={t('onboarding.saveContinue')}
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
  const { locale, t } = useI18n();
  const palette = useOnboardingPalette();
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setPermissionBlocked(!permission.canAskAgain);
        throw new Error(
          permission.canAskAgain
            ? t('nearby.permissionDeniedMessage')
            : t('nearby.permissionRestrictedMessage'),
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
      setError(actionErrorMessage(caught, locale));
    }
  };

  return (
    <>
      <SectionHeader
        title={t('onboarding.locationTitle')}
        description={t('onboarding.locationDescription')}
      />
      <View
        style={[styles.infoCard, { backgroundColor: palette.infoContainer }]}
      >
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {t('onboarding.locationControlTitle')}
        </Text>
        <Text style={[styles.description, { color: palette.muted }]}>
          {t('onboarding.locationControlDescription')}
        </Text>
      </View>
      <FormError message={error} />
      <Button
        label={t('onboarding.useCurrentLocation')}
        loading={mutation.isPending}
        onPress={() => void save()}
      />
      {permissionBlocked ? (
        <Button
          label={t('common.openSettings')}
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
      {onSkip ? (
        <Button
          label={t('onboarding.addLater')}
          variant="ghost"
          onPress={onSkip}
        />
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
  const { locale, t } = useI18n();
  const palette = useOnboardingPalette();
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
    <View style={[styles.switchRow, { backgroundColor: palette.surface }]}>
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {t('onboarding.readyPresence')}
        </Text>
        <Text style={[styles.description, { color: palette.muted }]}>
          {progress.discoveryEligible
            ? t('onboarding.presenceVisibleDescription')
            : t('onboarding.presenceIncompleteDescription')}
        </Text>
      </View>
      <Switch
        accessibilityLabel={t('onboarding.readyPresence')}
        disabled={!progress.discoveryEligible || mutation.isPending}
        value={presence.data?.isVisible ?? false}
        onValueChange={(value) => mutation.mutate(value)}
      />
      {mutation.error ? (
        <Text style={[styles.error, { color: palette.error }]}>
          {actionErrorMessage(mutation.error, locale)}
        </Text>
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
  const { t } = useI18n();
  const palette = useOnboardingPalette();
  const warning = portfolioWarning(progress.role, portfolioCount);
  return (
    <>
      <SectionHeader
        title={
          progress.complete
            ? t('onboarding.summaryReady')
            : t('onboarding.summaryTitle')
        }
        description={t('onboarding.summaryDescription')}
      />
      {progress.missing.length ? (
        <View
          style={[
            styles.warningCard,
            { backgroundColor: palette.warningContainer },
          ]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            {t('onboarding.missingTitle')}
          </Text>
          {progress.missing.map((item) => (
            <Text key={item} style={{ color: palette.text }}>
              • {t(missingLabelKeys[item] ?? 'common.unknown')}
            </Text>
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.successCard,
            { backgroundColor: palette.successContainer },
          ]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            {t('onboarding.completed')}
          </Text>
        </View>
      )}
      {warning ? (
        <Text style={styles.warning}>{t('profile.portfolioWarning')}</Text>
      ) : null}
      {!progress.discoveryEligible ? (
        <View
          style={[styles.infoCard, { backgroundColor: palette.infoContainer }]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            {t('onboarding.discoveryIneligible')}
          </Text>
          {progress.discoveryReasons.map((reason) => (
            <Text key={reason} style={{ color: palette.text }}>
              • {t(discoveryReasonLabelKeys[reason] ?? 'common.unknown')}
            </Text>
          ))}
        </View>
      ) : (
        <PresenceControl scope={scope} progress={progress} />
      )}
      {progress.complete ? (
        <Button
          label={t('onboarding.startDiscovery')}
          onPress={() => void onComplete()}
        />
      ) : (
        <Button label={t('onboarding.resume')} onPress={onResume} />
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
  const { t } = useI18n();
  const palette = useOnboardingPalette();
  return (
    <>
      <SectionHeader
        title={t('onboarding.portfolioTitle')}
        description={t('onboarding.portfolioDescription')}
      />
      <View
        style={[
          styles.warningCard,
          { backgroundColor: palette.warningContainer },
        ]}
      >
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {t('onboarding.portfolioCount', { count })}
        </Text>
        <Text style={{ color: palette.text }}>
          {t('onboarding.portfolioManagement')}
        </Text>
      </View>
      <Button
        label={t('onboarding.viewSummary')}
        variant="secondary"
        onPress={onSummary}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  title: {
    fontFamily: typography.bold,
    fontSize: 26,
  },
  description: { lineHeight: 21 },
  error: { color: colors.danger },
  warning: { color: colors.warning, fontFamily: typography.semibold },
  success: { color: colors.success, fontFamily: typography.semibold },
  note: {
    padding: spacing.md,
    borderRadius: radius.md,
  },
  center: { alignItems: 'center' },
  avatarCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  cardTitle: { fontFamily: typography.semibold },
  roleCard: {
    minHeight: 88,
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  providerCard: {},
  roleEyebrow: {
    color: colors.brand,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  serviceCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  infoCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  warningCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  successCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  switchRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
