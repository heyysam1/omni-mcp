import React, { useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  FolderOpen,
  Bot,
  CheckCircle2,
  AlertCircle,
  Layers,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AiClient } from "../types";
import { registerCustomClient, unregisterCustomClient } from "../services/configScanner";

interface AiClientsModalProps {
  isOpen: boolean;
  detectedClients: AiClient[];
  onClose: () => void;
  onRescan: () => Promise<void>;
}

// Master list of supported clients with metadata
const ALL_SUPPORTED_CLIENTS = [
  {
    id: "antigravity",
    name: "Antigravity IDE",
    description: "Google Antigravity IDE & Agentic Coding Engine",
    defaultPathHint: "~/.gemini/antigravity-ide/mcp_config.json",
  },
  {
    id: "claude",
    name: "Claude Desktop",
    description: "Anthropic Claude Desktop Client",
    defaultPathHint: "%LOCALAPPDATA%/Claude-3p/claude_desktop_config.json",
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "Cursor AI Code Editor",
    defaultPathHint: "~/.cursor/mcp.json",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description: "Codeium Windsurf AI IDE",
    defaultPathHint: "~/.codeium/windsurf/mcp_config.json",
  },
  {
    id: "cline",
    name: "VS Code (Cline)",
    description: "Cline AI Autonomous Agent for VS Code",
    defaultPathHint: "%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
  },
  {
    id: "roo-cline",
    name: "VS Code (Roo Code)",
    description: "Roo Code AI Agent for VS Code",
    defaultPathHint: "%APPDATA%/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json",
  },
  {
    id: "continue",
    name: "Continue",
    description: "Continue Open-Source AI Assistant",
    defaultPathHint: "~/.continue/config.json",
  },
  {
    id: "vscode-mcp",
    name: "VS Code (MCP)",
    description: "Visual Studio Code Native / Copilot MCP",
    defaultPathHint: "%APPDATA%/Code/User/mcp.json",
  },
  {
    id: "zed",
    name: "Zed",
    description: "Zed High-Performance AI Code Editor",
    defaultPathHint: "%APPDATA%/Zed/settings.json",
  },
  {
    id: "goose",
    name: "Goose",
    description: "Block Goose AI Agent & CLI",
    defaultPathHint: "~/.config/goose/config.yaml",
  },
  {
    id: "librechat",
    name: "LibreChat",
    description: "LibreChat Multi-Model AI Gateway",
    defaultPathHint: "~/.librechat/librechat.yaml",
  },
  {
    id: "trae",
    name: "Trae",
    description: "ByteDance Trae AI IDE",
    defaultPathHint: "~/.trae/mcp.json",
  },
  {
    id: "kiro",
    name: "Kiro",
    description: "Kiro AI Development Assistant",
    defaultPathHint: "~/.kiro/mcp.json",
  },
];

function inferClientNameFromPath(filePath: string): string {
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  if (norm.includes("saoudrizwan.claude-dev")) return "VS Code (Cline)";
  if (norm.includes("rooveterinaryinc.roo-cline")) return "VS Code (Roo Code)";
  if (norm.includes(".continue")) return "Continue";
  if (norm.includes("zed")) return "Zed";
  if (norm.includes("goose")) return "Goose";
  if (norm.includes("librechat")) return "LibreChat";
  if (norm.includes("trae")) return "Trae";
  if (norm.includes("kiro")) return "Kiro";
  if (norm.includes("cursor")) return "Cursor";
  if (norm.includes("windsurf")) return "Windsurf";
  if (norm.includes("antigravity")) return "Antigravity IDE";
  if (norm.includes("claude")) return "Claude Desktop";

  const parts = filePath.replace(/\\/g, "/").split("/");
  const fileName = parts.pop() || "";
  const parentFolder = parts.pop() || "";

  if (
    parentFolder &&
    parentFolder.toLowerCase() !== "settings" &&
    parentFolder.toLowerCase() !== "user" &&
    !parentFolder.startsWith(".")
  ) {
    return parentFolder.charAt(0).toUpperCase() + parentFolder.slice(1);
  }

  const baseName = fileName.replace(/\.json$/i, "").replace(/[-_]?(mcp|config|settings)[-_]?/gi, " ").trim();
  if (baseName.length > 0) {
    return baseName
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return "Custom MCP Client";
}

export const AiClientsModal: React.FC<AiClientsModalProps> = ({
  isOpen,
  detectedClients,
  onClose,
  onRescan,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Custom Client registration dialog state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [customConfigPath, setCustomConfigPath] = useState("");
  const [customClientName, setCustomClientName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleRescan = async () => {
    setIsScanning(true);
    try {
      await onRescan();
      setStatusMsg("AI clients rescan complete");
      setTimeout(() => setStatusMsg(null), 2500);
    } catch {
      setStatusMsg("Rescan failed");
      setTimeout(() => setStatusMsg(null), 2500);
    } finally {
      setIsScanning(false);
    }
  };

  const handleReveal = async (pathOrId: string) => {
    if (window.api?.revealInExplorer) {
      try {
        const res = await window.api.revealInExplorer(pathOrId);
        if (res?.success) {
          const fileName = res.path ? res.path.split(/[\\/]/).pop() : "config file";
          setStatusMsg(`Opened in File Explorer (${fileName})`);
          setTimeout(() => setStatusMsg(null), 3000);
        } else {
          setStatusMsg("Config file location not found on disk");
          setTimeout(() => setStatusMsg(null), 3000);
        }
      } catch (err: any) {
        setStatusMsg("Explorer error: " + err.message);
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } else {
      setStatusMsg("File explorer integration unavailable in browser preview");
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleOpenAddCustomDialog = async () => {
    setAddError(null);
    if (window.api?.showOpenDialog) {
      try {
        const result = await window.api.showOpenDialog({
          title: "Select MCP Configuration File",
          properties: ["openFile"],
          filters: [
            { name: "JSON Files", extensions: ["json"] },
            { name: "All Files", extensions: ["*"] },
          ],
        });

        if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          const inferredName = inferClientNameFromPath(selectedPath);
          setCustomConfigPath(selectedPath);
          setCustomClientName(inferredName);
          setAddModalOpen(true);
        }
      } catch (err: any) {
        setStatusMsg("File picker error: " + err.message);
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } else {
      setStatusMsg("File picker is only available in desktop Electron app");
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleSaveCustomClient = async () => {
    if (!customClientName.trim()) {
      setAddError("Please enter a client name");
      return;
    }
    if (!customConfigPath.trim()) {
      setAddError("Please select a configuration file");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const res = await registerCustomClient(customClientName.trim(), customConfigPath.trim());
      if (res.success) {
        setAddModalOpen(false);
        setStatusMsg(`Custom client "${customClientName}" registered`);
        setTimeout(() => setStatusMsg(null), 3000);
        await onRescan();
      } else {
        setAddError(res.error || "Failed to register custom client");
      }
    } catch (err: any) {
      setAddError(err?.message || "Registration failed");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCustomClient = async (clientId: string, clientDisplayName: string) => {
    try {
      const res = await unregisterCustomClient(clientId);
      if (res.success) {
        setStatusMsg(`Removed custom client "${clientDisplayName}"`);
        setTimeout(() => setStatusMsg(null), 2500);
        await onRescan();
      } else {
        setStatusMsg(res.error || "Failed to remove custom client");
        setTimeout(() => setStatusMsg(null), 2500);
      }
    } catch (err: any) {
      setStatusMsg("Error removing client: " + err.message);
      setTimeout(() => setStatusMsg(null), 2500);
    }
  };

  const detectedCount = detectedClients.length;

  return (
    <div className="absolute top-[46px] inset-x-0 bottom-0 bg-[#07080B]/85 backdrop-blur-sm z-40 flex flex-col justify-end">
      <div className="w-full h-full bg-[#0E1017] border-t border-[#1E222D] flex flex-col justify-between shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200 relative">
        {/* Header */}
        <div className="h-10 px-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
              title="Back"
            >
              <ArrowLeft size={15} />
            </button>
            <span className="text-xs font-semibold text-white tracking-tight">
              AI Clients & IDEs
            </span>
            <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/60">
              {detectedCount} Detected
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleOpenAddCustomDialog}
              className="h-7 px-2.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white text-[11px] font-mono flex items-center space-x-1.5 transition-all active:scale-95 group/add"
              title="Add Custom Client"
            >
              <Plus className="w-3 h-3 text-zinc-400 group-hover/add:text-zinc-200 transition-colors" />
              <span>Add Custom Client</span>
            </button>

            <button
              onClick={handleRescan}
              disabled={isScanning}
              className="h-7 px-2.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white text-[11px] font-mono flex items-center space-x-1.5 transition-all active:scale-95 group/rescan disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 text-zinc-400 group-hover/rescan:rotate-180 transition-transform duration-500 ${
                  isScanning ? "animate-spin" : ""
                }`}
              />
              <span>{isScanning ? "Scanning..." : "Rescan"}</span>
            </button>
          </div>
        </div>

        {/* Notification banner if status message exists */}
        {statusMsg && (
          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono text-zinc-300 flex items-center space-x-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Overview Info Card */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs">
            <div>
              <p className="text-zinc-200 font-medium">Universal AI Client Detection</p>
              <p className="text-[10.5px] font-mono text-zinc-400 mt-0.5">
                Omni MCP automatically connects and synchronizes MCP servers across all detected AI environments and custom configurations.
              </p>
            </div>
          </div>

          {/* Detected Clients List */}
          <div className="space-y-2.5">
            {detectedClients.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                <Bot className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-300">No AI Clients Detected</p>
                <p className="text-[10.5px] font-mono text-zinc-500 mt-1">
                  Ensure Antigravity, Claude, Cursor, or another MCP client is installed, or add a custom client above.
                </p>
              </div>
            ) : (
              detectedClients.map((client) => {
                const meta = ALL_SUPPORTED_CLIENTS.find(
                  (c) => c.id === client.id || c.name.toLowerCase() === client.name.toLowerCase()
                );
                const displayName = meta?.name || client.name;
                const serverCount = client.servers ? client.servers.length : 0;

                return (
                  <div
                    key={client.id}
                    className="p-3.5 rounded-xl border bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-all"
                  >
                    {/* Top Row: Name and Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center border text-xs font-mono font-semibold bg-zinc-800 border-zinc-700 text-zinc-100 overflow-hidden p-0.5 shrink-0">
                          {client.iconUrl ? (
                            <img
                              src={client.iconUrl}
                              alt={displayName}
                              className="w-full h-full object-contain rounded-md"
                            />
                          ) : (
                            displayName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-white">
                              {displayName}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 flex items-center space-x-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Detected</span>
                            </span>
                            {client.isCustom && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/50">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReveal(client.configPath || client.id);
                          }}
                          className="h-6 px-2.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-300 hover:text-white text-[10.5px] font-mono flex items-center space-x-1.5 transition-all active:scale-95 group"
                        >
                          <FolderOpen className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                          <span>Show in Explorer</span>
                        </button>
                        {client.isCustom && (
                          <button
                            onClick={() => handleRemoveCustomClient(client.id, displayName)}
                            className="h-6 w-6 rounded-md bg-zinc-800/80 hover:bg-rose-950/60 border border-zinc-700/60 hover:border-rose-800/60 text-zinc-400 hover:text-rose-300 flex items-center justify-center transition-all active:scale-95"
                            title="Remove Custom Client"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Details section */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-2">
                      {/* Path row */}
                      <div className="flex items-center justify-between text-[10.5px] font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-800/80">
                        <span className="text-zinc-400 shrink-0 mr-2">Config File:</span>
                        <span className="text-zinc-300 truncate max-w-[340px]" title={client.configPath}>
                          {client.configPath}
                        </span>
                      </div>

                      {/* Synced Servers row */}
                      <div className="flex items-center justify-between text-[10.5px] font-mono">
                        <div className="flex items-center space-x-1.5 text-zinc-400">
                          <Layers className="w-3 h-3 text-zinc-400" />
                          <span>Configured Servers:</span>
                        </div>
                        <span className="text-emerald-400 font-semibold">
                          {serverCount} {serverCount === 1 ? "Server" : "Servers"}
                        </span>
                      </div>

                      {/* Server tags pills */}
                      {client.servers && client.servers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {client.servers.map((srv) => (
                            <span
                              key={srv}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300"
                            >
                              {srv}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* In-line Modal for Confirming Custom Client Registration */}
        {addModalOpen && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-[420px] bg-[#101217] border border-[#1E222D] rounded-xl p-4 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-white">Add Custom MCP Client</span>
                </div>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] font-mono text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="space-y-2.5">
                <div>
                  <label className="text-[10.5px] font-mono text-zinc-400 block mb-1">
                    Client Display Name
                  </label>
                  <input
                    type="text"
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                    placeholder="e.g. Zed, Cline, Goose"
                    className="w-full h-8 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-mono text-zinc-400 block mb-1">
                    Selected Config Path
                  </label>
                  <div
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[10.5px] font-mono text-zinc-300 truncate"
                    title={customConfigPath}
                  >
                    {customConfigPath}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="h-7 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white text-[11px] font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomClient}
                  disabled={isAdding || !customClientName.trim()}
                  className="h-7 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-[11px] font-mono flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <span>{isAdding ? "Registering..." : "Register Client"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="h-12 px-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          <span className="text-[10.5px] font-mono text-zinc-400">
            Total Detected: <strong className="text-white">{detectedCount}</strong>
          </span>
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-all active:scale-95 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
