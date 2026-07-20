import { useToastStore } from '../../store/useToastStore';
import type { ToastMessage } from '../../store/useToastStore';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-emerald-500/30';
      case 'error':
        return 'border-rose-500/30';
      case 'warning':
        return 'border-amber-500/30';
      case 'info':
      default:
        return 'border-indigo-500/30';
    }
  };

  return (
    <div
      className={`flex items-start justify-between gap-3 p-4 rounded-xl border ${getBorderColor()} bg-zinc-900/80 backdrop-blur-md shadow-lg text-white transition-all duration-300 animate-slide-in`}
    >
      <div className="flex gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <p className="text-sm font-medium leading-5 text-zinc-150">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-zinc-400 hover:text-zinc-200 transition-colors p-0.5 rounded-lg hover:bg-zinc-800"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
