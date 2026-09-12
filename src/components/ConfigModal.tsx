import React, { useState, useEffect } from "react";
import { ArrowLeft, Copy, Check, Trash2, Save, Sparkles, AlertCircle, FolderOpen } from "lucide-react";
import { McpServerItem } from "../types";
import { formatSingleServerConfig } from "../services/jsonHelper";

interface ConfigModalProps {
  isOpen: boolean;
  server: McpServerItem | null;
  onClose: () => void;
  onDelete: (serverId: string, serverName: string) => void;
  onSave: (serverName: string, newConfig: any) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  server,
  onClose,
  onDelete,
  onSave,
}) => {
  const [configText, setConfigText] = useState("");
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (server) {
      const initial = server.rawConfig || {
        command: "npx",
        args: server.configSnippet ? server.configSnippet.split(" ").slice(1) : [],
      };
      setConfigText(JSON.stringify(initial, null, 2));
      setStatusMsg(null);
    }
  }, [server]);

  if (!isOpen || !server) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(configText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleFormat = () => {
    const res = formatSingleServerConfig(configText);
    if (res.success) {
      setConfigText(res.formatted);
      setStatusMsg("Formatted JSON");
      setTimeout(() => setStatusMsg(null), 2500);
    } else {
      setStatusMsg("JSON syntax error: " + res.error);
    }
  };

  const handleSave = () => {
    const res = formatSingleServerConfig(configText);
    if (res.success) {
      onSave(server.id, res.parsed);
      onClose();
    } else {
      setStatusMsg("JSON syntax error: " + res.error);
    }
  };

  const handleDelete = () => {
    onDelete(server.id, server.name);
  };

  const handleReveal = async () => {
    if (window.api?.revealInExplorer) {
      try {
        const res = await window.api.revealInExplorer(server.name);
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

  return (
    <div className="absolute top-[46px] inset-x-0 bottom-0 bg-[#07080B]/85 backdrop-blur-sm z-40 flex flex-col justify-end">
      <div className="w-full h-full bg-[#0E1017] border-t border-[#1E222D] flex flex-col justify-between shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="h-10 px-3 border-b border-zinc-800 flex items-center space-x-2 bg-zinc-950 shrink-0">
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            title="Back"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="text-xs font-semibold text-zinc-300 tracking-tight">
            Server Config:
          </span>
          <span className="text-xs font-mono text-zinc-200 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/60">
            {server.name}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Metadata Bar */}
          <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400">Transport:</span>
              <span className="text-zinc-200 uppercase font-medium">{server.transport}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <span className="text-zinc-400">Synced:</span>
                <span className="text-zinc-200">{server.syncedClients.join(", ")}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReveal();
                }}
                className="h-6 px-2.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-300 hover:text-white flex items-center space-x-1.5 text-[10.5px] transition-all active:scale-95 group"
              >
                <FolderOpen className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                <span>Show in Explorer</span>
              </button>
            </div>
          </div>

          {/* JSON Editor Box */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 focus-within:border-zinc-600 transition-colors flex flex-col">
            <div className="px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>JSON Definition on Disk</span>
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={handleFormat}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 transition-colors group/fmt"
                >
                  <Sparkles className="w-2.5 h-2.5 text-zinc-500 group-hover/fmt:text-zinc-300 transition-colors" />
                  <span>Format</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 transition-colors group/cp"
                >
                  {copied ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5 text-zinc-500 group-hover/cp:text-zinc-300 transition-colors" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={12}
              className="w-full bg-transparent p-3 text-xs font-mono text-zinc-200 outline-none resize-none leading-relaxed selection:bg-zinc-800"
            />

            {statusMsg && (
              <div className="px-3 py-1.5 bg-zinc-900 border-t border-zinc-800 text-[10.5px] font-mono text-zinc-300 flex items-center space-x-1.5">
                <AlertCircle className="w-3 h-3 text-zinc-400" />
                <span>{statusMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          <button
            onClick={handleDelete}
            className="h-8 px-3 rounded-lg text-xs font-mono flex items-center space-x-1.5 border transition-all active:scale-95 text-zinc-400 hover:text-rose-400 bg-transparent hover:bg-rose-500/10 border-transparent hover:border-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Server</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="h-8 px-3 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="h-8 px-3.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center space-x-1.5 transition-all active:scale-95 shadow-sm"
            >
              <Save className="w-3.5 h-3.5 text-zinc-900" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
