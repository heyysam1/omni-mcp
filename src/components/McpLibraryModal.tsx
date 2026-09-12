import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { AiClient, AppSettings, CatalogFilter, McpCatalogItem, McpServerItem } from "../types";
import { MCP_CATALOG } from "../data/mcpCatalog";
import {
  fetchServerReadme,
  fetchLiveRegistryServers,
  getStoredInfiniteCatalog,
} from "../services/libraryService";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { McpIcon } from "./McpIcon";
import { BottomBar } from "./BottomBar";

interface McpLibraryModalProps {
  isOpen: boolean;
  detectedClients: AiClient[];
  installedServers?: McpServerItem[];
  settings?: AppSettings;
  onClose: () => void;
  onDeploy: (serverName: string, config: any, targetClientIds: string[]) => void;
  statusText?: string;
  memoryUsage?: string;
}

const CATEGORY_CHIPS: CatalogFilter[] = [
  "All",
  "Trending",
  "Latest",
  "GitHub",
  "Database",
];

// 12 rows x 2 columns = 24 items per page
const ITEMS_PER_PAGE = 24;

/**
 * Seeded pseudo-random shuffle to provide repeatable randomized discovery feeds
 */
function shuffleArray<T>(array: T[], seed: number = 1): T[] {
  const copy = [...array];
  let m = copy.length;
  let t, i;
  let s = seed;
  const random = () => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };
  while (m) {
    i = Math.floor(random() * m--);
    t = copy[m];
    copy[m] = copy[i];
    copy[i] = t;
  }
  return copy;
}

export const McpLibraryModal: React.FC<McpLibraryModalProps> = ({
  isOpen,
  detectedClients,
  installedServers = [],
  settings,
  onClose,
  onDeploy,
  statusText = "Omni MCP",
  memoryUsage = "98 MB",
}) => {
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedServer, setSelectedServer] = useState<McpCatalogItem | null>(null);
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 1000) + 1);
  const catalogScrollRef = useRef<HTMLDivElement>(null);

  // Readme state for Detail View
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [isLoadingReadme, setIsLoadingReadme] = useState(false);

  // Dropdown tracking: which server card has its target client dropdown open
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Selected target client per item (item.id -> clientId)
  const [selectedTargetClientMap, setSelectedTargetClientMap] = useState<Record<string, string>>({});

  // Dynamic live registry servers fetched in background
  const [liveServers, setLiveServers] = useState<McpCatalogItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".install-dropdown-container")) {
        setOpenDropdownId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Initialize and load catalog
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setCurrentPage(1);
      setSelectedServer(null);
      setOpenDropdownId(null);
      setLiveServers([]);

      // Purge any legacy unverified cached items
      try {
        localStorage.removeItem("omni_mcp_infinite_catalog");
      } catch {}
    }
  }, [isOpen]);

  // Live registry search on query change
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timeout = setTimeout(() => {
      fetchLiveRegistryServers(0, 50, searchQuery.trim()).then(({ items }) => {
        if (items && items.length > 0) {
          setLiveServers((prev) => {
            const existingIds = new Set([
              ...MCP_CATALOG.map((c) => c.id),
              ...prev.map((c) => c.id),
            ]);
            const newUnique = items.filter((it) => !existingIds.has(it.id));
            return [...prev, ...newUnique];
          });
        }
      });
    }, 450);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Load readme when selected server changes
  useEffect(() => {
    if (selectedServer) {
      setIsLoadingReadme(true);
      fetchServerReadme(selectedServer)
        .then((md) => {
          setReadmeContent(md);
          setIsLoadingReadme(false);
        })
        .catch(() => {
          setReadmeContent(selectedServer.fallbackMarkdown || selectedServer.shortDescription);
          setIsLoadingReadme(false);
        });
    }
  }, [selectedServer]);

  // Unified all catalog items (preloaded + dynamically fetched)
  const allCatalogItems = useMemo(() => {
    const seen = new Set<string>();
    const combined: McpCatalogItem[] = [];

    for (const it of MCP_CATALOG) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        combined.push(it);
      }
    }
    for (const it of liveServers) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        combined.push(it);
      }
    }
    return combined;
  }, [liveServers]);

  // Filter & Categorize catalog items according to user specification
  const filteredItems = useMemo(() => {
    // 1. Filter by category & search query
    const matched = allCatalogItems.filter((item) => {
      let matchesCategory = false;
      if (activeFilter === "All") {
        matchesCategory = true;
      } else if (activeFilter === "Trending") {
        matchesCategory = item.categories.includes("Trending");
      } else if (activeFilter === "Latest") {
        matchesCategory = item.categories.includes("Latest");
      } else if (activeFilter === "GitHub") {
        matchesCategory =
          item.source === "GitHub" ||
          item.categories.includes("GitHub") ||
          Boolean(item.repoUrl && item.repoUrl.includes("github.com"));
      } else if (activeFilter === "Hugging Face") {
        matchesCategory =
          item.source === "Hugging Face" ||
          item.categories.includes("Hugging Face") ||
          item.shortDescription.toLowerCase().includes("hugging face") ||
          item.id.includes("huggingface");
      } else if (activeFilter === "TiniX") {
        matchesCategory =
          item.source === "TiniX" ||
          item.categories.includes("TiniX") ||
          item.id.includes("tinix");
      } else if (activeFilter === "Database") {
        matchesCategory =
          item.source === "Database" ||
          item.categories.includes("Database");
      } else if (activeFilter === "NPM") {
        matchesCategory =
          item.source === "NPM" ||
          item.categories.includes("NPM");
      }

      // Search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.shortDescription.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });

    // 2. Ordering & Randomization
    if (activeFilter === "All") {
      // User requirement: "অলে ক্লিক করে রাখলে র্যান্ডমলি প্রথম ১০টা রোতে এমসিপি সার্ভারগুলো দেখাবে"
      return shuffleArray(matched, shuffleSeed);
    } else if (activeFilter === "GitHub") {
      // User requirement: "গিটহাবে ক্লিক করলে গিটহাবে এমসিপি সার্ভারগুলো দেখাবে র্যান্ডম"
      return shuffleArray(matched, shuffleSeed + 77);
    } else if (activeFilter === "Trending") {
      // Sort by popularity / trending
      return [...matched].sort((a, b) => {
        const aT = a.categories.includes("Trending") ? 1 : 0;
        const bT = b.categories.includes("Trending") ? 1 : 0;
        return bT - aT;
      });
    } else if (activeFilter === "Latest") {
      // Sort by latest / freshness
      return [...matched].sort((a, b) => {
        const aL = a.categories.includes("Latest") ? 1 : 0;
        const bL = b.categories.includes("Latest") ? 1 : 0;
        return bL - aL;
      });
    }

    return matched;
  }, [allCatalogItems, activeFilter, searchQuery, shuffleSeed]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Trigger live loading if approaching last pages
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setOpenDropdownId(null);

      // If within 2 pages of end, fetch next batch from live registries
      if (newPage >= totalPages - 2 && !isLoadingMore) {
        setIsLoadingMore(true);
        fetchLiveRegistryServers(liveServers.length + 50, 100)
          .then(({ items, total }) => {
            if (items && items.length > 0) {
              setLiveServers((prev) => {
                const existingIds = new Set([
                  ...MCP_CATALOG.map((c) => c.id),
                  ...prev.map((c) => c.id),
                ]);
                const newItems = items.filter((m) => !existingIds.has(m.id));
                return [...prev, ...newItems];
              });
            }
          })
          .finally(() => setIsLoadingMore(false));
      }
    }
  };

  /**
   * Check real-time installation status directly against installedServers in App state.
   */
  const checkInstallStatus = (item: McpCatalogItem, targetClientId?: string) => {
    const matching = installedServers.find((s) => {
      const sName = (s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const sId = (s.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const iName = (item.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const iId = (item.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      if (s.id === item.id || sId === iId || sName === iName || sName === iId || sId === iName) {
        return true;
      }

      // Exact package match from item config in s.rawConfig.args
      if (item.config?.args && s.rawConfig?.args && Array.isArray(s.rawConfig.args)) {
        const itemPkg = item.config.args.find((a) => typeof a === "string" && !a.startsWith("-"));
        if (itemPkg && s.rawConfig.args.includes(itemPkg)) {
          return true;
        }
      }

      return false;
    });

    if (!matching) {
      return { isInstalled: false, inTargetClient: false, syncedClients: [] };
    }

    const synced = matching.syncedClients || [];
    const targetClient = targetClientId ? detectedClients.find((c) => c.id === targetClientId) : null;
    const inTargetClient = targetClientId
      ? synced.some(
          (c) =>
            c === targetClientId ||
            c.toLowerCase() === targetClientId.toLowerCase() ||
            (targetClient && targetClient.name.toLowerCase() === c.toLowerCase())
        )
      : false;

    return {
      isInstalled: synced.length > 0,
      inTargetClient,
      syncedClients: synced,
    };
  };

  /**
   * Execute actual deployment to chosen target AI Client
   */
  const handleDeployToClient = (item: McpCatalogItem, clientId?: string) => {
    const activeClientId = clientId || selectedTargetClientMap[item.id];
    if (!activeClientId) {
      setOpenDropdownId(selectedServer?.id === item.id ? "hero" : item.id);
      return;
    }
    const targetClients = [activeClientId];

    const configEnv = { ...(item.config.env || {}) };

    // Inject active vault keys if configured and toggled ON
    if (configEnv.BRAVE_API_KEY !== undefined) {
      if (settings?.vaultStatus?.BRAVE_API_KEY !== false && settings?.vault?.BRAVE_API_KEY) {
        configEnv.BRAVE_API_KEY = settings.vault.BRAVE_API_KEY;
      } else {
        delete configEnv.BRAVE_API_KEY;
      }
    }
    if (
      configEnv.GITHUB_PERSONAL_ACCESS_TOKEN !== undefined ||
      configEnv.GITHUB_TOKEN !== undefined
    ) {
      if (settings?.vaultStatus?.GITHUB_TOKEN !== false && settings?.vault?.GITHUB_TOKEN) {
        if (configEnv.GITHUB_PERSONAL_ACCESS_TOKEN !== undefined) {
          configEnv.GITHUB_PERSONAL_ACCESS_TOKEN = settings.vault.GITHUB_TOKEN;
        }
        if (configEnv.GITHUB_TOKEN !== undefined) {
          configEnv.GITHUB_TOKEN = settings.vault.GITHUB_TOKEN;
        }
      } else {
        delete configEnv.GITHUB_PERSONAL_ACCESS_TOKEN;
        delete configEnv.GITHUB_TOKEN;
      }
    }

    const configPayload = {
      name: item.name,
      command: item.config.command || "npx",
      args: item.config.args || ["-y", item.id],
      env: configEnv,
      transport: "stdio",
    };

    onDeploy(item.name, configPayload, targetClients);
    setOpenDropdownId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-[46px] inset-x-0 bottom-0 bg-[#07080B] z-40 flex flex-col justify-between shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* 1. Sub-Header: Single Back Arrow (<) on left, title "Library" / Server Name, and Repository Link on right */}
      <div className="h-10 px-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/90 shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            onClick={() => {
              if (selectedServer) {
                // Back from detail view to catalog view
                setSelectedServer(null);
              } else {
                // Back from catalog view to dashboard
                onClose();
              }
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors shrink-0"
            title="Back"
          >
            <ArrowLeft size={15} />
          </button>
          <h2 className="text-xs font-semibold text-white tracking-tight truncate">
            {selectedServer ? selectedServer.name : "Library"}
          </h2>
        </div>

        {/* Right Corner: Repository Visit Link when in Detail View */}
        {selectedServer && selectedServer.repoUrl ? (
          <button
            onClick={() => {
              if (window.api?.openExternal) {
                window.api.openExternal(selectedServer.repoUrl);
              } else {
                window.open(selectedServer.repoUrl, "_blank");
              }
            }}
            className="h-6 px-2 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-white flex items-center space-x-1.5 transition-colors shrink-0"
            title="Visit repository in browser"
          >
            <span>Repository</span>
            <ExternalLink size={11} className="text-zinc-400" />
          </button>
        ) : null}
      </div>

      {/* 2. Main Content Area */}
      {selectedServer ? (
        /* DETAIL VIEW: Centered Hero Card + Authentic Structured Markdown */
        <div className="flex-1 overflow-y-auto p-4 space-y-3 selection:bg-emerald-500/30">
          {(() => {
            const currentSelectedClientId = selectedTargetClientMap[selectedServer.id];
            const currentTargetClient = currentSelectedClientId
              ? detectedClients.find((c) => c.id === currentSelectedClientId)
              : null;
            const { inTargetClient } = checkInstallStatus(
              selectedServer,
              currentSelectedClientId
            );

            return (
              <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 flex flex-col items-center text-center shadow-lg">
                {/* Hero Icon */}
                <div className="w-12 h-12 rounded-xl bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center mb-2.5 shadow-sm">
                  <McpIcon
                    type={selectedServer.iconType}
                    color={selectedServer.iconColor}
                    src={selectedServer.iconUrl}
                    size={26}
                  />
                </div>

                <h2 className="text-base font-bold text-white tracking-tight mb-0.5 select-text">
                  {selectedServer.name}
                </h2>

                <div className="flex items-center justify-center space-x-1.5 text-xs text-zinc-400 mb-2 select-text">
                  <span>By {selectedServer.author}</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700/60">
                    {selectedServer.source}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 max-w-[420px] leading-relaxed mb-3 select-text">
                  {selectedServer.shortDescription}
                </p>

                {/* Centered Install Dropdown */}
                <div className="relative install-dropdown-container">
                  <div className="inline-flex rounded-lg shadow-sm border border-emerald-500/40 bg-emerald-500 text-black font-semibold text-xs overflow-hidden">
                    <button
                      onClick={() => {
                        if (!currentSelectedClientId) {
                          setOpenDropdownId("hero");
                          return;
                        }
                        handleDeployToClient(selectedServer, currentSelectedClientId);
                      }}
                      className="px-3.5 py-1.5 hover:bg-emerald-400 active:bg-emerald-600 transition-colors flex items-center space-x-1"
                    >
                      {inTargetClient ? (
                        <>
                          <Check size={13} className="text-black stroke-[3]" />
                          <span>Installed ({currentTargetClient?.name || "Client"})</span>
                        </>
                      ) : currentTargetClient ? (
                        <span>Install ({currentTargetClient.name})</span>
                      ) : (
                        <span>Install</span>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setOpenDropdownId(openDropdownId === "hero" ? null : "hero")
                      }
                      className="px-2 border-l border-emerald-600 hover:bg-emerald-400 active:bg-emerald-600 transition-colors flex items-center justify-center"
                      title="Select target AI client"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Dropdown Menu - Select Client Target */}
                  {openDropdownId === "hero" && (
                    <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-56 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      {detectedClients.length === 0 ? (
                        <div className="p-2 text-xs text-zinc-500 text-center font-mono">
                          No clients found
                        </div>
                      ) : (
                        <>
                          {currentSelectedClientId && (
                            <button
                              onClick={() => {
                                setSelectedTargetClientMap((prev) => {
                                  const next = { ...prev };
                                  delete next[selectedServer.id];
                                  return next;
                                });
                                setOpenDropdownId(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border-b border-zinc-800 pb-1.5 mb-1"
                            >
                              <span>Clear selection (Default)</span>
                            </button>
                          )}
                          {detectedClients.map((client) => {
                            const clientStatus = checkInstallStatus(selectedServer, client.id);
                            const isSelected = client.id === currentSelectedClientId;

                            return (
                              <button
                                key={client.id}
                                onClick={() => {
                                  setSelectedTargetClientMap((prev) => {
                                    const next = { ...prev };
                                    if (next[selectedServer.id] === client.id) {
                                      delete next[selectedServer.id];
                                    } else {
                                      next[selectedServer.id] = client.id;
                                    }
                                    return next;
                                  });
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? "bg-zinc-800 text-white font-medium"
                                    : "hover:bg-zinc-800/60 text-zinc-300"
                                }`}
                              >
                                <span className="truncate">{client.name}</span>
                                {clientStatus.inTargetClient && (
                                  <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-0.5">
                                    <Check size={11} />
                                    <span>Installed</span>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Full Structured Repository Markdown with dynamic link and image resolving */}
          <div className="pt-2">
            {isLoadingReadme ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-zinc-500">
                <Loader2 className="animate-spin text-emerald-400" size={20} />
                <span className="text-xs font-mono">Loading repository readme...</span>
              </div>
            ) : (
              <MarkdownRenderer
                content={readmeContent}
                repoUrl={selectedServer.repoUrl}
                rawReadmeUrl={selectedServer.rawReadmeUrl}
              />
            )}
          </div>
        </div>
      ) : (
        /* CATALOG VIEW: 12 Rows (24 Cards) per Page, Dynamic Filters, Scalable Pagination */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar & Chips Header */}
          <div className="p-3 pb-2 space-y-3 border-b border-zinc-800/80 bg-zinc-950/60 shrink-0">
            {/* 40px Height Search Input */}
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search"
                className="w-full h-10 pl-10 pr-8 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-600 transition-colors shadow-inner font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-zinc-500 hover:text-zinc-300 text-xs font-mono"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Chips - Expanded height, width, and comfortable spacing */}
            <div className="flex items-center space-x-2 overflow-x-auto py-1.5 scrollbar-none">
              {CATEGORY_CHIPS.map((chip) => {
                const isActive = activeFilter === chip;
                return (
                  <button
                    key={chip}
                    onClick={() => {
                      if (chip === "All") {
                        setActiveFilter("All");
                        catalogScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        setActiveFilter(chip);
                        setCurrentPage(1);
                        catalogScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className={`h-8 px-4 rounded-lg text-xs font-medium whitespace-nowrap transition-all select-none border ${
                      isActive
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold shadow-sm"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2-Column Grid (12 Rows / 24 items per page with scroll) */}
          <div ref={catalogScrollRef} className="flex-1 overflow-y-auto p-3">
            {pagedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-1">
                <Search size={22} className="opacity-40" />
                <span className="text-xs font-mono">No matching MCP servers found</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {pagedItems.map((item) => {
                  const isDropdownOpen = openDropdownId === item.id;
                  const targetClientId = selectedTargetClientMap[item.id];
                  const targetClient = targetClientId
                    ? detectedClients.find((c) => c.id === targetClientId)
                    : null;
                  const { inTargetClient } = checkInstallStatus(
                    item,
                    targetClientId
                  );

                  return (
                    <div
                      key={item.id}
                      data-card-id={item.id}
                      onClick={() => setSelectedServer(item)}
                      className="cursor-pointer rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col justify-between shadow-sm relative min-h-[142px] outline-none"
                    >
                      {/* Top Header: Icon + Title + Split Install Button */}
                      <div>
                        <div className="flex items-start justify-between gap-1.5 mb-2">
                          {/* Title & Icon */}
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0 overflow-hidden">
                              <McpIcon
                                type={item.iconType}
                                color={item.iconColor}
                                src={item.iconUrl}
                                size={15}
                              />
                            </div>
                            <span className="text-xs font-semibold text-white tracking-tight truncate select-text">
                              {item.name}
                            </span>
                          </div>

                          {/* Split Install Button */}
                          <div
                            className="relative install-dropdown-container shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-white font-medium text-[10px] overflow-hidden">
                              <button
                                onClick={() => {
                                  if (!targetClientId) {
                                    setOpenDropdownId(isDropdownOpen ? null : item.id);
                                    return;
                                  }
                                  handleDeployToClient(item, targetClientId);
                                }}
                                className={`px-2 py-0.5 hover:text-white transition-colors flex items-center space-x-1 ${
                                  inTargetClient
                                    ? "text-emerald-400 font-semibold"
                                    : "text-zinc-200"
                                }`}
                                title={targetClient ? `Install to ${targetClient.name}` : "Pick client to install"}
                              >
                                {inTargetClient && <Check size={10} className="stroke-[3]" />}
                                <span>
                                  {inTargetClient
                                    ? "Installed"
                                    : targetClient
                                    ? `Install (${targetClient.name})`
                                    : "Install"}
                                </span>
                              </button>
                              <button
                                onClick={() =>
                                  setOpenDropdownId(isDropdownOpen ? null : item.id)
                                }
                                className="px-1 border-l border-zinc-700 hover:bg-zinc-750 flex items-center justify-center text-zinc-400 hover:text-zinc-200"
                                title="Change target AI client"
                              >
                                <ChevronDown size={11} />
                              </button>
                            </div>

                            {/* Dropdown Menu - Select Client (Does NOT trigger install on click) */}
                            {isDropdownOpen && (
                              <div className="absolute right-0 mt-1 w-48 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-1 z-50 animate-in fade-in duration-100">
                                {detectedClients.length === 0 ? (
                                  <div className="p-1.5 text-[10px] text-zinc-500 font-mono text-center">
                                    No clients found
                                  </div>
                                ) : (
                                  <>
                                    {targetClientId && (
                                      <button
                                        onClick={() => {
                                          setSelectedTargetClientMap((prev) => {
                                            const next = { ...prev };
                                            delete next[item.id];
                                            return next;
                                          });
                                          setOpenDropdownId(null);
                                        }}
                                        className="w-full text-left px-2 py-1 rounded text-[10px] text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border-b border-zinc-800 pb-1 mb-1"
                                      >
                                        <span>Clear selection (Default)</span>
                                      </button>
                                    )}
                                    {detectedClients.map((client) => {
                                      const clientStatus = checkInstallStatus(item, client.id);
                                      const isTarget = client.id === targetClientId;

                                      return (
                                        <button
                                          key={client.id}
                                          onClick={() => {
                                            setSelectedTargetClientMap((prev) => {
                                              const next = { ...prev };
                                              if (next[item.id] === client.id) {
                                                delete next[item.id];
                                              } else {
                                                next[item.id] = client.id;
                                              }
                                              return next;
                                            });
                                            setOpenDropdownId(null);
                                          }}
                                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between transition-colors ${
                                            isTarget
                                              ? "bg-zinc-800 text-white font-medium"
                                              : "hover:bg-zinc-800/60 text-zinc-300"
                                          }`}
                                        >
                                          <span className="truncate">{client.name}</span>
                                          {clientStatus.inTargetClient && (
                                            <Check size={11} className="text-emerald-400 shrink-0" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Full 3-line Description with increased card height */}
                        <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed min-h-[46px] select-text">
                          {item.shortDescription}
                        </p>
                      </div>

                      {/* Footer: Author & Source */}
                      <div className="w-full pt-2 mt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono select-text">
                        <span className="truncate select-text">By {item.author}</span>
                        <span className="shrink-0 text-zinc-400 font-medium px-1.5 py-0.2 rounded bg-zinc-800/60 border border-zinc-700/40 text-[9px]">
                          {item.source}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Scalable Multi-Page Pagination Bar */}
          {totalPages > 1 && (
            <div className="h-9 px-3 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-center space-x-1 shrink-0 text-xs font-mono select-none">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors flex items-center space-x-0.5"
              >
                <span>‹ Previous</span>
              </button>

              <div className="flex items-center space-x-1 px-2">
                {(() => {
                  const pages: (number | string)[] = [];
                  if (totalPages <= 5) {
                    for (let p = 1; p <= totalPages; p++) pages.push(p);
                  } else {
                    pages.push(1);
                    if (currentPage > 3) pages.push("...");

                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);

                    for (let p = start; p <= end; p++) {
                      if (!pages.includes(p)) pages.push(p);
                    }

                    if (currentPage < totalPages - 2) pages.push("...");
                    if (!pages.includes(totalPages)) pages.push(totalPages);
                  }

                  return pages.map((page, idx) => {
                    if (page === "...") {
                      return (
                        <span key={`dots-${idx}`} className="text-zinc-600 px-1">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = page === currentPage;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page as number)}
                        className={`w-6 h-6 rounded flex items-center justify-center font-medium transition-colors ${
                          isCurrent
                            ? "bg-emerald-500 text-black font-bold shadow-sm"
                            : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages && !isLoadingMore}
                className="px-2 py-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors flex items-center space-x-0.5"
              >
                <span>Next ›</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. BottomBar Matching Home Dashboard */}
      <BottomBar statusText={statusText} memoryUsage={memoryUsage} />
    </div>
  );
};
