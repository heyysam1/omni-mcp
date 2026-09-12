import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  serverName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  serverName,
  onCancel,
  onConfirm,
}) => {
  // Listen for Escape key to cancel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[80] bg-[#07080B]/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-[410px] max-w-full bg-[#0E1017] border border-[#1E222D] rounded-xl shadow-2xl p-4 flex flex-col space-y-3.5 animate-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Danger Icon & Close Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white tracking-tight">
                Delete MCP Server
              </h3>
              <p className="text-[10.5px] font-mono text-zinc-400">
                Action confirmation required
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Target Server Card */}
        <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 text-[11px]">Target Server:</span>
          <span className="text-rose-400 font-semibold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
            {serverName}
          </span>
        </div>

        {/* Disclaimer / Warning Box */}
        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-[11px] text-zinc-300 leading-relaxed font-sans">
          <p className="font-medium text-zinc-200 mb-1">Disclaimer</p>
          <p className="text-zinc-400 text-[10.5px] leading-normal font-mono">
            Deleting this server will permanently remove its configuration from your local files and disconnect it from all synced AI clients. Any active background daemon or stdio process for this server will be terminated. This action cannot be undone.
          </p>
        </div>

        {/* Two Action Buttons: Cancel and Confirm */}
        <div className="flex items-center justify-end space-x-2 pt-1 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3.5 rounded-lg text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-8 px-4 rounded-lg text-xs font-mono font-medium text-white bg-rose-600 hover:bg-rose-500 border border-rose-500/30 flex items-center space-x-1.5 transition-all active:scale-95 shadow-md shadow-rose-950/50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
