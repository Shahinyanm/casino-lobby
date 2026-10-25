import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Component, Suspense, type ReactNode } from 'react';

interface BoundaryProps {
  fallback: (retry: () => void) => ReactNode;
  onReset?: () => void;
  children: ReactNode;
}

export class ErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  private readonly retry = () => {
    this.props.onReset?.();
    this.setState({ failed: false });
  };

  override render() {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}

/**
 * One async region = skeleton while loading, its own error state with retry, content otherwise.
 * A failing section never takes the rest of the lobby down with it.
 */
export function AsyncSection({
  skeleton,
  error,
  children,
}: {
  skeleton: ReactNode;
  error: (retry: () => void) => ReactNode;
  children: ReactNode;
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallback={error}>
          <Suspense fallback={skeleton}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
