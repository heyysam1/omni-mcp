import React, { useState } from "react";
import { Filter, Terminal, Settings2, AppWindow, Database, Ban, Play, Box, X, Trash2 } from "lucide-react";
import { McpServerItem } from "../types";
import { McpIcon } from "./McpIcon";
import { MCP_CATALOG } from "../data/mcpCatalog";

interface InstalledServersProps {
  servers: McpServerItem[];
  filterText: string;
  onFilterChange: (text: string) => void;
  onToggleLogs: (serverId: string) => void;
  onEditConfig: (server: McpServerItem) => void;
  onDeleteServer: (server: McpServerItem) => void;
  onToggleServerState: (serverId: string) => void;
}

export const InstalledServers: React.FC<InstalledServersProps> = ({
  servers,
  filterText,
  onFilterChange,
  onToggleLogs,
  onEditConfig,
  onDeleteServer,
  onToggleServerState,
}) => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="pt-3 px-4 flex-1 min-h-0 flex flex-col overflow-hidden pb-1">
      {/* Section Header with Filter */}
      <div className="flex items-center justify-between pb-2 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-[13px] font-semibold text-white tracking-tight">
            Installed Servers
          </span>
          <span className="text-[10px] font-mono text-[#8A90A2] bg-[#10141D] border border-[#1C2230] px-2 py-0.5 rounded-full">
            {servers.length} {servers.length === 1 ? "server" : "servers"}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {showSearch ? (
            <div className="flex items-center space-x-1 animate-in fade-in duration-150">
              <input
                type="text"
                autoFocus
                value={filterText}
                onChange={(e) => onFilterChange(e.target.value)}
                placeholder="Search servers..."
                className="w-28 bg-[#090B10] border border-[#1E222D] rounded px-1.5 py-0.5 text-[10.5px] font-mono text-slate-200 outline-none focus:border-[#10B981]/50 placeholder-[#474E61]"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  onFilterChange("");
                }}
                className="text-[#8A90A2] hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center space-x-1 text-[#8A90A2] hover:text-white text-[11px] font-mono transition-colors"
            >
              <Filter className="w-3 h-3 text-[#5A6175]" />
              <span>Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Server Card Deck or Empty State */}
      {servers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-[#1E222D] rounded-xl bg-[#090B10]/50 my-2">
          <div className="w-10 h-10 rounded-xl bg-[#10141D] border border-[#1E2433] flex items-center justify-center text-[#5A6175] mb-2.5">
            <Box className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-semibold text-slate-200">No MCP Servers Configured</h3>
          <p className="text-[10.5px] font-mono text-[#5A6175] max-w-[290px] mt-1 leading-relaxed">
            Click "+ Deploy MCP Server" above to install and sync tools with your local AI clients.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 pb-3">
          {servers.map((server) => {
            const isLive = server.status === "live" || server.status === "active";
            const isActivating = server.status === "activating";
            const isCrashed = server.status === "error" || server.status === "crashed";

            // Universal metadata extraction from server identity, command, args, and config
            const sid = (server.id || "").toLowerCase();
            const sname = (server.name || "").toLowerCase();
            const rawArgs = Array.isArray(server.rawConfig?.args)
              ? server.rawConfig.args.join(" ")
              : "";
            const rawEnv = server.rawConfig?.env ? JSON.stringify(server.rawConfig.env) : "";
            const fullCorpus = `${sid} ${sname} ${server.configSnippet || ""} ${rawArgs} ${rawEnv}`.toLowerCase();

            // Match against catalog for official icons
            const catalogMatch = MCP_CATALOG.find(
              (c) =>
                c.id.toLowerCase() === sid ||
                c.name.toLowerCase() === sname ||
                sid.includes(c.id.toLowerCase()) ||
                fullCorpus.includes(c.id.toLowerCase())
            );

            let iconType = server.iconType || catalogMatch?.iconType;
            let iconColor = server.iconColor || catalogMatch?.iconColor || "#10B981";
            let iconUrl = server.iconUrl || catalogMatch?.iconUrl;

            // If not found in catalog, dynamically extract GitHub avatar if URL exists in config
            if (!iconUrl) {
              const ghMatch = fullCorpus.match(/github\.com\/([a-z0-9_-]+)/i);
              if (ghMatch && ghMatch[1] && ghMatch[1] !== "modelcontextprotocol") {
                iconUrl = `https://github.com/${ghMatch[1]}.png?size=64`;
              }
            }

            // Universal brand recognition for ANY installed server (active, stopped, or custom)
            if (!iconType) {
              if (fullCorpus.includes("slack")) {
                iconType = "slack";
                iconColor = "#E01E5A";
              } else if (fullCorpus.includes("spotify")) {
                iconType = "spotify";
                iconColor = "#1DB954";
              } else if (fullCorpus.includes("docker")) {
                iconType = "docker";
                iconColor = "#2496ED";
              } else if (fullCorpus.includes("github")) {
                iconType = "github";
                iconColor = "#FFFFFF";
              } else if (fullCorpus.includes("cloudflare")) {
                iconType = "cloudflare";
                iconColor = "#F38020";
              } else if (fullCorpus.includes("supabase")) {
                iconType = "supabase";
                iconColor = "#3ECF8E";
              } else if (fullCorpus.includes("notion")) {
                iconType = "notion";
                iconColor = "#FFFFFF";
                if (!iconUrl) iconUrl = "https://github.com/makenotion.png?size=64";
              } else if (fullCorpus.includes("obsidian")) {
                iconType = "obsidian";
                iconColor = "#7C3AED";
              } else if (fullCorpus.includes("todoist")) {
                iconType = "todoist";
                iconColor = "#E44332";
              } else if (fullCorpus.includes("sentry")) {
                iconType = "sentry";
                iconColor = "#7B61FF";
              } else if (fullCorpus.includes("postgres")) {
                iconType = "postgres";
                iconColor = "#336791";
              } else if (fullCorpus.includes("sqlite")) {
                iconType = "sqlite";
                iconColor = "#23678F";
              } else if (fullCorpus.includes("qdrant")) {
                iconType = "qdrant";
                iconColor = "#DC2626";
              } else if (fullCorpus.includes("chroma")) {
                iconType = "chroma";
                iconColor = "#F59E0B";
              } else if (fullCorpus.includes("netdata")) {
                iconType = "netdata";
                iconColor = "#00AB44";
              } else if (fullCorpus.includes("brave")) {
                iconType = "brave";
                iconColor = "#FB542B";
              } else if (fullCorpus.includes("neon")) {
                iconType = "neon";
                iconColor = "#00E599";
              } else if (fullCorpus.includes("playwright")) {
                iconType = "playwright";
                iconColor = "#2EAD33";
              } else if (fullCorpus.includes("puppeteer")) {
                iconType = "puppeteer";
                iconColor = "#00D8A2";
              } else if (fullCorpus.includes("draw") || fullCorpus.includes("paint") || fullCorpus.includes("canvas")) {
                iconType = "palette";
                iconColor = "#F43F5E";
              } else if (fullCorpus.includes("ecommerce") || fullCorpus.includes("shop") || fullCorpus.includes("store")) {
                iconType = "store";
                iconColor = "#3B82F6";
              } else if (
                server.transport === "http" ||
                fullCorpus.includes("database") ||
                fullCorpus.includes("sql") ||
                fullCorpus.includes("mongo") ||
                fullCorpus.includes("redis")
              ) {
                iconType = "database";
                iconColor = "#3B82F6";
              } else {
                iconType = "terminal";
                iconColor = "#10B981";
              }
            }

            return (
              <div
                key={server.id}
                className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-200 space-y-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] shrink-0"
              >
                {/* Top Row: Squircle Icon, Title, Subtitle, Status Pill */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    {/* Squircle Icon */}
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1">
                      <McpIcon
                        type={iconType}
                        color={iconColor}
                        src={iconUrl}
                        size={18}
                      />
                    </div>

                    <div>
                      <div className="text-[13px] font-semibold text-white tracking-tight leading-none">
                        {server.name}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 mt-1.5">
                        {server.port ? `Port ${server.port} • ` : ""}
                        {server.transport === "stdio"
                          ? "Stdio (npx)"
                          : server.transport === "http"
                          ? "SSE / HTTP"
                          : "SSE"}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill - Minimalist luxury indicator */}
                  <div
                    className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full border text-[10.5px] font-mono font-medium transition-colors ${
                      isLive
                        ? "bg-zinc-900/90 border-zinc-800 text-zinc-300"
                        : isActivating
                        ? "bg-zinc-900/90 border-zinc-800 text-amber-300"
                        : isCrashed
                        ? "bg-rose-950/40 border-rose-900/60 text-rose-300"
                        : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isLive
                          ? "bg-emerald-400"
                          : isActivating
                          ? "bg-amber-400 animate-pulse"
                          : isCrashed
                          ? "bg-rose-400 animate-pulse"
                          : "bg-zinc-500"
                      }`}
                    ></span>
                    <span className={isLive ? "text-emerald-400/90 font-medium" : isActivating ? "text-amber-300" : isCrashed ? "text-rose-400" : "text-zinc-400"}>
                      {isLive ? "Live" : isActivating ? "Activating..." : isCrashed ? "Crashed" : "Stopped"}
                    </span>
                  </div>
                </div>

                {/* Tag Pills (Synced AI Clients) */}
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  {server.syncedClients.map((client) => (
                    <span
                      key={client}
                      className="text-[10px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800/90 px-2 py-0.5 rounded-md"
                    >
                      #{client}
                    </span>
                  ))}
                </div>

                {/* Action Toolbar */}
                <div className="pt-2 flex items-center justify-between border-t border-zinc-800/70">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onToggleLogs(server.id)}
                      className="h-6 px-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10.5px] font-mono flex items-center space-x-1.5 transition-all duration-150 active:scale-95 group/log"
                    >
                      <Terminal className="w-3 h-3 text-zinc-400 group-hover/log:text-zinc-200 transition-colors" />
                      <span>Logs</span>
                    </button>

                    <button
                      onClick={() => onEditConfig(server)}
                      className="h-6 px-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10.5px] font-mono flex items-center space-x-1.5 transition-all duration-150 active:scale-95 group/cfg"
                    >
                      <Settings2 className="w-3 h-3 text-zinc-400 group-hover/cfg:rotate-45 transition-transform duration-200" />
                      <span>Config</span>
                    </button>

                    <button
                      onClick={() => onDeleteServer(server)}
                      className="h-6 px-2 rounded-md bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-900/60 text-zinc-400 hover:text-rose-400 text-[10.5px] font-mono flex items-center justify-center transition-all duration-150 active:scale-95 group/del"
                      title={`Delete ${server.name} from config`}
                    >
                      <Trash2 className="w-3 h-3 text-zinc-500 group-hover/del:text-rose-400 transition-colors" />
                    </button>
                  </div>

                  {/* Stateful Start / Terminate / Activating Button */}
                  {isActivating ? (
                    <div className="flex items-center space-x-1.5 text-[10.5px] font-mono text-amber-400 opacity-80 cursor-wait">
                      <span className="w-2 h-2 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Activating...</span>
                    </div>
                  ) : isLive ? (
                    <button
                      onClick={() => onToggleServerState(server.id)}
                      className="flex items-center space-x-1 text-[10.5px] font-mono text-zinc-400 hover:text-rose-400 transition-colors duration-150 active:scale-95 group/term"
                    >
                      <Ban className="w-3 h-3 text-zinc-500 group-hover/term:text-rose-400 transition-colors" />
                      <span>Terminate</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleServerState(server.id)}
                      className="flex items-center space-x-1 text-[10.5px] font-mono text-zinc-300 hover:text-emerald-400 transition-colors duration-150 active:scale-95 group/play"
                    >
                      <Play className="w-3 h-3 text-emerald-500 group-hover/play:scale-110 transition-transform" />
                      <span>{isCrashed ? "Restart" : "Start"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="h-3 shrink-0"></div>
        </div>
      )}
    </div>
  );
};
