import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastStyles = {
  success: {
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glow: 'shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.12)]',
    indicator: 'bg-emerald-500',
  },
  error: {
    border: 'border-rose-500/30',
    iconColor: 'text-rose-400',
    glow: 'shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(244,63,94,0.15),inset_0_1px_0_rgba(255,255,255,0.12)]',
    indicator: 'bg-rose-500',
  },
  info: {
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    glow: 'shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.12)]',
    indicator: 'bg-blue-500',
  },
  warning: {
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    glow: 'shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(245,158,11,0.15),inset_0_1px_0_rgba(255,255,255,0.12)]',
    indicator: 'bg-amber-500',
  },
};

function Toast({ toast, onRemove }) {
  const Icon = icons[toast.type] || CheckCircle;
  const style = toastStyles[toast.type] || toastStyles.success;
  const displayMessage = typeof toast.message === 'object' && toast.message !== null
    ? (toast.message.message || toast.message.text || JSON.stringify(toast.message))
    : String(toast.message ?? '');

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-[#0B0F1A]/90 backdrop-blur-2xl border text-white animate-toast-in max-w-sm ${style.border} ${style.glow} relative overflow-hidden`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.indicator}`} />
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${style.iconColor}`} />
      <p className="text-xs sm:text-sm font-medium flex-1 text-slate-100 leading-snug">{displayMessage}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        aria-label="Dismiss toast"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-3 sm:right-6 z-50 flex flex-col gap-2.5 pointer-events-none no-print">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}
