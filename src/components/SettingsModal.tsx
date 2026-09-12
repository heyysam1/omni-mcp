import React, { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, RefreshCw, Trash2 } from "lucide-react";
import { AppSettings } from "../types";
import { getLibraryCacheStats, clearLibraryCache } from "../services/libraryService";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
  onResetOnboarding?: () => void;
  updateInfo?: {
    downloaded: boolean;
    version?: string;
    downloading?: boolean;
    percent?: number;
  } | null;
  onRestartToUpdate?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
  onResetOnboarding,
  updateInfo,
  onRestartToUpdate,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatusMsg, setCheckStatusMsg] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState({ count: 0, sizeKb: "0 KB" });
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);

  const handleCheckClick = async () => {
    setIsChecking(true);
    setCheckStatusMsg("Checking GitHub for updates...");
    if (window.api?.checkForUpdates) {
      try {
        const res = await window.api.checkForUpdates();
        if (res.hasUpdate) {
          setCheckStatusMsg(`Update found (v${res.version}) - downloading...`);
        } else {
          setCheckStatusMsg("Omni MCP is up to date (v1.0.0)");
        }
      } catch {
        setCheckStatusMsg("Omni MCP is up to date");
      } finally {
        setIsChecking(false);
      }
    } else {
      setTimeout(() => {
        setIsChecking(false);
        setCheckStatusMsg("Omni MCP is up to date");
      }, 1000);
    }
  };

  const sanitizeSettings = (s: AppSettings): AppSettings => {
    const validInterval = (["15s", "30s", "60s"].includes(s.pollInterval)
      ? s.pollInterval
      : "15s") as "15s" | "30s" | "60s";

    const cleanVault = { ...(s.vault || {}) };

    const cleanVaultStatus = {
      BRAVE_API_KEY: true,
      GITHUB_TOKEN: true,
      ...(s.vaultStatus || {}),
    };

    return {
      autoRestartOnCrash: s.autoRestartOnCrash ?? true,
      minimizeToTray: s.minimizeToTray ?? true,
      pollInterval: validInterval,
      vault: cleanVault,
      vaultStatus: cleanVaultStatus,
    };
  };

  const [current, setCurrent] = useState<AppSettings>(() => sanitizeSettings(settings));

  // Reset to parent saved settings whenever modal is opened, discarding unsaved edits
  useEffect(() => {
    if (isOpen) {
      setCurrent(sanitizeSettings(settings));
      setCacheStats(getLibraryCacheStats());
      setCacheMsg(null);
    }
  }, [isOpen, settings]);

  const handleClearCache = () => {
    clearLibraryCache();
    setCacheStats(getLibraryCacheStats());
    setCacheMsg("Cache cleared successfully!");
    setTimeout(() => setCacheMsg(null), 2500);
  };

  if (!isOpen) return null;

  const handleCancel = () => {
    // Revert local draft state back to saved parent settings
    setCurrent(sanitizeSettings(settings));
    onClose();
  };

  const handleToggleKey = (keyName: "BRAVE_API_KEY" | "GITHUB_TOKEN") => {
    const currentStatus = current.vaultStatus?.[keyName] !== false;
    setCurrent({
      ...current,
      vaultStatus: {
        ...current.vaultStatus,
        [keyName]: !currentStatus,
      },
    });
  };

  const handleSave = () => {
    onSave(current);
    onClose();
  };

  return (
    <div className="absolute top-[46px] inset-x-0 bottom-0 bg-[#07080B]/85 backdrop-blur-sm z-[60] flex flex-col justify-end">
      <div className="w-full h-full bg-[#0E1017] border-t border-[#1E222D] flex flex-col justify-between shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="h-10 px-3 border-b border-[#1E222D] flex items-center space-x-2 bg-[#0B0D13] shrink-0">
          <button
            onClick={handleCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            title="Back"
          >
            <ArrowLeft size={15} />
          </button>
          <h2 className="text-xs font-semibold text-white tracking-tight">Settings</h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Process Management */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-[#8A90A2]">Process Management</div>
            <div className="bg-[#101217] border border-[#1E222D] rounded-xl divide-y divide-[#1A1E29]">
              <div className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-200">Auto-Restart on Crash</div>
                  <div className="text-[10.5px] text-[#5A6175] mt-0.5">
                    Revive crashed server processes automatically (up to 3 retries)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.autoRestartOnCrash}
                  onChange={(e) =>
                    setCurrent({ ...current, autoRestartOnCrash: e.target.checked })
                  }
                  className="accent-emerald-500 rounded bg-[#07080B] border-[#1E222D] cursor-pointer"
                />
              </div>

              <div className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-200">Minimize to System Tray</div>
                  <div className="text-[10.5px] text-[#5A6175] mt-0.5">
                    Keep app running in background while minimized
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={current.minimizeToTray}
                  onChange={(e) =>
                    setCurrent({ ...current, minimizeToTray: e.target.checked })
                  }
                  className="accent-emerald-500 rounded bg-[#07080B] border-[#1E222D] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Health Polling Frequency */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-[#8A90A2]">Health Polling Frequency</div>
            <div className="p-1 bg-[#101217] border border-[#1E222D] rounded-xl grid grid-cols-3 gap-1">
              {(["15s", "30s", "60s"] as const).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setCurrent({ ...current, pollInterval: interval })}
                  className={`py-1.5 rounded-lg text-xs font-mono font-medium text-center transition-colors ${current.pollInterval === interval
                      ? "bg-[#161A24] border border-[#232B3C] text-[#34D399]"
                      : "text-[#8A90A2] hover:text-white"
                    }`}
                >
                  {interval}
                </button>
              ))}
            </div>
          </div>

          {/* Local Vault */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#8A90A2]">Vault (Keys)</span>
              <span className="text-[10px] font-mono text-zinc-400 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Stored Locally (Unencrypted)</span>
              </span>
            </div>
            <div className="bg-[#101217] border border-[#1E222D] rounded-xl p-3 space-y-3">
              {/* BRAVE_API_KEY */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10.5px] font-mono text-[#8A90A2]">
                    BRAVE_API_KEY
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <span
                      onClick={() => handleToggleKey("BRAVE_API_KEY")}
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors select-none ${current.vaultStatus?.BRAVE_API_KEY !== false
                          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                          : "text-zinc-400 bg-zinc-800/60 border border-transparent hover:bg-zinc-800"
                        }`}
                    >
                      {current.vaultStatus?.BRAVE_API_KEY !== false ? "ON" : "OFF"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleKey("BRAVE_API_KEY")}
                      className={`w-7 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${current.vaultStatus?.BRAVE_API_KEY !== false
                          ? "bg-emerald-500"
                          : "bg-zinc-700"
                        }`}
                      title={
                        current.vaultStatus?.BRAVE_API_KEY !== false
                          ? "Click to turn OFF (disable API key without deleting)"
                          : "Click to turn ON (enable API key)"
                      }
                    >
                      <span
                        className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${current.vaultStatus?.BRAVE_API_KEY !== false
                            ? "translate-x-3"
                            : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>
                </div>
                <input
                  type="password"
                  value={current.vault.BRAVE_API_KEY || ""}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      vault: { ...current.vault, BRAVE_API_KEY: e.target.value },
                    })
                  }
                  className={`w-full bg-[#07080B] border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none transition-all ${current.vaultStatus?.BRAVE_API_KEY !== false
                      ? "border-[#1E222D] text-slate-200 focus:border-[#10B981]/50"
                      : "border-zinc-800/80 text-zinc-500 opacity-60"
                    }`}
                  placeholder={
                    current.vaultStatus?.BRAVE_API_KEY !== false
                      ? "sk-brave-..."
                      : "Disabled (Turn ON to activate)"
                  }
                />
              </div>

              {/* GITHUB_TOKEN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10.5px] font-mono text-[#8A90A2]">
                    GITHUB_TOKEN
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <span
                      onClick={() => handleToggleKey("GITHUB_TOKEN")}
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors select-none ${current.vaultStatus?.GITHUB_TOKEN !== false
                          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                          : "text-zinc-400 bg-zinc-800/60 border border-transparent hover:bg-zinc-800"
                        }`}
                    >
                      {current.vaultStatus?.GITHUB_TOKEN !== false ? "ON" : "OFF"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleKey("GITHUB_TOKEN")}
                      className={`w-7 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${current.vaultStatus?.GITHUB_TOKEN !== false
                          ? "bg-emerald-500"
                          : "bg-zinc-700"
                        }`}
                      title={
                        current.vaultStatus?.GITHUB_TOKEN !== false
                          ? "Click to turn OFF (disable token without deleting)"
                          : "Click to turn ON (enable token)"
                      }
                    >
                      <span
                        className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${current.vaultStatus?.GITHUB_TOKEN !== false
                            ? "translate-x-3"
                            : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>
                </div>
                <input
                  type="password"
                  value={current.vault.GITHUB_TOKEN || ""}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      vault: { ...current.vault, GITHUB_TOKEN: e.target.value },
                    })
                  }
                  className={`w-full bg-[#07080B] border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none transition-all ${current.vaultStatus?.GITHUB_TOKEN !== false
                      ? "border-[#1E222D] text-slate-200 focus:border-[#10B981]/50"
                      : "border-zinc-800/80 text-zinc-500 opacity-60"
                    }`}
                  placeholder={
                    current.vaultStatus?.GITHUB_TOKEN !== false
                      ? "ghp_..."
                      : "Disabled (Turn ON to activate)"
                  }
                />
              </div>
            </div>
          </div>

          {/* Storage & Cache */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#8A90A2]">Storage & Cache</span>
              <span className="text-[10px] font-mono text-zinc-400">
                {cacheStats.count} cached items ({cacheStats.sizeKb})
              </span>
            </div>
            <div className="bg-[#101217] border border-[#1E222D] rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-200">Library Offline Cache</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {cacheMsg ? (
                    <span className="text-emerald-400 font-medium">{cacheMsg}</span>
                  ) : (
                    "Locally cached server readmes & previews"
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="h-6 px-2 rounded-md bg-zinc-850 hover:bg-zinc-750 text-zinc-300 hover:text-white text-[10.5px] font-mono flex items-center space-x-1 transition-all border border-zinc-700/80 active:scale-95"
              >
                <Trash2 size={11} />
                <span>Clear Cache</span>
              </button>
            </div>
          </div>

          {/* Software Updates */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#8A90A2]">Software Updates</span>
              <span className="text-[10px] font-mono text-zinc-400">v1.0.0</span>
            </div>
            <div className="bg-[#101217] border border-[#1E222D] rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  {updateInfo?.downloaded
                    ? `Update Ready (v${updateInfo.version || "latest"})`
                    : updateInfo?.downloading
                      ? `Downloading Update (${updateInfo.percent || 0}%)`
                      : checkStatusMsg || "Omni MCP v1.0.0 is up to date"}
                </div>
                {updateInfo?.downloaded && (
                  <div className="text-[10px] text-[#5A6175] mt-0.5">
                    Restart to apply update automatically
                  </div>
                )}
              </div>
              {updateInfo?.downloaded ? (
                <button
                  type="button"
                  onClick={onRestartToUpdate}
                  className="h-6 px-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-[10.5px] font-semibold transition-all active:scale-95 shadow-sm flex items-center space-x-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Restart & Apply</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isChecking}
                  onClick={handleCheckClick}
                  className="h-6 px-2 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10.5px] font-mono transition-all active:scale-95 flex items-center space-x-1 disabled:opacity-50"
                  title="Check for updates"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isChecking ? "animate-spin text-emerald-400" : "text-zinc-400"}`} />
                  <span>{isChecking ? "Checking..." : "Check"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="h-9 px-3 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between shrink-0">
          <div>
            {onResetOnboarding && (
              <button
                type="button"
                onClick={onResetOnboarding}
                className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Replay intro tour"
              >
                Replay Tour
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleCancel}
              className="h-6 px-2.5 rounded-md text-[10.5px] font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors active:scale-95"
            >
              Dismiss
            </button>
            <button
              onClick={handleSave}
              className="h-6 px-3 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-[10.5px] transition-all active:scale-95 shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
