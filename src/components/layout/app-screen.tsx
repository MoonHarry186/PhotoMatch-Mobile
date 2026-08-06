import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';
import { useOptionalTheme } from '@/providers/theme-provider';

type Props = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  contentStyle?: StyleProp<ViewStyle>;
  safeStyle?: StyleProp<ViewStyle>;
  safeEdges?: Edge[];
  testID?: string;
};

export function AppScreen({
  children,
  header,
  footer,
  scroll = true,
  scrollProps,
  contentStyle,
  safeStyle,
  safeEdges,
  testID,
}: Props) {
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.nonScrollContent, contentStyle]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }, safeStyle]}
      edges={safeEdges}
      testID={testID}
    >
      {header}
      <KeyboardAvoidingView
        testID="app-screen-keyboard-avoiding"
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  nonScrollContent: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
});
