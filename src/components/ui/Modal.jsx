import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg', footer = null }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      // Only release scroll lock if no other modals or quick action boxes are present
      const hasOtherOpenModals = document.querySelector('.fixed.inset-0.z-50');
      if (!hasOtherOpenModals) {
        document.body.style.overflow = '';
      }
    };
  }, [open]);

  // Close on Escape key press
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none">
      {/* Blurred Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />

      {/* Liquid Glass Modal Surface */}
      <div className={`relative w-full ${maxWidth} max-h-[88vh] sm:max-h-[85vh] flex flex-col bg-[#0B0F1A]/95 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] animate-modal-pop border border-white/15 backdrop-blur-3xl overflow-hidden text-slate-100`}>
        {/* Subtle Specular Top Highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-400 hover:text-white border border-white/10 transition-all duration-200 cursor-pointer flex-shrink-0 active:scale-95"
            aria-label="Close dialog"
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 min-h-0 text-slate-200 text-sm">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-white/10 bg-white/[0.02] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
