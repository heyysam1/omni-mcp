import React, { useState } from "react";
import { RefreshCw, ChevronRight } from "lucide-react";

interface TelemetryProps {
  activeServersCount: number;
  aiClientsCount: number;
  onRescan: () => Promise<void>;
  onOpenClientsModal: () => void;
}

export const Telemetry: React.FC<TelemetryProps> = ({
  activeServersCount,
  aiClientsCount,
  onRescan,
  onOpenClientsModal,
}) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleRescan = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsScanning(true);
    await onRescan();
    setTimeout(() => setIsScanning(false), 600);
  };

  return (
    <div className="pt-3.5 px-4 grid grid-cols-2 gap-3">
      {/* Active Servers Card */}
      <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
        <span className="text-[11px] font-mono text-zinc-400">Active Servers</span>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
            <span className="text-xs font-semibold text-white">
              {activeServersCount} Running
            </span>
          </div>
          <span className="text-[9.5px] font-mono text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 rounded-md">
            Ready
          </span>
        </div>
      </div>

      {/* AI Clients Card (Clickable to open AI Clients Modal) */}
      <div
        onClick={onOpenClientsModal}
        className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 flex flex-col justify-between cursor-pointer transition-all duration-200 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors">
            AI Clients
          </span>
          <ChevronRight size={12} className="text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
            <span className="text-xs font-semibold text-white">
              {aiClientsCount} Connected
            </span>
          </div>
          <button
            onClick={handleRescan}
            className="flex items-center space-x-1 text-[10px] font-mono text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 px-1.5 py-0.5 rounded-md transition-all active:scale-95 group/rescan"
          >
            <RefreshCw className={`w-2.5 h-2.5 text-zinc-400 group-hover/rescan:rotate-180 transition-transform duration-500 ${isScanning ? "animate-spin" : ""}`} />
            <span>Rescan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
