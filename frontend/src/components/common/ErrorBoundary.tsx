"use client";

import { Component } from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="panel h-full flex flex-col">
          <div className="panel-header flex-shrink-0">
            <span className="panel-title">{this.props.name || "Module"}</span>
            <span className="panel-badge bg-matrix-red/10 text-matrix-red text-2xs">Error</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-2xs text-matrix-red font-mono mb-2">
                {this.state.error?.message || "Something went wrong"}
              </div>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn text-2xs"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
