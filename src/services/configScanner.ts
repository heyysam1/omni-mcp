import { AiClient, McpServerItem, AppSettings } from "../types";

declare global {
  interface Window {
    api?: {
      scanClients: () => Promise<AiClient[]>;
      getServers: () => Promise<McpServerItem[]>;
      deployServer: (arg1: any, arg2?: any, arg3?: string[]) => Promise<{ success: boolean; message?: string; error?: string }>;
      deleteServer: (serverName: string, targetClientIds?: string[]) => Promise<{ success: boolean; error?: string }>;
      updateServer: (serverName: string, newConfig: any, targetClientIds?: string[]) => Promise<{ success: boolean; error?: string }>;
      revealInExplorer: (serverName: string) => Promise<{ success: boolean; path?: string }>;
      getMemoryUsage: () => Promise<string>;
      onMemoryUpdate?: (callback: (mem: string) => void) => () => void;
      minimizeWindow: () => void;
      closeWindow: () => void;
      openExternal?: (url: string) => Promise<{ success: boolean }>;
      updateSettings: (settings: any) => void;
      getSettings?: () => Promise<AppSettings & { isFirstRun?: boolean; onboarded?: boolean }>;
      checkForUpdates?: () => Promise<{
        success: boolean;
        hasUpdate?: boolean;
        version?: string;
        downloaded?: boolean;
        downloadedVersion?: string;
        error?: string;
      }>;
      getUpdateStatus?: () => Promise<{
        downloaded: boolean;
        downloadedVersion?: string;
        currentVersion: string;
      }>;
      restartAndInstallUpdate?: () => Promise<{ success: boolean }>;
      onUpdateStatus?: (callback: (data: any) => void) => () => void;
      showOpenDialog?: (options?: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
      addCustomClient?: (client: { name: string; configPath: string }) => Promise<{ success: boolean; client?: AiClient; error?: string }>;
      removeCustomClient?: (clientId: string) => Promise<{ success: boolean; error?: string }>;
      startServer?: (serverId: string, config?: any) => Promise<{ success: boolean; pid?: number; error?: string }>;
      terminateServer?: (serverId: string) => Promise<{ success: boolean; error?: string }>;
      getServerStatus?: (serverId: string) => Promise<{ status: string; pid?: number }>;
      onServerLog?: (callback: (data: { serverId: string; log: string }) => void) => () => void;
      onServerStatusChange?: (
        callback: (data: {
          serverId: string;
          status: "live" | "activating" | "inactive" | "crashed" | "error";
          error?: string;
        }) => void
      ) => () => void;
    };
  }
}

// Default servers matching official design (kept for reference/testing)
export const DEFAULT_SERVERS: McpServerItem[] = [
  {
    id: "web-draw-mcp",
    name: "web-draw-mcp",
    transport: "stdio",
    port: 9223,
    status: "live",
    syncedClients: ["Antigravity", "Claude Desktop"],
    configSnippet: "npx -y @olib-ai/web-draw-mcp",
    rawConfig: {
      command: "npx",
      args: ["-y", "@olib-ai/web-draw-mcp"],
    },
    logs: [
      "[00:00:01] Initializing web-draw-mcp on stdio",
      "[00:00:02] Connected to Antigravity IDE and Claude Desktop",
      "[00:00:02] Stdio transport live",
    ],
  },
  {
    id: "novamira-ecommerce",
    name: "novamira-ecommerce",
    transport: "http",
    port: 8080,
    status: "active",
    syncedClients: ["Cursor", "Claude Desktop"],
    configSnippet: "http://localhost:8080/mcp",
    rawConfig: {
      url: "http://localhost:8080/mcp",
    },
    logs: [
      "[00:00:01] Listening on http://localhost:8080/mcp",
      "[00:00:02] SSE channel established with Claude Desktop",
    ],
  },
];

export async function fetchInstalledServers(): Promise<McpServerItem[]> {
  if (window.api?.getServers) {
    try {
      const servers = await window.api.getServers();
      if (Array.isArray(servers)) {
        return servers;
      }
    } catch (e) {
      console.warn("Failed to fetch installed servers via IPC", e);
    }
  }
  return [];
}

export async function fetchDetectedClients(): Promise<AiClient[]> {
  if (window.api?.scanClients) {
    try {
      return await window.api.scanClients();
    } catch (e) {
      console.warn("IPC scanClients failed, falling back to local detection", e);
    }
  }

  return [];
}

export async function registerCustomClient(name: string, configPath: string): Promise<{ success: boolean; client?: AiClient; error?: string }> {
  if (window.api?.addCustomClient) {
    try {
      return await window.api.addCustomClient({ name, configPath });
    } catch (e: any) {
      console.warn("Failed to add custom client via IPC", e);
      return { success: false, error: e?.message || "IPC error" };
    }
  }
  return { success: false, error: "Desktop bridge unavailable in web browser" };
}

export async function unregisterCustomClient(clientId: string): Promise<{ success: boolean; error?: string }> {
  if (window.api?.removeCustomClient) {
    try {
      return await window.api.removeCustomClient(clientId);
    } catch (e: any) {
      console.warn("Failed to remove custom client via IPC", e);
      return { success: false, error: e?.message || "IPC error" };
    }
  }
  return { success: false, error: "Desktop bridge unavailable in web browser" };
}
