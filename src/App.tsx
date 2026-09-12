import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { HeroDeployButton } from "./components/HeroDeployButton";
import { Telemetry } from "./components/Telemetry";
import { InstalledServers } from "./components/InstalledServers";
import { BottomBar } from "./components/BottomBar";
import { LogDrawer } from "./components/LogDrawer";
import { DeployModal } from "./components/DeployModal";
import { ConfigModal } from "./components/ConfigModal";
import { SettingsModal } from "./components/SettingsModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { AiClientsModal } from "./components/AiClientsModal";
import { McpLibraryModal } from "./components/McpLibraryModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { McpServerItem, AiClient, AppSettings } from "./types";
import { DEFAULT_SERVERS, fetchDetectedClients, fetchInstalledServers } from "./services/configScanner";

export const App: React.FC = () => {
  const [servers, setServers] = useState<McpServerItem[]>([]);
  const [detectedClients, setDetectedClients] = useState<AiClient[]>([]);
  const [updateInfo, setUpdateInfo] = useState<{
    downloaded: boolean;
    version?: string;
    downloading?: boolean;
    percent?: number;
  } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedServerIds, setPausedServerIds] = useState<string[]>([]);
  const [filterText, setFilterText] = useState("");
  const [activeLogServerId, setActiveLogServerId] = useState<string | null>(null);
  const [activeConfigServer, setActiveConfigServer] = useState<McpServerItem | null>(null);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem("omni_mcp_onboarded") === "true";
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [liveMemory, setLiveMemory] = useState<string>("112 MB");

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("omni_mcp_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        const validInterval = (["15s", "30s", "60s"].includes(parsed.pollInterval)
          ? parsed.pollInterval
          : "15s") as "15s" | "30s" | "60s";

        const cleanVault = { ...(parsed.vault || {}) };

        const cleanVaultStatus = {
          BRAVE_API_KEY: true,
          GITHUB_TOKEN: true,
          ...(parsed.vaultStatus || {}),
        };

        const cleaned: AppSettings = {
          autoRestartOnCrash: parsed.autoRestartOnCrash ?? true,
          minimizeToTray: parsed.minimizeToTray ?? true,
          pollInterval: validInterval,
          vault: cleanVault,
          vaultStatus: cleanVaultStatus,
        };
        localStorage.setItem("omni_mcp_settings", JSON.stringify(cleaned));
        return cleaned;
      }
    } catch {}
    return {
      autoRestartOnCrash: true,
      minimizeToTray: true,
      pollInterval: "15s",
      vault: {
        BRAVE_API_KEY: "",
        POSTGRES_PASSWORD: "",
        GITHUB_TOKEN: "",
      },
      vaultStatus: {
        BRAVE_API_KEY: true,
        GITHUB_TOKEN: true,
      },
    };
  });

  // Initial check of persisted settings from Electron disk to ensure reliable first-run detection
  useEffect(() => {
    if (window.api?.getSettings) {
      window.api.getSettings().then((persisted) => {
        if (persisted) {
          if (persisted.isFirstRun || persisted.onboarded === false) {
            setIsOnboarded(false);
            localStorage.removeItem("omni_mcp_onboarded");
          } else if (persisted.onboarded === true) {
            setIsOnboarded(true);
            localStorage.setItem("omni_mcp_onboarded", "true");
          }
          if (persisted.autoRestartOnCrash !== undefined) {
            setSettings((prev) => ({
              ...prev,
              autoRestartOnCrash: persisted.autoRestartOnCrash,
              minimizeToTray: persisted.minimizeToTray ?? prev.minimizeToTray,
              pollInterval: persisted.pollInterval ?? prev.pollInterval,
            }));
          }
        }
      }).catch(() => {});
    }
  }, []);

  // Sync settings immediately to Electron main process on change
  useEffect(() => {
    if (window.api?.updateSettings) {
      window.api.updateSettings(settings);
    }
  }, [settings]);

  // Periodic health polling frequency based on settings.pollInterval
  useEffect(() => {
    if (isPaused) return;
    const intervalMs =
      settings.pollInterval === "60s"
        ? 60000
        : settings.pollInterval === "30s"
        ? 30000
        : 15000;

    const pollTimer = setInterval(async () => {
      try {
        const loadedServers = await fetchInstalledServers();
        setServers((prev) => {
          const logMap = new Map(prev.map((p) => [p.id, p.logs]));
          return loadedServers.map((s) => ({
            ...s,
            logs: logMap.get(s.id) && logMap.get(s.id)!.length > 0 ? logMap.get(s.id)! : s.logs,
          }));
        });
      } catch {}
    }, intervalMs);

    return () => clearInterval(pollTimer);
  }, [settings.pollInterval, isPaused]);

  // Load clients, real servers from disk, memory stream, and real process events
  useEffect(() => {
    fetchDetectedClients().then((clients) => {
      setDetectedClients(clients);
    });

    fetchInstalledServers().then((loadedServers) => {
      setServers(loadedServers);
    });

    // Initial memory usage read
    if (window.api?.getMemoryUsage) {
      window.api
        .getMemoryUsage()
        .then((mem) => {
          if (mem) setLiveMemory(mem);
        })
        .catch(() => {});
    }

    // Stream real-time memory pushed from Electron main process
    let unsubMemory: (() => void) | undefined;
    if (window.api?.onMemoryUpdate) {
      unsubMemory = window.api.onMemoryUpdate((mem) => {
        if (mem) {
          setLiveMemory(mem);
        }
      });
    }

    // Authentic live server process log stream
    let unsubServerLog: (() => void) | undefined;
    if (window.api?.onServerLog) {
      unsubServerLog = window.api.onServerLog(({ serverId, log }) => {
        setServers((prev) =>
          prev.map((s) => {
            if (s.id === serverId || s.name === serverId) {
              return {
                ...s,
                logs: [...s.logs, log],
              };
            }
            return s;
          })
        );
      });
    }

    // Authentic live server process status changes
    let unsubServerStatus: (() => void) | undefined;
    if (window.api?.onServerStatusChange) {
      unsubServerStatus = window.api.onServerStatusChange(({ serverId, status, error }) => {
        setServers((prev) =>
          prev.map((s) => {
            if (s.id === serverId || s.name === serverId) {
              return {
                ...s,
                status,
                logs: error ? [...s.logs, `[Error] ${error}`] : s.logs,
              };
            }
            return s;
          })
        );
        if (status === "error" || status === "crashed") {
          showToast(`Server "${serverId}" crashed${error ? `: ${error}` : ""}`);
        }
      });
    }

    // Check initial update status
    if (window.api?.getUpdateStatus) {
      window.api.getUpdateStatus().then((status) => {
        if (status && status.downloaded) {
          setUpdateInfo({
            downloaded: true,
            version: status.downloadedVersion,
          });
        }
      });
    }

    // Listen for real-time background update events
    let unsubUpdate: (() => void) | undefined;
    if (window.api?.onUpdateStatus) {
      unsubUpdate = window.api.onUpdateStatus((data) => {
        if (data?.status === "downloaded") {
          setUpdateInfo({
            downloaded: true,
            version: data.version,
          });
          showToast(`Update v${data.version || ""} downloaded and ready to install!`);
        } else if (data?.status === "downloading") {
          setUpdateInfo({
            downloaded: false,
            downloading: true,
            percent: data.percent,
          });
        }
      });
    }

    return () => {
      if (unsubMemory) unsubMemory();
      if (unsubServerLog) unsubServerLog();
      if (unsubServerStatus) unsubServerStatus();
      if (unsubUpdate) unsubUpdate();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleRescan = async () => {
    const clients = await fetchDetectedClients();
    setDetectedClients(clients);
    const loadedServers = await fetchInstalledServers();
    setServers(loadedServers);
    showToast(`${clients.length} AI clients detected on PC`);
  };

  const handleTogglePause = async () => {
    if (!isPaused) {
      // Pause: stop all active/live/activating servers
      const activeIds = servers
        .filter((s) => s.status === "live" || s.status === "active" || s.status === "activating")
        .map((s) => s.id);

      setPausedServerIds(activeIds);
      setIsPaused(true);

      // Real OS process termination for all active servers
      activeIds.forEach((id) => {
        if (window.api?.terminateServer) {
          window.api.terminateServer(id);
        }
      });

      const timeStr = new Date().toLocaleTimeString();
      setServers((prev) =>
        prev.map((s) => {
          if (s.status === "live" || s.status === "active" || s.status === "activating") {
            return {
              ...s,
              status: "inactive",
              logs: [
                ...s.logs,
                `[${timeStr}] Server stopped by Master Pause. Status: Stopped`,
              ],
            };
          }
          return s;
        })
      );
      showToast(
        activeIds.length > 0
          ? `Master Pause: ${activeIds.length} server${activeIds.length > 1 ? "s" : ""} stopped`
          : "Master Pause: Hub paused"
      );
    } else {
      // Resume: reactivate previously stopped servers
      const idsToResume = pausedServerIds.length > 0
        ? pausedServerIds
        : servers.map((s) => s.id);

      setIsPaused(false);
      setPausedServerIds([]);

      // Real OS process restart for paused servers
      for (const id of idsToResume) {
        const target = servers.find((item) => item.id === id);
        if (window.api?.startServer && target) {
          await window.api.startServer(id, target.rawConfig);
        }
      }

      showToast("Master Resume: Servers restored");
    }
  };

  const handleToggleServerState = async (serverId: string) => {
    const target = servers.find((s) => s.id === serverId);
    if (!target) return;

    if (target.status === "live" || target.status === "active") {
      // Terminate real OS process
      if (window.api?.terminateServer) {
        await window.api.terminateServer(serverId);
      }
      setServers((prev) =>
        prev.map((s) => {
          if (s.id === serverId) {
            return {
              ...s,
              status: "inactive",
              logs: [
                ...s.logs,
                `[${new Date().toLocaleTimeString()}] Server marked as stopped (config-level toggle)`,
              ],
            };
          }
          return s;
        })
      );
      showToast(`${target.name} stopped`);
    } else {
      // If user starts an individual server while paused, clear pause state
      if (isPaused) {
        setIsPaused(false);
      }

      setServers((prev) =>
        prev.map((s) => {
          if (s.id === serverId) {
            return {
              ...s,
              status: "activating",
              logs: [
                ...s.logs,
                `[${new Date().toLocaleTimeString()}] Spawning process for ${target.name}...`,
              ],
            };
          }
          return s;
        })
      );
      showToast(`Starting ${target.name}...`);

      if (window.api?.startServer) {
        const res = await window.api.startServer(serverId, target.rawConfig);
        if (res && !res.success && res.error) {
          setServers((prev) =>
            prev.map((s) => (s.id === serverId ? { ...s, status: "crashed", logs: [...s.logs, `[Error] ${res.error}`] } : s))
          );
          showToast(`Failed to start ${target.name}: ${res.error}`);
        }
      } else {
        setTimeout(() => {
          setServers((prev) =>
            prev.map((s) => (s.id === serverId ? { ...s, status: "live" } : s))
          );
          showToast(`${target.name} is now Live`);
        }, 1000);
      }
    }
  };

  const handleDeployServer = async (serverName: string, rawConfig: any, targetClientIds: string[]) => {
    const matchedClientNames = detectedClients
      .filter((c) => targetClientIds.includes(c.id))
      .map((c) => c.name);

    if (window.api?.deployServer) {
      const configWithName = {
        ...rawConfig,
        name: serverName,
      };
      await window.api.deployServer(serverName, configWithName, targetClientIds);
      const refreshed = await fetchInstalledServers();
      setServers(refreshed);
    } else {
      const newServer: McpServerItem = {
        id: serverName.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
        name: serverName,
        transport: "stdio",
        status: "live",
        syncedClients: matchedClientNames.length > 0 ? matchedClientNames : ["Antigravity IDE"],
        rawConfig,
        logs: [
          `[${serverName}] Initialized via Omni MCP`,
          `[${serverName}] Registered to: ${matchedClientNames.join(", ")}`,
          `[${serverName}] Status: Live`,
        ],
      };
      setServers((prev) => [newServer, ...prev.filter((s) => s.id !== newServer.id)]);
    }

    showToast(`Deployed ${serverName} to ${matchedClientNames.length || 1} AI clients`);
  };

  const handleConfirmDelete = async () => {
    if (!serverToDelete) return;
    const { id: serverId, name: serverName } = serverToDelete;
    if (window.api?.deleteServer) {
      await window.api.deleteServer(serverId);
      const refreshed = await fetchInstalledServers();
      setServers(refreshed);
    } else {
      setServers((prev) => prev.filter((s) => s.id !== serverId && s.name !== serverName));
    }
    showToast(`Removed "${serverName}" from config`);
    setServerToDelete(null);
    if (activeConfigServer?.id === serverId) {
      setActiveConfigServer(null);
    }
  };

  const handleSaveServerConfig = async (serverId: string, newConfig: any) => {
    if (window.api?.updateServer) {
      await window.api.updateServer(serverId, newConfig);
      const refreshed = await fetchInstalledServers();
      setServers(refreshed);
    }
    showToast(`Configuration updated for "${serverId}"`);
  };

  const handleClearServerLogs = (serverName: string) => {
    setServers((prev) =>
      prev.map((s) => (s.name === serverName ? { ...s, logs: [] } : s))
    );
    showToast(`Logs cleared for "${serverName}"`);
  };

  const handleMinimizeApp = () => {
    if (window.api?.minimizeWindow) {
      window.api.minimizeWindow();
    }
  };

  const handleCloseApp = () => {
    if (window.api?.closeWindow) {
      window.api.closeWindow();
    } else {
      window.close();
    }
  };

  const handleRevealClientPath = async (target: string) => {
    if (window.api?.revealInExplorer) {
      const res = await window.api.revealInExplorer(target);
      if (res?.success) {
        showToast("Opened in File Explorer");
      } else {
        showToast("Could not locate config file on disk");
      }
    }
  };

  const activeLogServer = servers.find((s) => s.id === activeLogServerId);
  const activeCount = servers.filter(
    (s) => s.status === "live" || s.status === "active" || s.status === "activating"
  ).length;

  // Dedicated Starting / Onboarding Screen (Displayed ONLY on first launch before main dashboard)
  if (!isOnboarded) {
    return (
      <div className="w-full h-full bg-[#07080B] text-white flex flex-col overflow-hidden relative">
        {/* Header Bar with window controls */}
        <Header
          isLive={false}
          isPaused={false}
          onTogglePause={() => {}}
          onOpenSettings={() => {}}
          onMinimize={() => window.api?.minimizeWindow?.()}
          onCloseApp={handleCloseApp}
        />

        {/* Standalone Onboarding View - Zero dashboard elements in DOM */}
        <OnboardingModal
          isOpen={true}
          isStandalone={true}
          detectedClients={detectedClients}
          onRescan={handleRescan}
          onComplete={() => {
            localStorage.setItem("omni_mcp_onboarded", "true");
            setIsOnboarded(true);
            if (window.api?.updateSettings) {
              window.api.updateSettings({ ...settings, onboarded: true });
            }
            showToast("Setup complete! Welcome to Omni MCP");
          }}
          onSkip={() => {
            localStorage.setItem("omni_mcp_onboarded", "true");
            setIsOnboarded(true);
            if (window.api?.updateSettings) {
              window.api.updateSettings({ ...settings, onboarded: true });
            }
          }}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#101217] border border-[#1E222D] shadow-2xl px-3.5 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-mono text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  const handleRestartToUpdate = () => {
    showToast("Restarting Omni MCP to apply update...");
    setTimeout(() => {
      window.api?.restartAndInstallUpdate?.();
    }, 400);
  };

  // Main Dashboard View (Displayed once onboarded)
  return (
    <div className="w-full h-full bg-[#07080B] text-white flex flex-col overflow-hidden relative subtle-grid">
      {/* 1. Header Bar (46px) */}
      <Header
        isLive={activeCount > 0}
        isPaused={isPaused}
        isSettingsOpen={isSettingsOpen}
        onTogglePause={handleTogglePause}
        onOpenSettings={() => setIsSettingsOpen((prev) => !prev)}
        onMinimize={() => window.api?.minimizeWindow?.()}
        onCloseApp={handleCloseApp}
      />

      {/* Auto-Update Banner (When update is downloaded and ready to install) */}
      {updateInfo?.downloaded && (
        <div className="mx-4 mt-2.5 p-2.5 rounded-xl bg-[#0F1C16] border border-emerald-500/40 shadow-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-200 shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <div className="text-xs font-semibold text-emerald-300">
                Update Ready {updateInfo.version ? `(v${updateInfo.version})` : ""}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                Restart Omni MCP to apply update
              </div>
            </div>
          </div>
          <button
            onClick={handleRestartToUpdate}
            className="h-7 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all active:scale-95 shadow-md flex items-center space-x-1"
          >
            <span>Restart & Update</span>
          </button>
        </div>
      )}

      {/* 2. Hero Action Buttons (Deploy MCP Server & Omni MCP Library) */}
      <HeroDeployButton
        onOpenDeploy={() => setIsDeployOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
      />

      {/* 3. Telemetry Stats Grid */}
      <Telemetry
        activeServersCount={activeCount}
        aiClientsCount={detectedClients.length}
        onRescan={handleRescan}
        onOpenClientsModal={() => setIsClientsModalOpen(true)}
      />

      {/* 4. Installed Servers Feed */}
      <InstalledServers
        servers={servers.filter((s) =>
          s.name.toLowerCase().includes(filterText.toLowerCase())
        )}
        filterText={filterText}
        onFilterChange={setFilterText}
        onToggleLogs={(id) => setActiveLogServerId(id)}
        onEditConfig={(server) => setActiveConfigServer(server)}
        onDeleteServer={(server) => setServerToDelete({ id: server.id, name: server.name })}
        onToggleServerState={handleToggleServerState}
      />

      {/* 5. Bottom Status Bar with genuine live process memory */}
      <BottomBar
        statusText={isPaused ? "Paused" : "Omni MCP"}
        memoryUsage={liveMemory}
      />

      {/* Modals & Overlays */}
      <LogDrawer
        isOpen={!!activeLogServerId}
        serverName={activeLogServer?.name || "Server"}
        logs={activeLogServer?.logs || []}
        onClose={() => setActiveLogServerId(null)}
        onClearLogs={handleClearServerLogs}
      />

      <ConfigModal
        isOpen={!!activeConfigServer}
        server={activeConfigServer}
        onClose={() => setActiveConfigServer(null)}
        onDelete={(serverId, serverName) => setServerToDelete({ id: serverId, name: serverName })}
        onSave={handleSaveServerConfig}
      />

      <DeployModal
        isOpen={isDeployOpen}
        detectedClients={detectedClients}
        onClose={() => setIsDeployOpen(false)}
        onDeploy={handleDeployServer}
      />

      <AiClientsModal
        isOpen={isClientsModalOpen}
        detectedClients={detectedClients}
        onClose={() => setIsClientsModalOpen(false)}
        onRescan={handleRescan}
      />

      <McpLibraryModal
        isOpen={isLibraryOpen}
        detectedClients={detectedClients}
        installedServers={servers}
        settings={settings}
        onClose={() => setIsLibraryOpen(false)}
        onDeploy={handleDeployServer}
        statusText={isPaused ? "Paused" : "Omni MCP"}
        memoryUsage={liveMemory}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        updateInfo={updateInfo}
        onRestartToUpdate={handleRestartToUpdate}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(newSettings) => {
          setSettings(newSettings);
          try {
            localStorage.setItem("omni_mcp_settings", JSON.stringify(newSettings));
          } catch {}
          if (window.api?.updateSettings) {
            window.api.updateSettings(newSettings);
          }
          showToast("Settings updated");
        }}
        onResetOnboarding={() => {
          setIsSettingsOpen(false);
          setIsOnboarded(false);
          localStorage.removeItem("omni_mcp_onboarded");
          if (window.api?.updateSettings) {
            window.api.updateSettings({ ...settings, onboarded: false });
          }
        }}
      />

      <DeleteConfirmModal
        isOpen={!!serverToDelete}
        serverName={serverToDelete?.name || ""}
        onCancel={() => setServerToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Floating Toast Notification - Non-intrusive bottom position */}
      {toastMessage && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#101217] border border-[#1E222D] shadow-2xl px-3.5 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-mono text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
