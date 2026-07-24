import { DeepLinkProvider } from './deep-link-provider';
import { I18nProvider } from '@/i18n/i18n-provider';
import { NotificationProvider } from './notification-provider';
import { QueryProvider } from './query-provider';
import { PendingNavigation } from './pending-navigation';
import { SessionProvider } from './session-provider';
import { ThemeProvider } from './theme-provider';
import { WebSocketProvider } from './websocket-provider';

export function AppProvider({ children }: React.PropsWithChildren) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryProvider>
          <SessionProvider>
            <NotificationProvider>
              <DeepLinkProvider>
                <WebSocketProvider>
                  <PendingNavigation />
                  {children}
                </WebSocketProvider>
              </DeepLinkProvider>
            </NotificationProvider>
          </SessionProvider>
        </QueryProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
