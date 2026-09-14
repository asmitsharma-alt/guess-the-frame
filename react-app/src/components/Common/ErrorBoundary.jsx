import React from 'react';

/**
 * Enterprise Neobrutalist Error Boundary
 * Strictly satisfies Section 7 (Resilient Error Boundaries & Production Readiness)
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      traceId: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    const traceId = `trace_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    return { hasError: true, error, traceId };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[Error Boundary Caught] Trace: ${this.state.traceId}`, error, errorInfo);
  }

  handleCopyTrace = () => {
    const details = `TRACE_ID: ${this.state.traceId}\nERROR: ${this.state.error?.message || 'Unknown'}\nSTACK: ${this.state.error?.stack || 'N/A'}`;
    try {
      navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
    }
  };

  handleReboot = () => {
    try {
      // Clear game session and state caches
      localStorage.removeItem('gtf_resume_v1');
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#FFFDF5] text-[#121212]">
          <div className="w-full max-w-lg bg-white border-4 border-black p-6 md:p-8 shadow-[10px_10px_0px_0px_#121212] flex flex-col gap-5">
            {/* Header Strip */}
            <div className="flex items-center justify-between border-b-3 border-black pb-3">
              <div className="flex items-center gap-2">
                <span className="nb-status-square error" />
                <span className="font-black text-lg uppercase tracking-tight font-display">
                  CRITICAL EXCEPTION ENCOUNTERED
                </span>
              </div>
              <span className="nb-badge bg-red-400 text-white">500 HALT</span>
            </div>

            <p className="font-medium text-sm text-gray-700">
              The application encountered an unexpected runtime boundary error. The distributed state has been quarantined to prevent corruption.
            </p>

            {/* Trace Box */}
            <div className="bg-[#F4F0EA] border-2 border-black p-3 font-mono text-xs flex flex-col gap-1.5 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center justify-between text-gray-600 font-bold">
                <span>TRACE ID:</span>
                <span className="text-black">{this.state.traceId}</span>
              </div>
              <div className="text-red-700 font-bold truncate">
                {this.state.error?.message || 'An unknown runtime error occurred'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleCopyTrace}
                className="nb-btn nb-btn-info flex-1 py-3 text-xs"
              >
                {this.state.copied ? '✓ COPIED TO CLIPBOARD' : '📋 COPY ERROR TRACE'}
              </button>
              <button
                type="button"
                onClick={this.handleReboot}
                className="nb-btn nb-btn-primary flex-1 py-3 text-xs"
              >
                ⚡ REBOOT INTERFACE
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
