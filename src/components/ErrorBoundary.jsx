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
    console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="my-6 mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50/90 p-6 shadow-md text-right"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800 mb-1">
                אירעה שגיאה בלתי צפויה בתצוגת הרכיב
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                הנתונים שלך שמורים בבטחה. ניתן לרענן את התצוגה ולהמשיך בעבודה כרגיל.
              </p>
              {this.state.error?.message && (
                <pre
                  dir="ltr"
                  className="text-[11px] bg-white/80 border border-amber-200 rounded-lg p-2.5 text-slate-600 overflow-x-auto mb-4"
                >
                  {this.state.error.message}
                </pre>
              )}
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                שחזור תצוגה והמשך עבודה
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
