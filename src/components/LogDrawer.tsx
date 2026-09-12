import React, { useRef, useEffect, useState } from "react";
import { Terminal, ArrowLeft, Copy, Check, Trash2, Circle } from "lucide-react";

interface LogDrawerProps {
  serverName: string;
  logs: string[];
  isOpen: boolean;
  onClose: () => void;
  onClearLogs?: (serverName: string) => void;
}

export const LogDrawer: React.FC<LogDrawerProps> = ({
  serverName,
  logs,
  isOpen,
  onClose,
  onClearLogs,
}) => {
  const [copied, setCopied] = useState(false);
  const [localLogs, setLocalLogs] = useState<string[]>(logs);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalLogs(logs);
  }, [logs]);

  useEffect(() => {
    if (isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [localLogs, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(localLogs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setLocalLogs([]);
    onClearLogs?.(serverName);
  };

  return (
    <div className="absolute top-[46px] inset-x-0 bottom-0 bg-[#07080B]/80 backdrop-blur-sm z-40 flex flex-col justify-end">
      <div className="w-full h-[400px] bg-[#0C0E14] border-t border-[#1E222D] rounded-t-2xl flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-10 px-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors active:scale-95"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-mono text-zinc-200 tracking-tight">
              Logs: {serverName}
            </span>
            <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.2 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Feed</span>
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleClear}
              className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors active:scale-95"
              title="Clear Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopy}
              className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors active:scale-95"
              title="Copy Logs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Console Log Feed */}
        <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 space-y-1 bg-[#07080B]">
          {localLogs.length === 0 ? (
            <div className="text-[#525866] italic">No logs recorded yet.</div>
          ) : (
            localLogs.map((line, idx) => (
              <div key={idx} className="hover:bg-[#10131B] px-1 py-0.5 rounded flex items-start">
                <span className="text-[#525866] select-none mr-2 shrink-0">{idx + 1}</span>
                <span className={line.includes("error") || line.includes("failed") ? "text-red-400" : line.includes("Connected") || line.includes("live") ? "text-emerald-300" : ""}>
                  {line}
                </span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
