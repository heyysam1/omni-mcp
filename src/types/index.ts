export type TransportType = "stdio" | "sse" | "http";
export type ServerStatus = "live" | "activating" | "active" | "inactive" | "error" | "crashed";

export interface McpServerItem {
  id: string;
  name: string;
  transport: TransportType;
  port?: number | string;
  toolsCount?: number;
  status: ServerStatus;
  syncedClients: string[];
  configSnippet?: string;
  rawConfig?: any;
  logs: string[];
  pid?: number;
  iconType?: string;
  iconColor?: string;
  iconUrl?: string;
}

export interface AiClient {
  id: string;
  name: string;
  configPath: string;
  isDetected: boolean;
  isConfigured: boolean;
  servers: string[];
  iconUrl?: string;
  isCustom?: boolean;
  description?: string;
}

export interface AppSettings {
  autoRestartOnCrash: boolean;
  minimizeToTray: boolean;
  pollInterval: "15s" | "30s" | "60s";
  vault: {
    BRAVE_API_KEY?: string;
    POSTGRES_PASSWORD?: string;
    GITHUB_TOKEN?: string;
    [key: string]: string | undefined;
  };
  vaultStatus?: {
    BRAVE_API_KEY?: boolean;
    POSTGRES_PASSWORD?: boolean;
    GITHUB_TOKEN?: boolean;
    [key: string]: boolean | undefined;
  };
}

export type CatalogSource =
  | "GitHub"
  | "Hugging Face"
  | "TiniX"
  | "Database"
  | "NPM"
  | "Official";

export type CatalogFilter =
  | "All"
  | "Trending"
  | "Latest"
  | "GitHub"
  | "Hugging Face"
  | "TiniX"
  | "Database"
  | "NPM";

export interface McpCatalogItem {
  id: string;
  name: string;
  author: string;
  source: CatalogSource;
  categories: string[];
  shortDescription: string;
  iconType?: string;
  iconColor?: string;
  iconUrl?: string;
  repoUrl: string;
  rawReadmeUrl?: string;
  fallbackMarkdown?: string;
  config: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
  };
}
