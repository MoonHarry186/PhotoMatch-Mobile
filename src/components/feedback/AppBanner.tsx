import { Banner } from 'react-native-paper';

export interface AppBannerAction {
  label: string;
  onPress: () => void;
}

export function AppBanner({
  visible,
  title,
  message,
  actions = [],
}: {
  visible: boolean;
  title?: string;
  message: string;
  actions?: AppBannerAction[];
}) {
  return (
    <Banner
      visible={visible}
      actions={actions}
      accessibilityLiveRegion="polite"
    >
      {title ? `${title}\n${message}` : message}
    </Banner>
  );
}
