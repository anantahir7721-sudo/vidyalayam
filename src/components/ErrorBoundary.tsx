import React, { ErrorInfo, ReactNode } from 'react';
import { VidyalayamLogo } from './VidyalayamLogo';
import { RefreshCw, Home, AlertTriangle, ChevronDown, ChevronUp, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Vidyalayam ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  // Retry without page reload (perfect for transient network glitches)
  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  // Reload current page while preserving the user's active tab in localStorage
  private handleReload = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
    } catch (e) {
      console.warn('Error clearing caches:', e);
    }
    // Reload keeping place
    window.location.reload();
  };

  // Explicitly return to home screen
  private handleGoHome = () => {
    try {
      localStorage.removeItem('vidyalayam_tab_history');
      localStorage.setItem('vidyalayam_last_active_tab', 'overview');
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isNetworkIssue =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        Boolean(
          this.state.error?.message &&
            (this.state.error.message.toLowerCase().includes('network') ||
              this.state.error.message.toLowerCase().includes('fetch') ||
              this.state.error.message.toLowerCase().includes('failed to fetch') ||
              this.state.error.message.toLowerCase().includes('load failed') ||
              this.state.error.message.toLowerCase().includes('offline'))
        );

      return (
        <div className="min-h-screen bg-[#080b0f] text-[#e4ded6] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
          <div className="w-full max-w-lg bg-[#121921] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            {/* Header / Logo */}
            <div className="flex justify-center">
              <VidyalayamLogo size={64} glow />
            </div>

            <div className="space-y-1.5">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isNetworkIssue
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {isNetworkIssue ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-sky-400" />
                    <span>નેટવર્ક કનેક્શન સ્થિતિ • Network Status</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>સિસ્ટમ પુનઃપ્રાપ્તિ • System Recovery</span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight pt-1">
                {isNetworkIssue
                  ? 'ઇન્ટરનેટ કનેક્શન ધીમું અથવા બંધ છે'
                  : 'વિદ્યાલયમ લોડ કરવામાં ક્ષતિ આવી'}
              </h1>

              <p className="text-xs sm:text-sm text-[#a99f91] leading-relaxed">
                {isNetworkIssue
                  ? 'નેટવર્કમાં ક્ષણિક અવરોધ આવવાના કારણે આ પેજ લોડ થઈ શક્યું નથી. આપનું છેલ્લું કામ સુરક્ષિત છે. નીચે આપેલ બટનથી તરત જ ફરી શરૂ કરી શકો છો.'
                  : 'અપડેટ પછી બ્રાઉઝરની જૂની કેશ અથવા નેટવર્ક સમસ્યાના કારણે પેજ લોડ થઈ શક્યું નથી. આપનું સ્થાન સાચવેલું રહેશે.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ફરી પ્રયાસ કરો (Try Again)</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-3 rounded-xl bg-[#9d512d] hover:bg-[#b55f37] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>રીલોડ (Reload)</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="મુખ્ય હોમ પેજ પર જાઓ"
              >
                <Home className="w-4 h-4" />
                <span>મુખ્ય પેજ</span>
              </button>
            </div>

            {/* Technical details toggle for troubleshooting */}
            {this.state.error && (
              <div className="pt-3 border-t border-white/10 text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <span className="font-mono">ટેકનિકલ વિગતો (Technical Details)</span>
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-3 bg-black/50 rounded-xl text-[11px] font-mono text-rose-300 overflow-x-auto max-h-40 whitespace-pre-wrap border border-rose-500/20">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#a99f91] mt-6 font-mono">
            Vidyalayam • General School Management System
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
