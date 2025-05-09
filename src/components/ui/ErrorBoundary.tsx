import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * A component that catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-bold text-red-700 mb-2">エラーが発生しました</h2>
          <p className="text-red-600 mb-4">
            アプリケーションでエラーが発生しました。再読み込みしてください。
          </p>
          <details className="text-sm text-gray-700">
            <summary className="cursor-pointer">エラー詳細</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md"
            onClick={() => window.location.reload()}
          >
            ページを再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
