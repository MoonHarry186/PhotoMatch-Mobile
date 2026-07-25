import { useCallback } from 'react';

import {
  getUserErrorMessage,
  isUnexpectedError,
  normalizeError,
  reportError,
  type AppError,
} from '@/core/errors';

import { useAppSnackbar } from './use-app-snackbar';

export interface HandleErrorOptions {
  fallbackMessage?: string;
  showSnackbar?: boolean;
  retry?: () => void;
  retryLabel?: string;
  context?: Record<string, unknown>;
}

export function useErrorHandler() {
  const { showSnackbar } = useAppSnackbar();
  const handleError = useCallback(
    (error: unknown, options: HandleErrorOptions = {}): AppError => {
      const normalized = normalizeError(error);
      if (isUnexpectedError(normalized)) {
        reportError(normalized, options.context);
      }
      if (options.showSnackbar !== false) {
        showSnackbar({
          message: options.fallbackMessage ?? getUserErrorMessage(normalized),
          actionLabel: options.retry
            ? (options.retryLabel ?? 'Thử lại')
            : undefined,
          onAction: options.retry,
        });
      }
      return normalized;
    },
    [showSnackbar],
  );
  return { handleError };
}
