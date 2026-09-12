import React from "react";

interface BottomBarProps {
  memoryUsage?: string;
  statusText?: string;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  memoryUsage = "112 MB",
  statusText = "Omni MCP",
}) => {
  return (
    <footer className="h-8 px-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-[10.5px] font-mono shrink-0 select-none z-20">
      <div className="flex items-center space-x-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        <span className="text-zinc-300 font-medium tracking-tight">{statusText}</span>
      </div>
      <div className="flex items-center space-x-1.5 text-zinc-400">
        <span className="text-zinc-500 font-normal">RAM</span>
        <strong className="text-zinc-200 font-medium">{memoryUsage}</strong>
      </div>
    </footer>
  );
};
