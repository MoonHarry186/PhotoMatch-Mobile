import type { ErrorBoundaryProps as ExpoErrorBoundaryProps } from 'expo-router';
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from '@/components/feedback';
import { reportError } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';

type Props = {
  children: ReactNode;
  feature?: string;
  fallbackTitle?: string;
};

type State = { error: Error | null };

export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, {
      feature: this.props.feature ?? 'unknown',
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <FeatureFallback
        title={this.props.fallbackTitle}
        onRetry={() => this.setState({ error: null })}
      />
    );
  }
}

export function RouteErrorBoundary({ error, retry }: ExpoErrorBoundaryProps) {
  useEffect(() => {
    reportError(error, { feature: 'route' });
  }, [error]);
  return <FeatureFallback onRetry={() => void retry()} />;
}

export function RootErrorBoundary({ children }: { children: ReactNode }) {
  return <FeatureErrorBoundary feature="root">{children}</FeatureErrorBoundary>;
}

function FeatureFallback({
  title,
  onRetry,
}: {
  title?: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <ErrorState
      title={title ?? t('common.featureError')}
      onPrimaryAction={onRetry}
    />
  );
}
