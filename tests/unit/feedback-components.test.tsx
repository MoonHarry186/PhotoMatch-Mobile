import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-paper', () => {
  const ReactModule = require('react') as typeof import('react');
  const Native = require('react-native') as typeof import('react-native');
  const passthrough = ({ children }: React.PropsWithChildren) => children;
  const theme = {
    colors: {},
    fonts: {
      bodyMedium: {},
      labelLarge: {},
      titleLarge: {},
    },
  };
  const MockSnackbar = ({
    visible,
    children,
    action,
  }: React.PropsWithChildren<{
    visible: boolean;
    action?: { label: string; onPress: () => void };
  }>) =>
    visible
      ? ReactModule.createElement(
          Native.View,
          null,
          ReactModule.createElement(Native.Text, null, children),
          action
            ? ReactModule.createElement(
                Native.Pressable,
                { onPress: action.onPress },
                ReactModule.createElement(Native.Text, null, action.label),
              )
            : null,
        )
      : null;
  const MockBanner = ({
    visible,
    children,
    actions = [],
  }: React.PropsWithChildren<{
    visible: boolean;
    actions?: Array<{ label: string; onPress: () => void }>;
  }>) =>
    visible
      ? ReactModule.createElement(
          Native.View,
          null,
          ReactModule.createElement(Native.Text, null, children),
          ...actions.map((action) =>
            ReactModule.createElement(
              Native.Pressable,
              { key: action.label, onPress: action.onPress },
              ReactModule.createElement(Native.Text, null, action.label),
            ),
          ),
        )
      : null;
  return {
    MD3DarkTheme: theme,
    MD3LightTheme: theme,
    PaperProvider: passthrough,
    Portal: passthrough,
    Snackbar: MockSnackbar,
    Banner: MockBanner,
    ActivityIndicator: Native.ActivityIndicator,
    Button: passthrough,
    Dialog: passthrough,
    Text: Native.Text,
  };
});

import { FeatureErrorBoundary } from '@/components/boundaries/FeatureErrorBoundary';
import { MessageBubble } from '@/components/domain/message-bubble';
import {
  AppSnackbar,
  ErrorState,
  InlineError,
  OfflineBanner,
} from '@/components/feedback';
import { UploadThumbnail } from '@/components/media/media-components';
import { ThemeProvider } from '@/providers/theme-provider';

let mockIsOnline = false;
const mockRefresh = jest.fn();

jest.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: mockIsOnline,
    refresh: mockRefresh,
  }),
}));

function Wrapper({ children }: React.PropsWithChildren) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('error feedback components', () => {
  beforeEach(() => {
    mockIsOnline = false;
    mockRefresh.mockClear();
  });

  it('renders accessible inline errors and full-screen retry', async () => {
    const retry = jest.fn();
    const view = await render(
      <Wrapper>
        <InlineError message="Số điện thoại không hợp lệ" />
        <ErrorState onPrimaryAction={retry} />
      </Wrapper>,
    );
    expect(view.getByRole('alert')).toHaveTextContent(
      'Số điện thoại không hợp lệ',
    );
    await fireEvent.press(view.getByText('Thử lại'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows one snackbar action and calls its callback', async () => {
    const action = jest.fn();
    const view = await render(
      <Wrapper>
        <AppSnackbar
          payload={{
            message: 'Không thể lưu thay đổi',
            actionLabel: 'Thử lại',
            onAction: action,
          }}
          onDismiss={jest.fn()}
        />
      </Wrapper>,
    );
    expect(view.getByText('Không thể lưu thay đổi')).toBeTruthy();
    await fireEvent.press(view.getByText('Thử lại'));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('keeps offline feedback persistent until connectivity returns', async () => {
    const view = await render(
      <Wrapper>
        <OfflineBanner />
      </Wrapper>,
    );
    expect(view.getByText(/Bạn đang ngoại tuyến/)).toBeTruthy();
    await fireEvent.press(view.getByText('Kiểm tra lại'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    mockIsOnline = true;
    await view.rerender(
      <Wrapper>
        <OfflineBanner />
      </Wrapper>,
    );
    expect(view.queryByText(/Bạn đang ngoại tuyến/)).toBeNull();
  });

  it('keeps chat and upload failures inline with retry actions', async () => {
    const retryMessage = jest.fn();
    const retryUpload = jest.fn();
    const removeUpload = jest.fn();
    const view = await render(
      <Wrapper>
        <MessageBubble
          content="Xin chào bạn"
          time="10:32"
          status="failed"
          onRetry={retryMessage}
        />
        <UploadThumbnail
          uri="file:///photo.jpg"
          status="failed"
          onRetry={retryUpload}
          onRemove={removeUpload}
        />
      </Wrapper>,
    );
    await fireEvent.press(
      view.getByLabelText('Tin nhắn chưa gửi được. Nhấn để thử lại.'),
    );
    await fireEvent.press(view.getByLabelText('Thử tải lại ảnh'));
    await fireEvent.press(view.getByLabelText('Xóa ảnh'));
    expect(retryMessage).toHaveBeenCalledTimes(1);
    expect(retryUpload).toHaveBeenCalledTimes(1);
    expect(removeUpload).toHaveBeenCalledTimes(1);
  });

  it('contains render crashes inside a feature fallback', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    function BrokenFeature(): never {
      throw new Error('render failed');
    }
    const view = await render(
      <Wrapper>
        <FeatureErrorBoundary feature="map">
          <BrokenFeature />
        </FeatureErrorBoundary>
      </Wrapper>,
    );
    expect(view.getByText('Tính năng gặp sự cố')).toBeTruthy();
    consoleError.mockRestore();
  });
});
