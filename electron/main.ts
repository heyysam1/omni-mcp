import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog, session } from "electron";
import { autoUpdater } from "electron-updater";
import path from "path";
import fs from "fs";
import os from "os";
import child_process from "child_process";

app.setName("Omni MCP");
process.title = "Omni MCP";

// Low RAM & Windows Efficiency Mode (EcoQoS) flags
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=64 --expose-gc");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion,SpareRendererForSitePerProcess");
app.commandLine.appendSwitch("enable-features", "UseEcoQoSForBackgroundProcess");
app.commandLine.appendSwitch("renderer-process-limit", "1");
app.commandLine.appendSwitch("disable-software-rasterizer");

// Set low process priority so Windows schedules it with minimal CPU burden
try {
  os.setPriority(process.pid, os.constants.priority.PRIORITY_LOW);
} catch {}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let minimizeToTray = true;
let currentAppSettings: {
  autoRestartOnCrash: boolean;
  minimizeToTray: boolean;
  pollInterval: "15s" | "30s" | "60s";
  onboarded?: boolean;
  vault?: Record<string, string>;
  vaultStatus?: Record<string, boolean>;
} = {
  autoRestartOnCrash: true,
  minimizeToTray: true,
  pollInterval: "15s",
};

let isFirstRun = false;

const USER_HOME = os.homedir();
const APPDATA = process.env.APPDATA || path.join(USER_HOME, "AppData", "Roaming");
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(USER_HOME, "AppData", "Local");
const SETTINGS_FILE = path.join(app.getPath("userData"), "omni_settings.json");

function loadSettingsFromDisk() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (typeof data.minimizeToTray === "boolean") {
        minimizeToTray = data.minimizeToTray;
      }
      currentAppSettings = {
        ...currentAppSettings,
        ...data,
      };
      isFirstRun = false;
    } else {
      isFirstRun = true;
    }
  } catch {
    isFirstRun = true;
  }
}

function saveSettingsToDisk(settings: any) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch {}
}

loadSettingsFromDisk();

// Security: Prevent Prototype Pollution on IPC configuration operations
const FORBIDDEN_CONFIG_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function isSafeKey(key: any): boolean {
  return typeof key === "string" && key.trim().length > 0 && !FORBIDDEN_CONFIG_KEYS.has(key.trim());
}

interface ClientConfigDef {
  id: string;
  name: string;
  possiblePaths: string[];
  isCustom?: boolean;
  description?: string;
}

const CUSTOM_CLIENTS_FILE = path.join(app.getPath("userData"), "omni_custom_clients.json");

const CANDIDATE_CLIENTS: ClientConfigDef[] = [
  {
    id: "antigravity",
    name: "Antigravity IDE",
    description: "Google Antigravity IDE & Agentic Coding Engine",
    possiblePaths: [
      path.join(USER_HOME, ".gemini", "antigravity-ide", "mcp_config.json"),
      path.join(USER_HOME, ".gemini", "config", "mcp_config.json"),
    ],
  },
  {
    id: "claude",
    name: "Claude Desktop",
    description: "Anthropic Claude Desktop Client",
    possiblePaths: [
      path.join(LOCALAPPDATA, "Claude-3p", "claude_desktop_config.json"),
      path.join(
        LOCALAPPDATA,
        "Packages",
        "Claude_pzs8sxrjxfjjc",
        "LocalCache",
        "Roaming",
        "Claude",
        "claude_desktop_config.json"
      ),
      path.join(APPDATA, "Claude", "claude_desktop_config.json"),
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "Cursor AI Code Editor",
    possiblePaths: [
      path.join(USER_HOME, ".cursor", "mcp.json"),
      path.join(APPDATA, "Cursor", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
    ],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description: "Codeium Windsurf AI IDE",
    possiblePaths: [
      path.join(USER_HOME, ".codeium", "windsurf", "mcp_config.json"),
    ],
  },
  {
    id: "cline",
    name: "VS Code (Cline)",
    description: "Cline AI Autonomous Agent for VS Code",
    possiblePaths: [
      path.join(APPDATA, "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
      path.join(APPDATA, "Code - Insiders", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
      path.join(APPDATA, "VSCodium", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
    ],
  },
  {
    id: "roo-cline",
    name: "VS Code (Roo Code)",
    description: "Roo Code AI Agent for VS Code",
    possiblePaths: [
      path.join(APPDATA, "Code", "User", "globalStorage", "rooveterinaryinc.roo-cline", "settings", "cline_mcp_settings.json"),
      path.join(APPDATA, "Code - Insiders", "User", "globalStorage", "rooveterinaryinc.roo-cline", "settings", "cline_mcp_settings.json"),
      path.join(APPDATA, "VSCodium", "User", "globalStorage", "rooveterinaryinc.roo-cline", "settings", "cline_mcp_settings.json"),
    ],
  },
  {
    id: "continue",
    name: "Continue",
    description: "Continue Open-Source AI Assistant",
    possiblePaths: [
      path.join(USER_HOME, ".continue", "config.json"),
    ],
  },
  {
    id: "vscode-mcp",
    name: "VS Code (MCP)",
    description: "Visual Studio Code Native / Copilot MCP Configuration",
    possiblePaths: [
      path.join(APPDATA, "Code", "User", "mcp.json"),
      path.join(USER_HOME, ".vscode", "mcp.json"),
    ],
  },
  {
    id: "zed",
    name: "Zed",
    description: "Zed High-Performance AI Code Editor",
    possiblePaths: [
      path.join(APPDATA, "Zed", "settings.json"),
      path.join(USER_HOME, ".config", "zed", "settings.json"),
      path.join(USER_HOME, ".zed", "settings.json"),
    ],
  },
  {
    id: "goose",
    name: "Goose",
    description: "Block Goose AI Agent & CLI",
    possiblePaths: [
      path.join(LOCALAPPDATA, "Block", "Goose", "config", "config.yaml"),
      path.join(USER_HOME, ".config", "goose", "config.yaml"),
      path.join(USER_HOME, ".goose", "config.yaml"),
      path.join(USER_HOME, ".goose", "mcp.json"),
      path.join(USER_HOME, ".config", "goose", "config.json"),
    ],
  },
  {
    id: "librechat",
    name: "LibreChat",
    description: "LibreChat Multi-Model AI Gateway",
    possiblePaths: [
      path.join(APPDATA, "librechat", "librechat.yaml"),
      path.join(USER_HOME, ".librechat", "librechat.yaml"),
      path.join(USER_HOME, ".librechat", "mcp.json"),
    ],
  },
  {
    id: "trae",
    name: "Trae",
    description: "ByteDance Trae AI IDE",
    possiblePaths: [
      path.join(APPDATA, "Trae", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
      path.join(USER_HOME, ".trae", "mcp.json"),
    ],
  },
  {
    id: "kiro",
    name: "Kiro",
    description: "Kiro AI Development Assistant",
    possiblePaths: [
      path.join(USER_HOME, ".kiro", "mcp.json"),
    ],
  },
];

function loadCustomClients(): ClientConfigDef[] {
  try {
    if (fs.existsSync(CUSTOM_CLIENTS_FILE)) {
      const raw = fs.readFileSync(CUSTOM_CLIENTS_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list
          .filter(
            (c) =>
              c &&
              typeof c.id === "string" &&
              typeof c.name === "string" &&
              typeof c.configPath === "string"
          )
          .map((c) => ({
            id: c.id,
            name: c.name,
            possiblePaths: [c.configPath],
            isCustom: true,
            description: c.description || "Custom User-Added MCP Client",
          }));
      }
    }
  } catch (err) {
    console.warn("Could not load custom clients from disk", err);
  }
  return [];
}

function saveCustomClients(clients: { id: string; name: string; configPath: string; description?: string }[]) {
  try {
    fs.mkdirSync(path.dirname(CUSTOM_CLIENTS_FILE), { recursive: true });
    fs.writeFileSync(CUSTOM_CLIENTS_FILE, JSON.stringify(clients, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save custom clients to disk", err);
  }
}

// Bounded heuristic scanner for MCP config files in standard app locations
function discoverHeuristicClients(): ClientConfigDef[] {
  const discovered: ClientConfigDef[] = [];
  const visitedPaths = new Set<string>();

  // Mark all candidate and custom client paths as already visited
  for (const client of CANDIDATE_CLIENTS) {
    for (const p of client.possiblePaths) {
      visitedPaths.add(path.resolve(p).toLowerCase());
    }
  }
  const custom = loadCustomClients();
  for (const client of custom) {
    for (const p of client.possiblePaths) {
      visitedPaths.add(path.resolve(p).toLowerCase());
    }
  }

  // 1. VS Code / Cursor / VSCodium / Insiders extension storage search
  const extensionStorageRoots = [
    path.join(APPDATA, "Code", "User", "globalStorage"),
    path.join(APPDATA, "Code - Insiders", "User", "globalStorage"),
    path.join(APPDATA, "Cursor", "User", "globalStorage"),
    path.join(APPDATA, "VSCodium", "User", "globalStorage"),
    path.join(APPDATA, "Trae", "User", "globalStorage"),
  ];

  for (const root of extensionStorageRoots) {
    if (!fs.existsSync(root)) continue;
    try {
      const extFolders = fs.readdirSync(root);
      for (const folder of extFolders) {
        const settingsDir = path.join(root, folder, "settings");
        if (fs.existsSync(settingsDir)) {
          try {
            const files = fs.readdirSync(settingsDir);
            for (const file of files) {
              if (file.toLowerCase().endsWith(".json") && file.toLowerCase().includes("mcp")) {
                const fullPath = path.join(settingsDir, file);
                const norm = path.resolve(fullPath).toLowerCase();
                if (visitedPaths.has(norm)) continue;
                visitedPaths.add(norm);

                try {
                  const stat = fs.statSync(fullPath);
                  if (stat.size > 0 && stat.size < 2 * 1024 * 1024) {
                    const raw = fs.readFileSync(fullPath, "utf-8");
                    const json = JSON.parse(raw);
                    if (
                      json &&
                      typeof json === "object" &&
                      (json.mcpServers || json.servers || Object.keys(json).length > 0)
                    ) {
                      let inferredName = "VS Code Extension";
                      if (folder.includes("claude-dev")) inferredName = "VS Code (Cline)";
                      else if (folder.includes("roo-cline")) inferredName = "VS Code (Roo Code)";
                      else {
                        const parts = folder.split(".");
                        const extName = parts[parts.length - 1] || folder;
                        inferredName = extName
                          .replace(/[-_]/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                      }

                      discovered.push({
                        id: `ext-${folder.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
                        name: inferredName,
                        possiblePaths: [fullPath],
                        description: `Auto-Discovered MCP Config (${inferredName})`,
                      });
                    }
                  }
                } catch {}
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  // 2. Scan immediate dot-folders in USER_HOME for mcp.json or mcp_config.json
  try {
    const homeEntries = fs.readdirSync(USER_HOME);
    for (const entry of homeEntries) {
      if (entry.startsWith(".") && entry.length > 2) {
        const dir = path.join(USER_HOME, entry);
        try {
          const stat = fs.statSync(dir);
          if (stat.isDirectory()) {
            const candidates = [
              path.join(dir, "mcp_config.json"),
              path.join(dir, "mcp.json"),
              path.join(dir, "config.json"),
            ];
            for (const cand of candidates) {
              const norm = path.resolve(cand).toLowerCase();
              if (!visitedPaths.has(norm) && fs.existsSync(cand)) {
                visitedPaths.add(norm);
                try {
                  const fstat = fs.statSync(cand);
                  if (fstat.size > 0 && fstat.size < 2 * 1024 * 1024) {
                    const raw = fs.readFileSync(cand, "utf-8");
                    const json = JSON.parse(raw);
                    // Strictly check for mcpServers or servers
                    if (json && typeof json === "object" && (json.mcpServers || json.servers)) {
                      const cleanFolderName = entry.replace(/^\./, "");
                      const appName = cleanFolderName
                        .replace(/[-_]/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase());
                      discovered.push({
                        id: `heur-${cleanFolderName.toLowerCase()}`,
                        name: appName,
                        possiblePaths: [cand],
                        description: `Auto-Discovered MCP Config (${appName})`,
                      });
                    }
                  }
                } catch {}
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  return discovered;
}

// Master Aggregator for all candidate clients
function getAllCandidateClients(): ClientConfigDef[] {
  const custom = loadCustomClients();
  const heuristics = discoverHeuristicClients();

  const knownPaths = new Set<string>();
  const combined: ClientConfigDef[] = [];

  for (const client of CANDIDATE_CLIENTS) {
    combined.push(client);
    for (const p of client.possiblePaths) {
      knownPaths.add(path.resolve(p).toLowerCase());
    }
  }

  for (const client of custom) {
    const norm = path.resolve(client.possiblePaths[0]).toLowerCase();
    if (!knownPaths.has(norm)) {
      knownPaths.add(norm);
      combined.push(client);
    }
  }

  for (const client of heuristics) {
    const norm = path.resolve(client.possiblePaths[0]).toLowerCase();
    if (!knownPaths.has(norm)) {
      knownPaths.add(norm);
      combined.push(client);
    }
  }

  return combined;
}

function toggleWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function createTray() {
  if (tray) return;

  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked")
    : path.join(__dirname, "..");

  const trayIconPath = path.join(basePath, "public", "tray-icon.png");
  const fallbackIconPath = path.join(basePath, "public", "logo.png");
  let trayIcon: any = fallbackIconPath;
  if (fs.existsSync(trayIconPath)) {
    trayIcon = nativeImage.createFromPath(trayIconPath);
  } else if (fs.existsSync(fallbackIconPath)) {
    trayIcon = nativeImage.createFromPath(fallbackIconPath).resize({ width: 32, height: 32, quality: "best" });
  } else {
    const innerTray = path.join(__dirname, "../public/tray-icon.png");
    const innerLogo = path.join(__dirname, "../public/logo.png");
    if (fs.existsSync(innerTray)) trayIcon = nativeImage.createFromPath(innerTray);
    else if (fs.existsSync(innerLogo)) trayIcon = nativeImage.createFromPath(innerLogo).resize({ width: 32, height: 32, quality: "best" });
  }

  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Omni MCP",
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit Omni MCP",
      click: () => {
        isQuitting = true;
        if (tray) {
          try {
            tray.destroy();
          } catch {}
          tray = null;
        }
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Omni MCP");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    toggleWindow();
  });

  tray.on("double-click", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Omni MCP",
    width: 500,
    height: 700,
    minWidth: 500,
    minHeight: 700,
    maxWidth: 500,
    maxHeight: 700,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    backgroundColor: "#07080B",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
    icon: path.join(__dirname, "../public/logo.png"),
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Security: Prevent arbitrary code/image execution via Content-Security-Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !!process.env.VITE_DEV_SERVER_URL;
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          isDev
            ? "default-src 'self' data:; script-src 'self' 'unsafe-inline'; img-src 'self' https://raw.githubusercontent.com https://github.com https://*.githubusercontent.com data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' ws: http: https:;"
            : "default-src 'self'; script-src 'self'; img-src 'self' https://raw.githubusercontent.com https://github.com https://*.githubusercontent.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://registry.npmjs.org https://raw.githubusercontent.com;",
        ],
      },
    });
  });

  // Security: Prevent unauthorized external navigation inside application window
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const isDev = !!process.env.VITE_DEV_SERVER_URL;
    const isAllowed =
      navigationUrl.startsWith("file://") ||
      (isDev && navigationUrl.startsWith(process.env.VITE_DEV_SERVER_URL!));
    if (!isAllowed) {
      event.preventDefault();
      try {
        const parsed = new URL(navigationUrl);
        if (parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:") {
          shell.openExternal(navigationUrl);
        }
      } catch {}
    }
  });

  // Security: Open external links safely in OS default browser rather than spawning internal windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("mailto:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Intercept close event to honor minimizeToTray
  mainWindow.on("close", (event) => {
    if (minimizeToTray && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    } else {
      isQuitting = true;
      if (tray) {
        try {
          tray.destroy();
        } catch {}
        tray = null;
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Apply Windows 11 Efficiency Mode (EcoQoS) to Omni MCP and all sub-processes
  applyEfficiencyMode();
  mainWindow.webContents.once("did-finish-load", () => {
    applyEfficiencyMode();
  });
  mainWindow.on("blur", () => {
    applyEfficiencyMode();
  });
  mainWindow.on("minimize", () => {
    applyEfficiencyMode();
  });

  // Push real-time memory update every 1 second directly to renderer
  const memInterval = setInterval(async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        const memStr = await getRealtimeMemory();
        mainWindow.webContents.send("memory:update", memStr);
      } catch {}
    } else {
      clearInterval(memInterval);
    }
  }, 1000);
}

// Apply Windows 11 Efficiency Mode (EcoQoS + Idle Priority) so Task Manager displays the green leaf icon
function applyEfficiencyMode() {
  if (process.platform !== "win32") return;
  try {
    const pids = [process.pid];
    if (app && typeof app.getAppMetrics === "function") {
      const metrics = app.getAppMetrics();
      for (const m of metrics) {
        if (m.pid) pids.push(m.pid);
      }
    }
    const uniquePids = Array.from(new Set(pids));
    const candidatePaths = [
      path.join(__dirname, "../electron/set-efficiency.exe"),
      path.join(process.resourcesPath || "", "electron/set-efficiency.exe"),
      path.join(process.resourcesPath || "", "app.asar.unpacked/electron/set-efficiency.exe"),
    ];
    const helperExe = candidatePaths.find((p) => p && fs.existsSync(p));
    if (helperExe) {
      child_process.execFile(helperExe, [uniquePids.join(",")], () => {});
    }
  } catch {}
}

// Helper to get genuine physical Working Set RAM of this app
async function getRealtimeMemory(): Promise<string> {
  try {
    const mem = await process.getProcessMemoryInfo();
    const residentMb = Math.round(mem.residentSet / 1024);
    if (residentMb > 0) {
      return `${residentMb} MB`;
    }
  } catch {}
  const usage = process.memoryUsage();
  return `${Math.round(usage.rss / 1024 / 1024)} MB`;
}

// Extract genuine desktop icons directly from the user's installed PC app folders
async function getClientIcon(clientId: string, clientName?: string, configPath?: string): Promise<string | undefined> {
  const normId = clientId.toLowerCase();
  const normName = (clientName || "").toLowerCase();
  const normPath = (configPath || "").toLowerCase();

  // 1. Antigravity IDE (Directly read from its installed application directory)
  if (normId.includes("antigravity") || normName.includes("antigravity")) {
    const candidatePaths = [
      path.join(LOCALAPPDATA, "Programs", "Antigravity IDE", "resources", "app", "resources", "win32", "code_150x150.png"),
      path.join(LOCALAPPDATA, "Programs", "Antigravity", "resources", "app", "resources", "win32", "code_150x150.png"),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const buf = fs.readFileSync(p);
          return `data:image/png;base64,${buf.toString("base64")}`;
        } catch {}
      }
    }
    const exePaths = [
      path.join(LOCALAPPDATA, "Programs", "Antigravity IDE", "Antigravity IDE.exe"),
      path.join(LOCALAPPDATA, "Programs", "Antigravity", "Antigravity.exe"),
    ];
    for (const p of exePaths) {
      if (fs.existsSync(p)) {
        try {
          const img = await app.getFileIcon(p, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        } catch {}
      }
    }
  }

  // 2. Claude Desktop (Directly read from its installed application package directory)
  if (normId.includes("claude") || normName.includes("claude")) {
    try {
      const winApps = path.join("C:", "Program Files", "WindowsApps");
      if (fs.existsSync(winApps)) {
        const entries = fs.readdirSync(winApps);
        const claudeFolder = entries.find((e) => e.startsWith("Claude_") && e.includes("pzs8sxrjxfjjc"));
        if (claudeFolder) {
          const iconCandidates = [
            path.join(winApps, claudeFolder, "assets", "Square150x150Logo.png"),
            path.join(winApps, claudeFolder, "assets", "icon.png"),
            path.join(winApps, claudeFolder, "assets", "Square44x44Logo.png"),
          ];
          for (const iconP of iconCandidates) {
            if (fs.existsSync(iconP)) {
              const buf = fs.readFileSync(iconP);
              return `data:image/png;base64,${buf.toString("base64")}`;
            }
          }
        }
      }
    } catch {}

    const claudeExes = [
      path.join(LOCALAPPDATA, "Claude-3p", "claude-code", "2.1.260", "claude.exe"),
      path.join(LOCALAPPDATA, "Claude", "claude.exe"),
      path.join(LOCALAPPDATA, "Programs", "Claude", "Claude.exe"),
      path.join("C:", "Program Files", "Claude", "Claude.exe"),
    ];
    for (const p of claudeExes) {
      if (fs.existsSync(p)) {
        try {
          const img = await app.getFileIcon(p, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        } catch {}
      }
    }
  }

  // 3. Cursor (Directly read from installed executable on disk)
  if (normId.includes("cursor") || normName.includes("cursor")) {
    const cursorExes = [
      path.join(LOCALAPPDATA, "Programs", "cursor", "Cursor.exe"),
      path.join(LOCALAPPDATA, "Programs", "Cursor", "Cursor.exe"),
    ];
    for (const p of cursorExes) {
      if (fs.existsSync(p)) {
        try {
          const img = await app.getFileIcon(p, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        } catch {}
      }
    }
  }

  // 4. Windsurf (Directly read from installed executable on disk)
  if (normId.includes("windsurf") || normName.includes("windsurf")) {
    const windsurfExes = [
      path.join(LOCALAPPDATA, "Programs", "Windsurf", "Windsurf.exe"),
    ];
    for (const p of windsurfExes) {
      if (fs.existsSync(p)) {
        try {
          const img = await app.getFileIcon(p, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        } catch {}
      }
    }
  }

  // 5. VS Code & Extensions (Cline, Roo Code, Continue, Copilot)
  if (
    normId.includes("vscode") ||
    normId.includes("code") ||
    normId.includes("cline") ||
    normId.includes("roo") ||
    normId.includes("continue") ||
    normName.includes("vs code") ||
    normPath.includes("code")
  ) {
    const vsCodeExes = [
      path.join(LOCALAPPDATA, "Programs", "Microsoft VS Code", "Code.exe"),
      path.join("C:", "Program Files", "Microsoft VS Code", "Code.exe"),
      path.join(LOCALAPPDATA, "Programs", "Microsoft VS Code Insiders", "Code - Insiders.exe"),
      path.join("C:", "Program Files", "Microsoft VS Code Insiders", "Code - Insiders.exe"),
      path.join(LOCALAPPDATA, "Programs", "VSCodium", "VSCodium.exe"),
    ];
    for (const p of vsCodeExes) {
      if (fs.existsSync(p)) {
        try {
          const img = await app.getFileIcon(p, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        } catch {}
      }
    }
  }

  // 6. Zed Editor
  if (normId.includes("zed") || normName.includes("zed")) {
    const zedExes = [
      path.join(LOCALAPPDATA, "Programs", "Zed", "Zed.exe"),
      path.join(LOCALAPPDATA, "Zed", "Zed.exe"),
      path.join("C:", "Program Files", "Zed", "Zed.exe"),
    ];
    for (const p of zedExes) {
      if (fs.existsSync(p)) {
        try {
          const img = await app.getFileIcon(p, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        } catch {}
      }
    }
  }

  // 7. Goose AI
  if (normId.includes("goose") || normName.includes("goose")) {
    const gooseExes = [
      path.join(LOCALAPPDATA, "Block", "Goose", "goose.exe"),
      path.join(LOCALAPPDATA, "Programs", "Goose", "Goose.exe"),
    ];
    for (const p of gooseExes) {
      if (fs.existsSync(p)) {
        try {
          const img = await app.getFileIcon(p, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        } catch {}
      }
    }
  }

  // 8. Trae Editor
  if (normId.includes("trae") || normName.includes("trae")) {
    const traeExes = [
      path.join(LOCALAPPDATA, "Programs", "Trae", "Trae.exe"),
      path.join("C:", "Program Files", "Trae", "Trae.exe"),
    ];
    for (const p of traeExes) {
      if (fs.existsSync(p)) {
        try {
          const img = await app.getFileIcon(p, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        } catch {}
      }
    }
  }

  // 9. Generic search by Client Name or ID across standard installation roots
  const searchNames = [clientName, clientId].filter(Boolean) as string[];
  for (const sName of searchNames) {
    const clean = sName.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!clean) continue;
    const genericCandidates = [
      path.join(LOCALAPPDATA, "Programs", clean, `${clean}.exe`),
      path.join("C:", "Program Files", clean, `${clean}.exe`),
      path.join("C:", "Program Files (x86)", clean, `${clean}.exe`),
      path.join(LOCALAPPDATA, clean, `${clean}.exe`),
    ];
    for (const p of genericCandidates) {
      if (fs.existsSync(p)) {
        try {
          const img = await app.getFileIcon(p, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        } catch {}
      }
    }
  }

  // 10. If configPath is provided, check if an executable exists in the parent tree
  if (configPath && fs.existsSync(configPath)) {
    try {
      let dir = path.dirname(configPath);
      for (let depth = 0; depth < 3; depth++) {
        if (!dir || dir === path.dirname(dir)) break;
        const files = fs.readdirSync(dir);
        const exeFile = files.find((f) => f.toLowerCase().endsWith(".exe"));
        if (exeFile) {
          const targetExe = path.join(dir, exeFile);
          const img = await app.getFileIcon(targetExe, { size: "normal" });
          if (img && !img.isEmpty()) return img.toDataURL();
        }
        dir = path.dirname(dir);
      }
    } catch {}
  }

  return undefined;
}

// Real Process Supervisor & Auto-Restart Engine
interface SupervisedServer {
  serverId: string;
  process?: child_process.ChildProcess;
  pid?: number;
  status: "live" | "activating" | "inactive" | "crashed" | "error";
  config: any;
  crashCount: number;
  intentionalStop: boolean;
  restartTimer?: NodeJS.Timeout;
  logs?: string[];
}

const supervisedServers = new Map<string, SupervisedServer>();

function appendServerLog(serverId: string, line: string) {
  const sup = supervisedServers.get(serverId);
  if (sup) {
    if (!sup.logs) sup.logs = [];
    sup.logs.push(line);
    if (sup.logs.length > 200) sup.logs.shift();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("server:log", { serverId, chunk: line, log: line });
  }
}

function killProcessTree(pid: number) {
  if (process.platform === "win32") {
    try {
      child_process.exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          try { process.kill(pid, "SIGTERM"); } catch {}
        }
      });
    } catch {
      try { process.kill(pid, "SIGTERM"); } catch {}
    }
  } else {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try { process.kill(pid, "SIGTERM"); } catch {}
    }
  }
}

function startSupervisedServer(serverId: string, config?: any, isAutoRestart = false): { success: boolean; pid?: number; error?: string } {
  let sup = supervisedServers.get(serverId);
  if (!sup) {
    sup = {
      serverId,
      status: "inactive",
      config: config || {},
      crashCount: 0,
      intentionalStop: false,
      logs: [],
    };
    supervisedServers.set(serverId, sup);
  } else if (!sup.logs) {
    sup.logs = [];
  }

  if (config && Object.keys(config).length > 0) {
    sup.config = config;
  }

  // If already running, return existing process PID
  if (sup.process && !sup.process.killed && sup.pid) {
    return { success: true, pid: sup.pid };
  }

  if (sup.restartTimer) {
    clearTimeout(sup.restartTimer);
    sup.restartTimer = undefined;
  }

  sup.intentionalStop = false;
  if (!isAutoRestart) {
    sup.crashCount = 0;
  }

  // If config is missing command, try to discover it from on-disk client configs
  if (!sup.config || (!sup.config.command && !sup.config.url)) {
    try {
      const candidateClients = getAllCandidateClients();
      for (const client of candidateClients) {
        for (const p of client.possiblePaths) {
          if (fs.existsSync(p)) {
            try {
              const raw = fs.readFileSync(p, "utf-8");
              const json = JSON.parse(raw);
              const mcpMap = json.mcpServers || json.servers || {};
              if (mcpMap[serverId]) {
                sup.config = mcpMap[serverId];
                break;
              }
            } catch {}
          }
        }
        if (sup.config && (sup.config.command || sup.config.url)) break;
      }
    } catch {}
  }

  const serverConfig = sup.config || {};
  const command = serverConfig.command;

  // Remote HTTP / SSE server without local command
  if (!command) {
    sup.status = "live";
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("server:status-change", { serverId, status: "live" });
    }
    appendServerLog(
      serverId,
      `[${new Date().toLocaleTimeString()}] Remote endpoint active at ${serverConfig.url || "configured URL"}. Status: Live`
    );
    return { success: true };
  }

  const args = Array.isArray(serverConfig.args) ? serverConfig.args.map(String) : [];
  const env = {
    ...process.env,
    ...(serverConfig.env || {}),
  };

  try {
    sup.status = "activating";
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("server:status-change", { serverId, status: "activating" });
    }
    appendServerLog(
      serverId,
      `[${new Date().toLocaleTimeString()}] Spawning process: ${command} ${args.join(" ")}`
    );

    const child = child_process.spawn(command, args, {
      env,
      shell: process.platform === "win32",
      detached: false,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdin?.on("error", () => {});

    sup.process = child;
    sup.pid = child.pid;
    sup.status = "live";

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("server:status-change", { serverId, status: "live" });
      mainWindow.webContents.send("server:status", { serverId, status: "live" });
    }
    appendServerLog(
      serverId,
      `[${new Date().toLocaleTimeString()}] Process spawned successfully (PID: ${child.pid}). Status: Live`
    );

    // Reset crash count if the process remains healthy for 15 seconds
    const stabilityTimer = setTimeout(() => {
      const current = supervisedServers.get(serverId);
      if (current && current.process === child && current.status === "live") {
        current.crashCount = 0;
      }
    }, 15000);

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        appendServerLog(serverId, line);
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        appendServerLog(serverId, line);
      }
    });

    child.on("error", (err) => {
      clearTimeout(stabilityTimer);
      sup!.status = "error";
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("server:status-change", {
          serverId,
          status: "error",
          error: err.message,
        });
        mainWindow.webContents.send("server:status", {
          serverId,
          status: "error",
          error: err.message,
        });
      }
      appendServerLog(
        serverId,
        `[${new Date().toLocaleTimeString()}] [Spawn Error] ${err.message}`
      );
    });

    child.on("close", (code) => {
      clearTimeout(stabilityTimer);
      sup!.process = undefined;
      sup!.pid = undefined;

      if (sup!.intentionalStop) {
        sup!.status = "inactive";
        sup!.crashCount = 0;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("server:status-change", { serverId, status: "inactive" });
          mainWindow.webContents.send("server:status", { serverId, status: "inactive" });
        }
        appendServerLog(
          serverId,
          `[${new Date().toLocaleTimeString()}] Process terminated by user. Status: Stopped`
        );
        return;
      }

      if (code !== 0) {
        sup!.status = "crashed";
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("server:status-change", {
            serverId,
            status: "crashed",
            error: `Process crashed with code ${code}`,
          });
          mainWindow.webContents.send("server:status", {
            serverId,
            status: "crashed",
            error: `Process crashed with code ${code}`,
          });
        }
        appendServerLog(
          serverId,
          `[${new Date().toLocaleTimeString()}] [Crash] Process exited unexpectedly with code ${code}`
        );

        // Real auto-restart engine with exponential backoff
        const shouldAutoRestart = currentAppSettings.autoRestartOnCrash !== false;
        if (shouldAutoRestart && sup!.crashCount < 3) {
          sup!.crashCount++;
          const delayMs = Math.min(2000 * Math.pow(2, sup!.crashCount - 1), 10000);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("server:status-change", { serverId, status: "activating" });
            mainWindow.webContents.send("server:status", { serverId, status: "activating" });
          }
          appendServerLog(
            serverId,
            `[${new Date().toLocaleTimeString()}] [Auto-Restart] Reviving server in ${delayMs / 1000}s (attempt ${sup!.crashCount}/3)...`
          );
          sup!.restartTimer = setTimeout(() => {
            startSupervisedServer(serverId, sup!.config, true);
          }, delayMs);
        } else if (sup!.crashCount >= 3) {
          appendServerLog(
            serverId,
            `[${new Date().toLocaleTimeString()}] [Auto-Restart] Max retry attempts (3) reached. Halting auto-restart.`
          );
        }
      } else {
        sup!.status = "inactive";
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("server:status-change", { serverId, status: "inactive" });
          mainWindow.webContents.send("server:status", { serverId, status: "inactive" });
        }
        appendServerLog(
          serverId,
          `[${new Date().toLocaleTimeString()}] Process exited cleanly with code 0. Status: Stopped`
        );
      }
    });

    return { success: true, pid: child.pid };
  } catch (spawnErr: any) {
    sup.status = "error";
    return { success: false, error: spawnErr.message };
  }
}

function terminateSupervisedServer(serverId: string): { success: boolean; error?: string } {
  const sup = supervisedServers.get(serverId);
  if (!sup) {
    return { success: true };
  }

  sup.intentionalStop = true;
  sup.crashCount = 0;
  if (sup.restartTimer) {
    clearTimeout(sup.restartTimer);
    sup.restartTimer = undefined;
  }

  if (sup.pid) {
    killProcessTree(sup.pid);
  } else if (sup.process) {
    try { sup.process.kill("SIGTERM"); } catch {}
  }

  sup.process = undefined;
  sup.pid = undefined;
  sup.status = "inactive";

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("server:status-change", { serverId, status: "inactive" });
    mainWindow.webContents.send("server:status", { serverId, status: "inactive" });
  }
  appendServerLog(
    serverId,
    `[${new Date().toLocaleTimeString()}] Terminate signal sent. Status: Stopped`
  );

  return { success: true };
}

// IPC Handlers
ipcMain.on("app:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("app:close", () => {
  if (minimizeToTray && !isQuitting) {
    mainWindow?.hide();
  } else {
    isQuitting = true;
    for (const [sId] of supervisedServers) {
      terminateSupervisedServer(sId);
    }
    if (tray) {
      try {
        tray.destroy();
      } catch {}
      tray = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    } else {
      app.quit();
    }
  }
});

ipcMain.handle("settings:get", async () => {
  return {
    ...currentAppSettings,
    isFirstRun,
    onboarded: currentAppSettings.onboarded ?? (!isFirstRun),
  };
});

ipcMain.on("settings:update", (_, newSettings) => {
  if (newSettings && typeof newSettings === "object") {
    currentAppSettings = { ...currentAppSettings, ...newSettings };
    if (typeof newSettings.minimizeToTray === "boolean") {
      minimizeToTray = newSettings.minimizeToTray;
    }
    if (newSettings.onboarded !== undefined) {
      isFirstRun = false;
    }
    saveSettingsToDisk(currentAppSettings);
  }
});

ipcMain.handle("server:start", async (_, serverId: string, config?: any) => {
  return startSupervisedServer(serverId, config);
});

ipcMain.handle("server:terminate", async (_, serverId: string) => {
  return terminateSupervisedServer(serverId);
});

ipcMain.handle("server:get-status", async (_, serverId: string) => {
  const sup = supervisedServers.get(serverId);
  return { status: sup?.status || "inactive", pid: sup?.pid };
});

ipcMain.handle("app:get-memory", async () => {
  return await getRealtimeMemory();
});

ipcMain.handle("app:open-external", async (_, url: string) => {
  if (url && (url.startsWith("https://") || url.startsWith("http://"))) {
    await shell.openExternal(url);
    return { success: true };
  }
  return { success: false };
});

// Periodic efficiency enforcement and garbage collection to maintain ultra-low RAM usage
setInterval(() => {
  applyEfficiencyMode();
  if (typeof (global as any).gc === "function") {
    try {
      (global as any).gc();
    } catch {}
  }
}, 15000);

// Dynamic AI Client Scanner across multiple real Windows paths
ipcMain.handle("config:scan-clients", async () => {
  const detected = [];
  const candidateClients = getAllCandidateClients();

  for (const client of candidateClients) {
    const existingPath = client.possiblePaths.find((p) => fs.existsSync(p));
    if (existingPath) {
      let servers: string[] = [];
      try {
        const raw = fs.readFileSync(existingPath, "utf-8");
        const json = JSON.parse(raw);
        const mcpMap = (json && typeof json === "object" && !Array.isArray(json))
          ? ((json.mcpServers && typeof json.mcpServers === "object" && !Array.isArray(json.mcpServers))
              ? json.mcpServers
              : ((json.servers && typeof json.servers === "object" && !Array.isArray(json.servers)) ? json.servers : {}))
          : {};
        if (mcpMap && typeof mcpMap === "object") {
          servers = Object.keys(mcpMap);
        }
      } catch (e) {
        // parse error ignored
      }

      const iconUrl = await getClientIcon(client.id, client.name, existingPath);

      detected.push({
        id: client.id,
        name: client.name,
        configPath: existingPath,
        isDetected: true,
        isConfigured: servers.length > 0,
        servers,
        iconUrl,
        isCustom: client.isCustom,
        description: client.description,
      });
    }
  }

  return detected;
});

// Read real servers from all detected AI clients
ipcMain.handle("config:get-servers", async () => {
  const serverMap: Map<string, {
    id: string;
    name: string;
    transport: "stdio" | "http" | "sse";
    port?: number | string;
    status: "live" | "active" | "inactive" | "error" | "activating" | "crashed";
    syncedClients: string[];
    configSnippet?: string;
    rawConfig: any;
    logs: string[];
  }> = new Map();

  const candidateClients = getAllCandidateClients();

  for (const client of candidateClients) {
    const existingPaths = client.possiblePaths.filter((p) => fs.existsSync(p));
    for (const p of existingPaths) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        const json = JSON.parse(raw);
        const mcpMap = (json.mcpServers && typeof json.mcpServers === "object")
          ? json.mcpServers
          : ((json.servers && typeof json.servers === "object") ? json.servers : {});
        for (const [serverKey, serverVal] of Object.entries<any>(mcpMap)) {
          if (!serverVal || typeof serverVal !== "object") continue;
          const existing = serverMap.get(serverKey);
          const clientLabel = client.name;
          const isHttp = (serverVal.url || (Array.isArray(serverVal.args) && serverVal.args.some((a: string) => typeof a === "string" && a.includes("http"))));
          const transport = isHttp ? "http" : "stdio";
          let port: number | string | undefined = undefined;
          if (serverVal.port) {
            port = serverVal.port;
          } else if (serverVal.url) {
            try {
              const parsed = new URL(serverVal.url);
              if (parsed.port) {
                port = parseInt(parsed.port, 10);
              }
            } catch {}
          } else if (Array.isArray(serverVal.args)) {
            for (let i = 0; i < serverVal.args.length; i++) {
              const arg = String(serverVal.args[i]);
              if (arg === "--port" || arg === "-p") {
                const next = parseInt(serverVal.args[i + 1], 10);
                if (!isNaN(next)) port = next;
              } else if (arg.startsWith("--port=")) {
                const p = parseInt(arg.split("=")[1], 10);
                if (!isNaN(p)) port = p;
              }
            }
          }

          if (existing) {
            if (!existing.syncedClients.includes(clientLabel)) {
              existing.syncedClients.push(clientLabel);
            }
            if (!existing.port && port) {
              existing.port = port;
            }
          } else {
            let snippet = "";
            if (serverVal.command) {
              snippet = `${serverVal.command} ${(serverVal.args || []).join(" ")}`.trim();
            } else if (serverVal.url) {
              snippet = serverVal.url;
            }

            const sup = supervisedServers.get(serverKey);
            const isRemote = !serverVal.command && !!serverVal.url;
            const serverStatus = sup ? sup.status : (isRemote ? "live" : "inactive");

            const defaultLogs = [
              `[${serverKey}] Registered in ${clientLabel}`,
              `[${serverKey}] Transport: ${transport.toUpperCase()}`,
              `[${serverKey}] Status: ${serverStatus === "live" ? "Live" : (serverStatus === "crashed" ? "Crashed" : "Stopped")}`,
            ];

            serverMap.set(serverKey, {
              id: serverKey,
              name: serverKey,
              transport,
              port,
              status: serverStatus,
              syncedClients: [clientLabel],
              configSnippet: snippet,
              rawConfig: serverVal,
              logs: (sup && sup.logs && sup.logs.length > 0) ? [...sup.logs] : defaultLogs,
            });
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }

  return Array.from(serverMap.values());
});

// Delete a server key from target AI client configs
ipcMain.handle("config:delete-server", async (_, serverName: string, clientIds?: string[]) => {
  try {
    if (!isSafeKey(serverName)) {
      return { success: false, error: "Invalid server name" };
    }

    // Stop and clean up any running supervised process for this server
    terminateSupervisedServer(serverName);
    supervisedServers.delete(serverName);

    const candidateClients = getAllCandidateClients();
    const clientsToSearch = clientIds && clientIds.length > 0
      ? candidateClients.filter((c) => clientIds.includes(c.id))
      : candidateClients;

    const targetKeyLower = serverName.toLowerCase().trim();

    for (const client of clientsToSearch) {
      const existingPaths = client.possiblePaths.filter((p) => fs.existsSync(p));
      for (const p of existingPaths) {
        let raw = "";
        try {
          raw = fs.readFileSync(p, "utf-8");
        } catch (readErr: any) {
          return { success: false, error: `Failed to read config file at ${p}: ${readErr.message}` };
        }

        let json: any;
        try {
          json = JSON.parse(raw);
        } catch (parseErr: any) {
          return {
            success: false,
            error: `Config file at ${p} has invalid JSON and cannot be safely modified. Error: ${parseErr.message}`,
          };
        }

        if (json && typeof json === "object" && !Array.isArray(json)) {
          let modified = false;

          for (const mcpProp of ["mcpServers", "servers"]) {
            const map = json[mcpProp];
            if (map && typeof map === "object" && !Array.isArray(map)) {
              // 1. Direct exact match
              if (map[serverName] !== undefined) {
                delete map[serverName];
                modified = true;
              }

              // 2. Strict case-insensitive match (strictly exact string match case-insensitive, zero fuzzy/stripped deletion)
              for (const key of Object.keys(map)) {
                if (key.toLowerCase().trim() === targetKeyLower) {
                  delete map[key];
                  modified = true;
                }
              }
            }
          }

          if (modified) {
            fs.writeFileSync(p, JSON.stringify(json, null, 2), "utf-8");
          }
        }
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Update an existing server's configuration
ipcMain.handle("config:update-server", async (_, serverName: string, newConfig: any, clientIds?: string[]) => {
  try {
    if (!isSafeKey(serverName)) {
      return { success: false, error: "Invalid server name" };
    }

    const candidateClients = getAllCandidateClients();
    const targetKeyLower = serverName.toLowerCase().trim();

    let clientsToSearch: ClientConfigDef[];
    if (clientIds && clientIds.length > 0) {
      clientsToSearch = candidateClients.filter((c) => clientIds.includes(c.id));
    } else {
      // Only update clients whose files already contain this target server key
      clientsToSearch = candidateClients.filter((client) => {
        return client.possiblePaths.some((p) => {
          try {
            if (!fs.existsSync(p)) return false;
            const raw = fs.readFileSync(p, "utf-8");
            const json = JSON.parse(raw);
            const hasKeyInMap = (map: any) =>
              map &&
              typeof map === "object" &&
              !Array.isArray(map) &&
              Object.keys(map).some((k) => k === serverName || k.toLowerCase().trim() === targetKeyLower);
            return hasKeyInMap(json.mcpServers) || hasKeyInMap(json.servers);
          } catch { return false; }
        });
      });
    }

    for (const client of clientsToSearch) {
      const existingPaths = client.possiblePaths.filter((p) => fs.existsSync(p));
      for (const p of existingPaths) {
        let raw = "";
        try {
          raw = fs.readFileSync(p, "utf-8");
        } catch (readErr: any) {
          return { success: false, error: `Failed to read config file at ${p}: ${readErr.message}` };
        }

        let json: any;
        try {
          json = JSON.parse(raw);
        } catch (parseErr: any) {
          return {
            success: false,
            error: `Config file at ${p} has invalid JSON and cannot be safely modified. Error: ${parseErr.message}`,
          };
        }

        if (!json || typeof json !== "object" || Array.isArray(json)) continue;

        const hasKeyInMap = (map: any) =>
          map &&
          typeof map === "object" &&
          !Array.isArray(map) &&
          Object.keys(map).some((k) => k === serverName || k.toLowerCase().trim() === targetKeyLower);

        // If no specific clientIds requested, only write to files that already contain this server
        if (!clientIds || clientIds.length === 0) {
          const hasKey = hasKeyInMap(json.mcpServers) || hasKeyInMap(json.servers);
          if (!hasKey) {
            continue;
          }
        }

        // Determine destination map (preserve json.servers if client uses it, else default to json.mcpServers)
        let targetMap = json.mcpServers;
        if (!targetMap && json.servers) {
          targetMap = json.servers;
        }
        if (!targetMap) {
          json.mcpServers = {};
          targetMap = json.mcpServers;
        }

        let keyToUpdate = serverName;
        for (const k of Object.keys(targetMap)) {
          if (k === serverName || k.toLowerCase().trim() === targetKeyLower) {
            keyToUpdate = k;
            break;
          }
        }

        targetMap[keyToUpdate] = newConfig;
        fs.writeFileSync(p, JSON.stringify(json, null, 2), "utf-8");
      }
    }

    // Update supervised process config if registered
    const sup = supervisedServers.get(serverName);
    if (sup) {
      sup.config = newConfig;
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

function revealFileInExplorer(targetPath: string): boolean {
  try {
    const norm = path.normalize(targetPath);
    if (!fs.existsSync(norm)) return false;

    if (process.platform === "win32") {
      const isPackagePath =
        norm.toLowerCase().includes("\\packages\\") ||
        norm.toLowerCase().includes("/packages/");

      if (isPackagePath) {
        // AppData\Local\Packages (such as packaged Claude Desktop) fails with SHOpenFolderAndSelectItems
        try {
          const cp = child_process.spawn("explorer.exe", [`/select,${norm}`], {
            detached: true,
            stdio: "ignore",
          });
          cp.unref();
          return true;
        } catch {
          try {
            shell.openPath(path.dirname(norm));
            return true;
          } catch {
            return false;
          }
        }
      } else {
        // Standard Windows paths: Native Electron shell API (SHOpenFolderAndSelectItems)
        try {
          shell.showItemInFolder(norm);
          return true;
        } catch {
          try {
            const cp = child_process.spawn("explorer.exe", [`/select,${norm}`], {
              detached: true,
              stdio: "ignore",
            });
            cp.unref();
            return true;
          } catch {
            try {
              shell.openPath(path.dirname(norm));
              return true;
            } catch {
              return false;
            }
          }
        }
      }
    } else {
      // macOS / Linux: native Electron shell API
      try {
        shell.showItemInFolder(norm);
        return true;
      } catch {
        try {
          shell.openPath(path.dirname(norm));
          return true;
        } catch {
          return false;
        }
      }
    }
  } catch {
    return false;
  }
}

ipcMain.handle("config:reveal-in-explorer", async (_, target: string) => {
  try {
    if (!target || typeof target !== "string") {
      return { success: false, error: "Invalid target" };
    }

    const candidateClients = getAllCandidateClients();
    const allAllowedPaths = new Set(
      candidateClients.flatMap((c) => c.possiblePaths.map((p) => path.resolve(p)))
    );

    // 1. Direct path check - strictly validated against authorized candidate client paths
    const resolvedTarget = path.resolve(target);
    if (allAllowedPaths.has(resolvedTarget) && fs.existsSync(resolvedTarget)) {
      revealFileInExplorer(resolvedTarget);
      return { success: true, path: resolvedTarget };
    }

    // 2. Check if target is a client ID or client name
    if (target) {
      const matchedClient = candidateClients.find(
        (c) => c.id === target || c.name.toLowerCase() === target.toLowerCase()
      );
      if (matchedClient) {
        const found = matchedClient.possiblePaths.find((p) => fs.existsSync(p));
        if (found) {
          revealFileInExplorer(found);
          return { success: true, path: found };
        }
      }
    }

    // 3. Check if target is a server name inside client configs
    const targetKey = target.toLowerCase().trim();
    const sanitizedKey = targetKey.replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");

    for (const client of candidateClients) {
      for (const p of client.possiblePaths) {
        if (fs.existsSync(p)) {
          try {
            const raw = fs.readFileSync(p, "utf-8");
            const json = JSON.parse(raw);
            const mcpMap = (json.mcpServers && typeof json.mcpServers === "object")
              ? json.mcpServers
              : ((json.servers && typeof json.servers === "object") ? json.servers : undefined);
            if (mcpMap && typeof mcpMap === "object") {
              const hasMatch = Object.keys(mcpMap).some((k) => {
                const kLower = k.toLowerCase().trim();
                return (
                  k === target ||
                  kLower === targetKey ||
                  kLower === sanitizedKey ||
                  kLower.replace(/[^a-z0-9]/g, "") === targetKey.replace(/[^a-z0-9]/g, "")
                );
              });

              if (hasMatch) {
                revealFileInExplorer(p);
                return { success: true, path: p };
              }
            }
          } catch {}
        }
      }
    }

    // 4. Fallback: only if target is "default" or empty
    if (!target || target === "default") {
      for (const client of candidateClients) {
        const existing = client.possiblePaths.find((p) => fs.existsSync(p));
        if (existing) {
          revealFileInExplorer(existing);
          return { success: true, path: existing };
        }
      }
    }
    return { success: false, error: "Configuration location not found" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Deploy server to all existing matched paths for selected clients
ipcMain.handle("config:deploy-server", async (_, arg1: any, arg2: any, arg3?: any) => {
  try {
    let serverName = "";
    let config: any = {};
    let targetClientIds: string[] = [];

    if (typeof arg1 === "string") {
      serverName = arg1;
      config = arg2 || {};
      targetClientIds = Array.isArray(arg3) ? arg3 : [];
    } else {
      config = arg1 || {};
      targetClientIds = Array.isArray(arg2) ? arg2 : [];
      serverName = config.name || "";
    }

    let serversToDeploy: any = {};
    if (config.mcpServers && typeof config.mcpServers === "object") {
      serversToDeploy = config.mcpServers;
    } else if (config.servers && typeof config.servers === "object") {
      serversToDeploy = config.servers;
    } else if (config.command || config.url || config.args) {
      let realKey = serverName.trim();
      if (!realKey && config.name) {
        realKey = String(config.name).trim();
      }
      if (!realKey && Array.isArray(config.args)) {
        const pkgArg = config.args.find(
          (a: string) => typeof a === "string" && !a.startsWith("-") && a.length > 2
        );
        if (pkgArg) {
          realKey = pkgArg.replace(/^@[^/]+\//, "");
        }
      }
      if (!realKey) {
        realKey = "mcp-server";
      }

      const sanitizedKey = realKey
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/^-+|-+$/g, "") || "mcp-server";

      const { name: _discard, ...cleanConfig } = config;
      serversToDeploy = { [sanitizedKey]: cleanConfig };
    } else {
      serversToDeploy = config;
    }

    const candidateClients = getAllCandidateClients();
    for (const clientId of targetClientIds) {
      const client = candidateClients.find((c) => c.id === clientId);
      if (!client) continue;

      const targetPaths = client.possiblePaths.filter((p) => fs.existsSync(p));
      const pathsToWrite = targetPaths.length > 0 ? targetPaths : [client.possiblePaths[0]];

      for (const targetPath of pathsToWrite) {
        let existingJson: any = { mcpServers: {} };
        if (fs.existsSync(targetPath)) {
          try {
            const raw = fs.readFileSync(targetPath, "utf-8");
            existingJson = JSON.parse(raw);
            if (!existingJson.mcpServers) {
              existingJson.mcpServers = {};
            }
          } catch (parseErr: any) {
            // DO NOT silently overwrite corrupted config files
            return {
              success: false,
              message: `Config file at ${targetPath} has invalid JSON and cannot be safely modified. Please fix it manually. Error: ${parseErr.message}`,
            };
          }
        } else {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        }

        // Merge new servers safely preventing prototype pollution
        for (const [sKey, sVal] of Object.entries(serversToDeploy)) {
          if (isSafeKey(sKey) && sVal && typeof sVal === "object") {
            if (existingJson.mcpServers[sKey] !== undefined) {
              const existingStr = JSON.stringify(existingJson.mcpServers[sKey]);
              const newStr = JSON.stringify(sVal);
              if (existingStr !== newStr) {
                return {
                  success: false,
                  message: `A server named "${sKey}" already exists in ${client.name}. Please use Config to edit it or choose a distinct name.`,
                };
              }
            }
            existingJson.mcpServers[sKey] = sVal;
          }
        }

        fs.writeFileSync(targetPath, JSON.stringify(existingJson, null, 2), "utf-8");
      }
    }

    return { success: true, message: "Deployed successfully" };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

// File dialog to pick any MCP configuration file
ipcMain.handle("dialog:show-open-dialog", async (_, options) => {
  const dialogOptions = {
    title: "Select MCP Configuration File",
    properties: ["openFile"] as ("openFile")[],
    filters: [
      { name: "JSON Files", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] },
    ],
    ...options,
  };
  return await dialog.showOpenDialog(mainWindow!, dialogOptions);
});

// Add and persist a custom AI client
ipcMain.handle("config:add-custom-client", async (_, { name, configPath }: { name: string; configPath: string }) => {
  try {
    if (!name || typeof name !== "string" || !name.trim()) {
      return { success: false, error: "Client name is required" };
    }
    if (!configPath || typeof configPath !== "string" || !configPath.trim()) {
      return { success: false, error: "Configuration path is required" };
    }

    const normPath = path.resolve(configPath.trim());
    if (!fs.existsSync(normPath)) {
      return { success: false, error: "Specified file does not exist on disk" };
    }

    // Validate JSON format
    let raw = "";
    try {
      raw = fs.readFileSync(normPath, "utf-8");
    } catch (e: any) {
      return { success: false, error: `Failed to read file: ${e.message}` };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e: any) {
      return { success: false, error: `Invalid JSON syntax: ${e.message}` };
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { success: false, error: "Config file must contain a JSON object" };
    }

    // Ensure mcpServers exists so it is ready for deployments
    if (!parsed.mcpServers && !parsed.servers) {
      parsed.mcpServers = {};
      try {
        fs.writeFileSync(normPath, JSON.stringify(parsed, null, 2), "utf-8");
      } catch {}
    }

    const cleanName = name.trim();
    const customId = `custom-${Date.now()}-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    const currentCustom = loadCustomClients();
    const existing = currentCustom.find(
      (c) => path.resolve(c.possiblePaths[0]).toLowerCase() === normPath.toLowerCase()
    );
    if (existing) {
      return { success: false, error: `Client "${existing.name}" is already registered with this config file` };
    }

    const updated = [
      ...currentCustom.map((c) => ({
        id: c.id,
        name: c.name,
        configPath: c.possiblePaths[0],
        description: c.description,
      })),
      {
        id: customId,
        name: cleanName,
        configPath: normPath,
        description: "Custom User-Added MCP Client",
      },
    ];

    saveCustomClients(updated);

    const iconUrl = await getClientIcon(customId, cleanName, normPath);
    const mcpMap = parsed.mcpServers || parsed.servers || {};
    const servers = Object.keys(mcpMap);

    return {
      success: true,
      client: {
        id: customId,
        name: cleanName,
        configPath: normPath,
        isDetected: true,
        isConfigured: servers.length > 0,
        servers,
        iconUrl,
        isCustom: true,
        description: "Custom User-Added MCP Client",
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register custom client" };
  }
});

// Remove a custom AI client
ipcMain.handle("config:remove-custom-client", async (_, clientId: string) => {
  try {
    if (!clientId) return { success: false, error: "Client ID required" };
    const current = loadCustomClients();
    const filtered = current
      .filter((c) => c.id !== clientId)
      .map((c) => ({
        id: c.id,
        name: c.name,
        configPath: c.possiblePaths[0],
        description: c.description,
      }));
    saveCustomClients(filtered);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to remove custom client" };
  }
});

// Auto Updater Implementation (GitHub Releases)
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

let updateDownloadedInfo: { version: string; releaseDate?: string } | null = null;

function setupAutoUpdater() {
  autoUpdater.on("checking-for-update", () => {
    mainWindow?.webContents.send("update:status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    mainWindow?.webContents.send("update:status", {
      status: "available",
      version: info.version,
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    mainWindow?.webContents.send("update:status", {
      status: "not-available",
      version: info.version,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow?.webContents.send("update:status", {
      status: "downloading",
      percent: Math.floor(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateDownloadedInfo = {
      version: info.version,
      releaseDate: info.releaseDate,
    };
    mainWindow?.webContents.send("update:status", {
      status: "downloaded",
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on("error", (err) => {
    mainWindow?.webContents.send("update:status", {
      status: "error",
      error: err?.message || String(err),
    });
  });

  // Initial background update check 5 seconds after startup
  setTimeout(() => {
    try {
      autoUpdater.checkForUpdates().catch(() => {});
    } catch {}
  }, 5000);

  // Periodic check every 60 minutes
  setInterval(() => {
    try {
      autoUpdater.checkForUpdates().catch(() => {});
    } catch {}
  }, 60 * 60 * 1000);
}

ipcMain.handle("update:check", async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      hasUpdate: !!result?.updateInfo,
      version: result?.updateInfo?.version,
      downloaded: !!updateDownloadedInfo,
      downloadedVersion: updateDownloadedInfo?.version,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Check update error",
      downloaded: !!updateDownloadedInfo,
      downloadedVersion: updateDownloadedInfo?.version,
    };
  }
});

ipcMain.handle("update:get-status", async () => {
  return {
    downloaded: !!updateDownloadedInfo,
    downloadedVersion: updateDownloadedInfo?.version,
    currentVersion: app.getVersion(),
  };
});

ipcMain.handle("update:restart-and-install", () => {
  isQuitting = true;
  if (tray) {
    try {
      tray.destroy();
    } catch {}
    tray = null;
  }
  autoUpdater.quitAndInstall(false, true);
  return { success: true };
});

app.whenReady().then(() => {
  createTray();
  createWindow();
  setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  for (const [sId] of supervisedServers) {
    terminateSupervisedServer(sId);
  }
  if (tray) {
    try {
      tray.destroy();
    } catch {}
    tray = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (!minimizeToTray || isQuitting) {
      if (tray) {
        try {
          tray.destroy();
        } catch {}
        tray = null;
      }
      app.quit();
    }
  }
});
