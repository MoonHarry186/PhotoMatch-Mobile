import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useMemo, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { queryKeys } from '@/services/api/query-keys';
import {
  colors,
  elevation,
  gradients,
  radius,
  spacing,
  typography,
} from '@/theme';

import { discoveryApi } from './discovery.api';
import type { DiscoveryCandidate } from './discovery.types';

const ACTION_THRESHOLD = 96;

export function DiscoveryCard({
  candidate,
  scope,
  pending,
  onAction,
  onOpenProfile,
}: {
  candidate: DiscoveryCandidate;
  scope: { userId: string; roleId: string };
  pending: boolean;
  onAction: (direction: 'LEFT' | 'RIGHT') => void;
  onOpenProfile: () => void;
}) {
  const translationX = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const avatar = useQuery({
    queryKey: queryKeys.assetUrl(scope, candidate.avatarAssetId ?? 'no-avatar'),
    queryFn: ({ signal }) =>
      discoveryApi.assetUrl(candidate.avatarAssetId!, signal),
    enabled: Boolean(candidate.avatarAssetId),
    staleTime: 4 * 60_000,
  });
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!pending)
        .activeOffsetX([-12, 12])
        .failOffsetY([-28, 28])
        .runOnJS(true)
        .onUpdate((event) => {
          translationX.set(event.translationX);
        })
        .onEnd((event) => {
          if (Math.abs(event.translationX) < ACTION_THRESHOLD) {
            translationX.set(
              reduceMotion ? 0 : withSpring(0, { damping: 20, stiffness: 220 }),
            );
            return;
          }
          translationX.set(
            reduceMotion
              ? 0
              : withTiming(Math.sign(event.translationX) * 24, {
                  duration: 120,
                }),
          );
          onAction(event.translationX > 0 ? 'RIGHT' : 'LEFT');
          translationX.set(
            reduceMotion ? 0 : withSpring(0, { damping: 20, stiffness: 220 }),
          );
        }),
    [onAction, pending, reduceMotion, translationX],
  );
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.get() },
      { rotate: `${translationX.get() / 32}deg` },
    ],
  }));
  const interestStampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translationX.get() / ACTION_THRESHOLD)),
  }));
  const rejectStampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translationX.get() / ACTION_THRESHOLD)),
  }));

  return (
    <View style={styles.root}>
      <View style={styles.stack}>
        <View accessibilityElementsHidden style={styles.backCard} />
        <GestureDetector gesture={gesture}>
          <Animated.View
            accessibilityLabel={[
              `Hồ sơ ${candidate.displayName}`,
              candidate.distance,
            ]
              .filter(Boolean)
              .join(', ')}
            style={[styles.card, animatedStyle]}
          >
            {avatar.data ? (
              <Image
                source={{ uri: avatar.data }}
                alt={`Ảnh đại diện của ${candidate.displayName}`}
                cachePolicy="memory"
                contentFit="cover"
                enforceEarlyResizing
                recyclingKey={candidate.userRoleId}
                transition={reduceMotion ? 0 : 180}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <LinearGradient
                colors={gradients.brand}
                style={[StyleSheet.absoluteFill, styles.imagePlaceholder]}
              >
                <Text style={styles.initial}>
                  {candidate.displayName.slice(0, 1).toUpperCase()}
                </Text>
              </LinearGradient>
            )}

            <Animated.View
              pointerEvents="none"
              style={[styles.stamp, styles.interestStamp, interestStampStyle]}
            >
              <Text style={[styles.stampText, styles.interestStampText]}>
                QUAN TÂM
              </Text>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[styles.stamp, styles.rejectStamp, rejectStampStyle]}
            >
              <Text style={[styles.stampText, styles.rejectStampText]}>
                BỎ QUA
              </Text>
            </Animated.View>

            <LinearGradient
              pointerEvents="none"
              colors={gradients.discoveryOverlay}
              locations={[0, 0.44, 1]}
              style={styles.overlay}
            />
            <View style={styles.content}>
              <View style={styles.identityRow}>
                <Text accessibilityRole="header" style={styles.name}>
                  {candidate.displayName}
                </Text>
                {candidate.verified ? (
                  <SymbolView
                    name={{
                      ios: 'checkmark.seal.fill',
                      android: 'verified',
                      web: 'verified',
                    }}
                    size={22}
                    tintColor={colors.discovery.info}
                  />
                ) : null}
              </View>
              {candidate.headline ? (
                <Text numberOfLines={2} style={styles.headline}>
                  {candidate.headline}
                </Text>
              ) : null}
              <View style={styles.badges}>
                {candidate.distance ? (
                  <ProfileChip
                    icon={{
                      ios: 'location.fill',
                      android: 'location_on',
                      web: 'location_on',
                    }}
                    label={candidate.distance}
                  />
                ) : null}
                {candidate.availabilityStatus === 'AVAILABLE' ? (
                  <ProfileChip
                    icon={{
                      ios: 'bolt.fill',
                      android: 'bolt',
                      web: 'bolt',
                    }}
                    label="Đang sẵn sàng"
                  />
                ) : null}
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
      <View style={styles.actions}>
        <RoundAction
          accessibilityLabel={`Bỏ qua ${candidate.displayName}`}
          color={colors.discovery.reject}
          icon={{ ios: 'xmark', android: 'close', web: 'close' }}
          disabled={pending}
          onPress={() => onAction('LEFT')}
        />
        <RoundAction
          accessibilityLabel={`Xem hồ sơ ${candidate.displayName}`}
          color={colors.discovery.info}
          icon={{ ios: 'info.circle.fill', android: 'info', web: 'info' }}
          disabled={pending}
          small
          onPress={onOpenProfile}
        />
        <RoundAction
          accessibilityLabel={`Quan tâm ${candidate.displayName}`}
          color={colors.discovery.interest}
          icon={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
          loading={pending}
          onPress={() => onAction('RIGHT')}
        />
      </View>
    </View>
  );
}

type SymbolName = Exclude<ComponentProps<typeof SymbolView>['name'], string>;

function ProfileChip({ icon, label }: { icon: SymbolName; label: string }) {
  return (
    <View style={styles.chip}>
      <SymbolView
        name={icon}
        size={15}
        tintColor={colors.discovery.actionSurface}
      />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function RoundAction({
  accessibilityLabel,
  color,
  icon,
  disabled,
  loading = false,
  small = false,
  onPress,
}: {
  accessibilityLabel: string;
  color: string;
  icon: SymbolName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      hitSlop={6}
      style={({ pressed }) => [
        styles.roundAction,
        small && styles.roundActionSmall,
        { borderColor: color },
        pressed && styles.actionPressed,
        (disabled || loading) && styles.actionDisabled,
      ]}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <SymbolView name={icon} size={small ? 25 : 30} tintColor={color} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    gap: spacing.md,
  },
  stack: {
    flex: 1,
    position: 'relative',
    paddingBottom: spacing.sm,
  },
  backCard: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    left: spacing.md,
    bottom: 0,
    borderRadius: radius.xl,
    backgroundColor: colors.light.border,
  },
  card: {
    flex: 1,
    minHeight: 320,
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.light.surface,
    ...elevation.card,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.discovery.actionSurface,
    fontFamily: typography.bold,
    fontSize: 96,
  },
  overlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '56%',
  },
  content: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    color: colors.discovery.actionSurface,
    fontFamily: typography.bold,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  headline: {
    color: colors.discovery.actionSurface,
    fontFamily: typography.medium,
    fontSize: 16,
    lineHeight: 23,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.discovery.chipSurface,
  },
  chipText: {
    color: colors.discovery.actionSurface,
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  stamp: {
    position: 'absolute',
    top: 48,
    zIndex: 2,
    borderWidth: 4,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    transform: [{ rotate: '-12deg' }],
  },
  interestStamp: {
    left: spacing.xl,
    borderColor: colors.discovery.interest,
  },
  rejectStamp: {
    right: spacing.xl,
    borderColor: colors.discovery.reject,
    transform: [{ rotate: '12deg' }],
  },
  stampText: {
    fontFamily: typography.bold,
    fontSize: 26,
    letterSpacing: 1.4,
  },
  interestStampText: { color: colors.discovery.interest },
  rejectStampText: { color: colors.discovery.reject },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    minHeight: 70,
  },
  roundAction: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: radius.full,
    backgroundColor: colors.discovery.actionSurface,
    shadowColor: colors.light.text,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  roundActionSmall: {
    width: 52,
    height: 52,
  },
  actionPressed: { transform: [{ scale: 0.94 }] },
  actionDisabled: { opacity: 0.44 },
});
