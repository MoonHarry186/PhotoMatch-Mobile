import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/i18n-provider';
import { colors, radius, spacing, typography } from '@/theme';

type DiscoveryTab = 'feed' | 'matches';

export function DiscoveryHeader({
  activeFilterCount,
  activeTab,
  onOpenFilters,
  onSelectTab,
}: {
  activeFilterCount: number;
  activeTab: DiscoveryTab;
  onOpenFilters: () => void;
  onSelectTab: (tab: DiscoveryTab) => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          activeFilterCount
            ? t('discovery.filterButtonWithCount', {
                count: activeFilterCount,
              })
            : t('discovery.filterButton')
        }
        accessibilityState={{ expanded: false }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.filterButton,
          pressed && styles.pressed,
        ]}
        onPress={onOpenFilters}
      >
        <SymbolView
          name={{
            ios: 'slider.horizontal.3',
            android: 'tune',
            web: 'tune',
          }}
          size={23}
          tintColor={activeFilterCount ? colors.brand : '#FFFFFF'}
        />
      </Pressable>

      <View accessibilityRole="tablist" style={styles.tabs}>
        <DiscoveryTabButton
          label={t('discovery.tab.feed')}
          selected={activeTab === 'feed'}
          onPress={() => onSelectTab('feed')}
        />
        <DiscoveryTabButton
          label={t('discovery.tab.matches')}
          selected={activeTab === 'matches'}
          onPress={() => onSelectTab('matches')}
        />
      </View>

      <View accessibilityElementsHidden style={styles.trailingSpacer} />
    </View>
  );
}

function DiscoveryTabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.tab,
        selected && styles.tabSelected,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 5,
    elevation: 6,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tab: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radius.full,
  },
  tabSelected: { backgroundColor: 'rgba(20, 20, 20, 0.72)' },
  tabLabel: {
    color: 'rgba(255, 255, 255, 0.76)',
    fontFamily: typography.medium,
    fontSize: 16,
  },
  tabLabelSelected: {
    color: '#FFFFFF',
    fontFamily: typography.semibold,
  },
  trailingSpacer: { width: 44, height: 44 },
  pressed: { opacity: 0.72 },
});
