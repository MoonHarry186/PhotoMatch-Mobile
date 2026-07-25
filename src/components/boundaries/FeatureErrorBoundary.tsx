import type { ErrorBoundaryProps as ExpoErrorBoundaryProps } from 'expo-router';
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from '@/components/feedback';
import { reportError } from '@/core/errors';

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
      <ErrorState
        title={this.props.fallbackTitle ?? 'Tính năng gặp sự cố'}
        description="PhotoMatch chưa thể hiển thị khu vực này."
        primaryActionLabel="Tải lại"
        onPrimaryAction={() => this.setState({ error: null })}
      />
    );
  }
}

export function RouteErrorBoundary({ error, retry }: ExpoErrorBoundaryProps) {
  useEffect(() => {
    reportError(error, { feature: 'route' });
  }, [error]);
  return (
    <ErrorState
      title="Màn hình gặp sự cố"
      description="PhotoMatch không thể hiển thị nội dung này."
      primaryActionLabel="Tải lại"
      onPrimaryAction={() => void retry()}
    />
  );
}

export function RootErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FeatureErrorBoundary feature="root" fallbackTitle="PhotoMatch gặp sự cố">
      {children}
    </FeatureErrorBoundary>
  );
}
