import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#06080E] text-slate-100 select-none">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-[#0B0F1A]/90 backdrop-blur-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Something went wrong</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                An unexpected interface error occurred. You can reload to restore your session.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-left overflow-x-auto max-h-56">
                  <p className="text-xs font-mono font-bold text-red-400">{this.state.error.toString()}</p>
                  {this.state.error.stack && (
                    <pre className="text-[10px] font-mono text-red-300/80 mt-1 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 cursor-pointer active:scale-95"
            >
              <RefreshCw size={14} />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
