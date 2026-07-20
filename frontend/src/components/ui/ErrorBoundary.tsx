import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by react boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-zinc-950 p-6 select-none relative overflow-hidden">
          {/* Decorative blur rings */}
          <div className="absolute w-96 h-96 rounded-full bg-rose-500/5 blur-3xl -top-12 -left-12"></div>
          <div className="absolute w-96 h-96 rounded-full bg-violet-500/5 blur-3xl -bottom-12 -right-12"></div>

          <div className="relative max-w-md w-full glass-panel border border-zinc-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="inline-flex p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-450 mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-lg font-bold text-zinc-100">Application Interrupted</h1>
              <p className="text-xs text-zinc-450 leading-relaxed">
                A critical client-side rendering exception was caught. The UI failed to paint.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-xl text-left max-h-36 overflow-y-auto">
                <span className="text-[10px] font-mono text-rose-400 font-bold block mb-1">
                  {this.state.error.name}:
                </span>
                <p className="text-[10px] font-mono text-zinc-400 leading-normal break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-250 border border-zinc-850 hover:text-zinc-100 transition-colors shadow-lg"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
