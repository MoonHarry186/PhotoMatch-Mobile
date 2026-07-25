import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  AppSnackbar,
  OfflineBanner,
  type SnackbarPayload,
} from '@/components/feedback';

type FeedbackContextValue = {
  showSnackbar: (payload: SnackbarPayload) => void;
  dismissSnackbar: () => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function AppFeedbackProvider({ children }: React.PropsWithChildren) {
  const [snackbar, setSnackbar] = useState<SnackbarPayload | null>(null);
  const dismissSnackbar = useCallback(() => setSnackbar(null), []);
  const value = useMemo<FeedbackContextValue>(
    () => ({
      showSnackbar: (payload) => setSnackbar(payload),
      dismissSnackbar,
    }),
    [dismissSnackbar],
  );
  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <OfflineBanner />
      <AppSnackbar payload={snackbar} onDismiss={dismissSnackbar} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value)
    throw new Error('useFeedback must be used within AppFeedbackProvider');
  return value;
}
