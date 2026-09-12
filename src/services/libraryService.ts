import { McpCatalogItem, CatalogSource } from "../types";
import { MCP_CATALOG } from "../data/mcpCatalog";

const CACHE_STORAGE_KEY = "omni_mcp_library_cache";
const INFINITE_CATALOG_STORAGE_KEY = "omni_mcp_infinite_catalog";

interface CacheRecord {
  markdown: string;
  cachedAt: number;
}

// In-memory runtime cache for instantaneous navigation
const memoryCache = new Map<string, string>();
let liveRegistryTotalCount = 10000;

// Read stored persistent cache
function getStoredCache(): Record<string, CacheRecord> {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

// Save to persistent cache
function saveToCache(id: string, markdown: string) {
  try {
    memoryCache.set(id, markdown);
    const store = getStoredCache();
    store[id] = {
      markdown,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

/**
 * Fetch the authentic README directly from the remote repository
 * with graceful fallback to built-in structured markdown
 */
export async function fetchServerReadme(server: McpCatalogItem): Promise<string> {
  // 1. Check memory cache
  if (memoryCache.has(server.id)) {
    return memoryCache.get(server.id)!;
  }

  // 2. Check localStorage cache (valid for 24 hours)
  const stored = getStoredCache();
  const cached = stored[server.id];
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (cached && Date.now() - cached.cachedAt < ONE_DAY && cached.markdown) {
    memoryCache.set(server.id, cached.markdown);
    return cached.markdown;
  }

  // 3. Live fetch from remote raw repository if URL exists
  if (server.rawReadmeUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const res = await fetch(server.rawReadmeUrl, {
        signal: controller.signal,
        headers: {
          Accept: "text/plain, text/markdown, */*",
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 40) {
          saveToCache(server.id, text);
          return text;
        }
      }
    } catch {
      // Gracefully continue to fallback
    }
  }

  // 4. Return built-in structured fallback markdown
  const fallback = server.fallbackMarkdown || `# ${server.name}\n\n${server.shortDescription}`;
  saveToCache(server.id, fallback);
  return fallback;
}

/**
 * Get current cache statistics (item count and approximate size)
 */
export function getLibraryCacheStats(): { count: number; sizeKb: string } {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY) || "";
    const store = getStoredCache();
    const count = Object.keys(store).length;
    const bytes = new Blob([raw]).size;
    const sizeKb = (bytes / 1024).toFixed(1) + " KB";
    return { count, sizeKb };
  } catch {
    return { count: 0, sizeKb: "0 KB" };
  }
}

/**
 * Purge all cached library readmes from disk and memory
 */
export function clearLibraryCache(): boolean {
  try {
    memoryCache.clear();
    localStorage.removeItem(CACHE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve persistent stored infinite catalog items
 */
export function getStoredInfiniteCatalog(): McpCatalogItem[] {
  try {
    const raw = localStorage.getItem(INFINITE_CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Append newly discovered servers to persistent infinite catalog storage
 */
export function saveInfiniteCatalogItems(newItems: McpCatalogItem[]) {
  try {
    const existing = getStoredInfiniteCatalog();
    const idMap = new Map<string, McpCatalogItem>();
    for (const item of existing) idMap.set(item.id, item);
    for (const item of newItems) {
      if (!idMap.has(item.id)) idMap.set(item.id, item);
    }
    const combined = Array.from(idMap.values());
    localStorage.setItem(INFINITE_CATALOG_STORAGE_KEY, JSON.stringify(combined.slice(0, 500)));
  } catch {}
}

export function getLiveRegistryTotalCount(): number {
  return liveRegistryTotalCount;
}

export function cleanRepositoryUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== "string") return undefined;
  let clean = rawUrl.trim();
  clean = clean.replace(/^git\+/, "");
  clean = clean.replace(/^git:\/\//, "https://");
  clean = clean.replace(/^ssh:\/\/git@github\.com\//, "https://github.com/");
  clean = clean.replace(/^git@github\.com:/, "https://github.com/");
  clean = clean.replace(/\.git$/, "");
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  return undefined;
}

/**
 * Live search and dynamic expansion across NPM open registry
 * Scans thousands of packages with smart categorization and icon assignment
 */
export async function fetchLiveRegistryServers(
  fromIndex: number = 0,
  size: number = 50,
  searchQuery?: string
): Promise<{ items: McpCatalogItem[]; total: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const queryParam = searchQuery
      ? `${encodeURIComponent(searchQuery)} mcp-server`
      : "mcp-server";

    const res = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${queryParam}&size=${size}&from=${fromIndex}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return { items: [], total: liveRegistryTotalCount };
    const data = await res.json();
    if (!data.objects || !Array.isArray(data.objects)) return { items: [], total: liveRegistryTotalCount };

    if (typeof data.total === "number" && data.total > 0) {
      liveRegistryTotalCount = data.total;
    }

    const items = data.objects
      .filter((obj: any) => {
        const pkg = obj.package;
        if (!pkg?.name || pkg.name.includes("deprecated")) return false;
        const cleanRepo = cleanRepositoryUrl(pkg.links?.repository);
        // Strictly filter out packages with no repository or invalid repos to eliminate 404s
        return !!cleanRepo && cleanRepo.includes("github.com/");
      })
      .map((obj: any): McpCatalogItem => {
        const pkg = obj.package;
        const name: string = pkg.name || "";
        const desc: string = pkg.description || "";
        const keywords: string[] = Array.isArray(pkg.keywords) ? pkg.keywords : [];
        const textCorpus = `${name} ${desc} ${keywords.join(" ")}`.toLowerCase();

        // Clean and format display name
        const cleanName = name
          .replace(/^@modelcontextprotocol\/server-/, "")
          .replace(/^@[\w-]+\//, "")
          .replace(/-mcp-server$/, "")
          .replace(/-mcp$/, "")
          .replace(/^mcp-server-/, "");
        const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

        // Smart Categorization & Icon assignment
        const categories: string[] = [];
        let source: CatalogSource = "GitHub";
        let iconType = "github";
        let iconColor = "#FFFFFF";

        if (textCorpus.includes("slack")) {
          iconType = "slack";
          iconColor = "#E01E5A";
        } else if (textCorpus.includes("docker")) {
          iconType = "docker";
          iconColor = "#2496ED";
        } else if (textCorpus.includes("playwright")) {
          iconType = "playwright";
          iconColor = "#2EAD33";
        } else if (textCorpus.includes("puppeteer")) {
          iconType = "puppeteer";
          iconColor = "#00D8A2";
        } else if (textCorpus.includes("spotify")) {
          iconType = "spotify";
          iconColor = "#1DB954";
        } else if (textCorpus.includes("obsidian")) {
          iconType = "obsidian";
          iconColor = "#7C3AED";
        } else if (textCorpus.includes("todoist")) {
          iconType = "todoist";
          iconColor = "#E44332";
        } else if (textCorpus.includes("cloudflare")) {
          iconType = "cloudflare";
          iconColor = "#F38020";
        } else if (textCorpus.includes("sentry")) {
          iconType = "sentry";
          iconColor = "#7B61FF";
        } else if (textCorpus.includes("postgres")) {
          iconType = "postgres";
          iconColor = "#336791";
        } else if (textCorpus.includes("sqlite")) {
          iconType = "sqlite";
          iconColor = "#23678F";
        } else if (textCorpus.includes("supabase")) {
          iconType = "supabase";
          iconColor = "#3ECF8E";
        } else if (textCorpus.includes("qdrant")) {
          iconType = "qdrant";
          iconColor = "#DC2626";
        } else if (textCorpus.includes("chroma")) {
          iconType = "chroma";
          iconColor = "#F59E0B";
        } else if (textCorpus.includes("netdata")) {
          iconType = "netdata";
          iconColor = "#00AB44";
        } else if (textCorpus.includes("brave")) {
          iconType = "brave";
          iconColor = "#FB542B";
        } else if (name.startsWith("@modelcontextprotocol/") || name.includes("modelcontextprotocol")) {
          source = "Official";
          categories.push("Official", "GitHub");
          iconType = "official";
          iconColor = "#10B981";
        } else if (
          textCorpus.includes("mysql") ||
          textCorpus.includes("mongo") ||
          textCorpus.includes("redis") ||
          textCorpus.includes("database") ||
          textCorpus.includes("duckdb") ||
          textCorpus.includes("clickhouse") ||
          textCorpus.includes("sql")
        ) {
          source = "Database";
          categories.push("Database", "GitHub");
          iconType = "database";
          iconColor = "#3B82F6";
        } else {
          source = "GitHub";
          categories.push("GitHub");
          iconType = "github";
          iconColor = "#FFFFFF";
        }

        // Popularity & Trending detection
        const popularity = pkg.score?.detail?.popularity || 0;
        const quality = pkg.score?.detail?.quality || 0;
        if (popularity > 0.12 || quality > 0.55) {
          categories.push("Trending");
        }

        // Date & Latest detection
        if (pkg.date) {
          const pkgTime = new Date(pkg.date).getTime();
          const SIX_MONTHS = 180 * 24 * 60 * 60 * 1000;
          if (Date.now() - pkgTime < SIX_MONTHS) {
            categories.push("Latest");
          }
        }

        const validRepoUrl = cleanRepositoryUrl(pkg.links?.repository) || `https://github.com/modelcontextprotocol/servers`;
        const rawReadmeUrl = validRepoUrl.includes("github.com")
          ? `${validRepoUrl.replace("github.com", "raw.githubusercontent.com")}/main/README.md`
          : undefined;

        let iconUrl: string | undefined = undefined;
        try {
          const match = validRepoUrl.match(/github\.com\/([^\/]+)/);
          if (match && match[1]) {
            iconUrl = `https://github.com/${match[1]}.png?size=64`;
          }
        } catch {}

        return {
          id: name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          name: formattedName,
          author: pkg.publisher?.username || pkg.scope || "community",
          source,
          categories,
          shortDescription: desc || `Model Context Protocol server for ${formattedName} automation and tooling.`,
          iconType,
          iconColor,
          iconUrl,
          repoUrl: validRepoUrl,
          rawReadmeUrl,
          config: {
            command: "npx",
            args: ["-y", name],
          },
        };
      });

    saveInfiniteCatalogItems(items);
    return { items, total: liveRegistryTotalCount };
  } catch {
    return { items: [], total: liveRegistryTotalCount };
  }
}
