import React, { useState, useEffect } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AiClient } from "../types";
import { sanitizeAndFormatJson, toggleAllowHttp } from "../services/jsonHelper";

interface DeployModalProps {
  isOpen: boolean;
  detectedClients: AiClient[];
  onClose: () => void;
  onDeploy: (serverName: string, rawConfig: any, targetClientIds: string[]) => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  detectedClients,
  onClose,
  onDeploy,
}) => {
  const [inputText, setInputText] = useState("");
  const [allowHttp, setAllowHttp] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Reset input and selection whenever modal opens so every deployment starts clean
  useEffect(() => {
    if (isOpen) {
      setInputText("");
      setAllowHttp(false);
      setSelectedClients([]);
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle on-paste auto-format
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const result = sanitizeAndFormatJson(pastedText);

    if (result.success) {
      // If allowHttp is already toggled on, auto-inject --allow-http
      let finalJson = result.formatted;
      if (allowHttp) {
        finalJson = toggleAllowHttp(finalJson, true);
      }
      setInputText(finalJson);
      setStatusMsg(
        result.isCliConverted
          ? `Auto-converted CLI command (${result.serverName}) to MCP JSON!`
          : "Auto-formatted and sanitized JSON on paste"
      );
      setTimeout(() => setStatusMsg(null), 3000);
    } else {
      setInputText(pastedText);
    }
  };

  const handleToggleHttp = (enabled: boolean) => {
    setAllowHttp(enabled);
    if (inputText.trim()) {
      const updated = toggleAllowHttp(inputText, enabled);
      setInputText(updated);
      setStatusMsg(enabled ? 'Added "--allow-http" flag' : 'Removed "--allow-http" flag');
      setTimeout(() => setStatusMsg(null), 2000);
    }
  };

  const handleManualFormat = () => {
    const result = sanitizeAndFormatJson(inputText);
    if (result.success) {
      setInputText(result.formatted);
      setStatusMsg(
        result.isCliConverted
          ? `Auto-converted CLI command (${result.serverName}) to MCP JSON!`
          : "Auto-repaired & formatted JSON successfully!"
      );
      setTimeout(() => setStatusMsg(null), 3000);
    } else {
      setStatusMsg("Could not parse JSON: " + result.error);
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const handleDeploySubmit = () => {
    if (!inputText.trim()) {
      setStatusMsg("Please paste a JSON configuration or npx command.");
      return;
    }

    const result = sanitizeAndFormatJson(inputText);
    if (!result.success) {
      setStatusMsg("Could not auto-repair JSON: " + result.error);
      return;
    }

    if (selectedClients.length === 0) {
      setStatusMsg("Please select at least one AI client to sync with.");
      return;
    }

    // Extract server name
    const configData = result.parsed;
    const serverName =
      result.serverName ||
      Object.keys(configData.mcpServers || configData.servers || configData)[0] ||
      "custom-mcp-server";

    onDeploy(serverName, configData, selectedClients);
    onClose();
  };

  return (
    <div className="absolute top-[46px] inset-x-0 bottom-0 bg-[#07080B]/85 backdrop-blur-sm z-40 flex flex-col justify-end">
      <div className="w-full h-full bg-[#0E1017] border-t border-[#1E222D] flex flex-col justify-between shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="h-10 px-3 border-b border-[#1E222D] flex items-center space-x-2 bg-[#0B0D13] shrink-0">
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            title="Back"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="text-xs font-semibold text-white tracking-tight">
            Deploy MCP Server
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Textarea Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono text-[#8A90A2]">
                Server JSON, CLI command, or npx runner
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <span className="text-[10px] font-mono text-[#8A90A2]">Allow HTTP</span>
                <input
                  type="checkbox"
                  checked={allowHttp}
                  onChange={(e) => handleToggleHttp(e.target.checked)}
                  className="accent-emerald-500 rounded bg-[#161922] border-[#1E222D] cursor-pointer"
                />
              </label>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 focus-within:border-zinc-600 transition-colors">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                rows={6}
                placeholder="Paste JSON or terminal CLI command here..."
                className="w-full bg-transparent p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none resize-none leading-relaxed selection:bg-zinc-800"
              />
              <div className="px-3 py-1.5 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className={statusMsg ? "text-emerald-400 font-medium" : "text-zinc-500"}>
                  {statusMsg || "Auto-detects Codex/Claude CLI, Stdio & SSE"}
                </span>
                <button
                  onClick={handleManualFormat}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 font-medium transition-colors group/fmt"
                >
                  <Sparkles className="w-2.5 h-2.5 text-zinc-500 group-hover/fmt:text-zinc-300 transition-colors" />
                  <span>Auto-Fix & Format</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sync Clients (Strictly Detected AI Clients ONLY) */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400">
                Sync with Detected Clients
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {detectedClients.length} Found on PC
              </span>
            </div>

            <div className="space-y-1.5">
              {detectedClients.map((client) => {
                const isChecked = selectedClients.includes(client.id);
                return (
                  <label
                    key={client.id}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                      isChecked
                        ? "bg-zinc-850 border-zinc-700 shadow-sm"
                        : "bg-zinc-900/40 border-zinc-800/60 opacity-60"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleClientSelection(client.id)}
                        className="accent-zinc-100 rounded bg-zinc-900 border-zinc-700 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-zinc-200">
                        {client.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 max-w-[200px] truncate">
                      {client.configPath}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleDeploySubmit}
            className="h-8 px-3.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center space-x-1.5 transition-all active:scale-95 shadow-sm"
          >
            <span>Deploy & Sync</span>
          </button>
        </div>
      </div>
    </div>
  );
};
