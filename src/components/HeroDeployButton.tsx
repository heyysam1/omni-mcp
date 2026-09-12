import React from "react";
import { Plus, Library } from "lucide-react";

interface HeroDeployButtonProps {
  onOpenDeploy: () => void;
  onOpenLibrary?: () => void;
}

export const HeroDeployButton: React.FC<HeroDeployButtonProps> = ({
  onOpenDeploy,
  onOpenLibrary,
}) => {
  return (
    <div className="pt-3.5 px-4 grid grid-cols-2 gap-2.5 shrink-0">
      {/* 1. Deploy MCP Server Card */}
      <button
        onClick={onOpenDeploy}
        className="h-[112px] rounded-xl bg-zinc-900/80 hover:bg-zinc-850/90 border border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center p-4 text-white transition-all duration-200 active:scale-[0.98] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] group"
      >
        <div className="w-9 h-9 rounded-lg bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shrink-0 mb-2.5 shadow-sm">
          <Plus
            size={20}
            strokeWidth={2.2}
            className="transition-transform duration-300 ease-out group-hover:rotate-[60deg]"
          />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white select-none">
          Deploy MCP Server
        </span>
      </button>

      {/* 2. Omni MCP Library Card */}
      <button
        onClick={onOpenLibrary}
        className="h-[112px] rounded-xl bg-zinc-900/80 hover:bg-zinc-850/90 border border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center p-4 text-white transition-all duration-200 active:scale-[0.98] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] group"
      >
        <div className="w-9 h-9 rounded-lg bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shrink-0 mb-2.5 shadow-sm">
          <Library
            size={19}
            strokeWidth={2.2}
            className="transition-transform duration-300 ease-out group-hover:-rotate-12 group-hover:scale-110"
          />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white select-none">
          Omni MCP Library
        </span>
      </button>
    </div>
  );
};
