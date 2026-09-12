import React from "react";
import { Logo } from "../icons/Logo";
import { Settings, X, Minus, Pause, Play } from "lucide-react";

interface HeaderProps {
  isLive: boolean;
  isPaused: boolean;
  isSettingsOpen?: boolean;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  onMinimize: () => void;
  onCloseApp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isLive,
  isPaused,
  isSettingsOpen = false,
  onTogglePause,
  onOpenSettings,
  onMinimize,
  onCloseApp,
}) => {
  return (
    <header className="h-[46px] px-4 border-b border-[#1E222D] flex items-center justify-between bg-[#07080B] shrink-0 z-[70] relative drag-region">
      {/* Brand Title & Logo */}
      <div className="flex items-center space-x-2 no-drag">
        <Logo size={20} className="shrink-0" />
        <span className="text-[13px] font-semibold tracking-tight text-white">Omni MCP</span>
      </div>

      {/* Header Actions & Status Pill */}
      <div className="flex items-center space-x-1.5 no-drag">
        {/* Status Pill */}
        <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300">
          <span className="relative flex h-1.5 w-1.5">
            {isLive && !isPaused && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                isPaused
                  ? "bg-amber-400"
                  : isLive
                  ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                  : "bg-zinc-500"
              }`}
            />
          </span>
          <span className="text-[10px] font-mono text-zinc-300 font-medium">
            {isPaused ? "Paused" : isLive ? "Live" : "Idle"}
          </span>
        </div>

        <div className="h-3.5 w-px bg-zinc-800/80 mx-0.5"></div>

        {/* Master Pause/Resume */}
        <button
          onClick={onTogglePause}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 group ${
            isPaused
              ? "text-amber-400 bg-amber-400/10 border border-amber-500/20"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
          }`}
        >
          {isPaused ? (
            <Play size={13} className="text-amber-400" />
          ) : (
            <Pause size={13} className="group-hover:scale-105 transition-transform duration-150" />
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title={isSettingsOpen ? "Close Settings" : "Settings"}
          aria-label="Settings"
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 group ${
            isSettingsOpen
              ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
          }`}
        >
          <Settings
            size={13}
            className={`transition-transform duration-300 ease-out ${
              isSettingsOpen ? "rotate-90 text-emerald-400" : "group-hover:rotate-45"
            }`}
          />
        </button>

        {/* Minimize Button */}
        <button
          onClick={onMinimize}
          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-150 active:scale-95"
        >
          <Minus size={13} />
        </button>

        {/* Close / Dismiss Button */}
        <button
          onClick={onCloseApp}
          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 active:scale-95"
        >
          <X size={13} />
        </button>
      </div>
    </header>
  );
};
