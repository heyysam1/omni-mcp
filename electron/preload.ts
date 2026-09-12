import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  scanClients: () => ipcRenderer.invoke("config:scan-clients"),
  getServers: () => ipcRenderer.invoke("config:get-servers"),
  deployServer: (arg1: any, arg2: any, arg3?: string[]) =>
    ipcRenderer.invoke("config:deploy-server", arg1, arg2, arg3),
  deleteServer: (serverName: string, targetClientIds?: string[]) =>
    ipcRenderer.invoke("config:delete-server", serverName, targetClientIds),
  updateServer: (serverName: string, newConfig: any, targetClientIds?: string[]) =>
    ipcRenderer.invoke("config:update-server", serverName, newConfig, targetClientIds),
  revealInExplorer: (serverName: string) =>
    ipcRenderer.invoke("config:reveal-in-explorer", serverName),
  getMemoryUsage: () => ipcRenderer.invoke("app:get-memory"),
  onMemoryUpdate: (callback: (mem: string) => void) => {
    const handler = (_: any, mem: string) => callback(mem);
    ipcRenderer.on("memory:update", handler);
    return () => ipcRenderer.removeListener("memory:update", handler);
  },
  minimizeWindow: () => ipcRenderer.send("app:minimize"),
  closeWindow: () => ipcRenderer.send("app:close"),
  openExternal: (url: string) => ipcRenderer.invoke("app:open-external", url),
  updateSettings: (settings: any) => ipcRenderer.send("settings:update", settings),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  getUpdateStatus: () => ipcRenderer.invoke("update:get-status"),
  restartAndInstallUpdate: () => ipcRenderer.invoke("update:restart-and-install"),
  onUpdateStatus: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on("update:status", handler);
    return () => ipcRenderer.removeListener("update:status", handler);
  },
  showOpenDialog: (options?: any) => ipcRenderer.invoke("dialog:show-open-dialog", options),
  addCustomClient: (client: { name: string; configPath: string }) =>
    ipcRenderer.invoke("config:add-custom-client", client),
  removeCustomClient: (clientId: string) =>
    ipcRenderer.invoke("config:remove-custom-client", clientId),
  startServer: (serverId: string, config?: any) =>
    ipcRenderer.invoke("server:start", serverId, config),
  terminateServer: (serverId: string) =>
    ipcRenderer.invoke("server:terminate", serverId),
  getServerStatus: (serverId: string) =>
    ipcRenderer.invoke("server:get-status", serverId),
  onServerLog: (callback: (data: { serverId: string; log: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on("server:log", handler);
    return () => ipcRenderer.removeListener("server:log", handler);
  },
  onServerStatusChange: (
    callback: (data: {
      serverId: string;
      status: "live" | "activating" | "inactive" | "crashed" | "error";
      error?: string;
    }) => void
  ) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on("server:status-change", handler);
    return () => ipcRenderer.removeListener("server:status-change", handler);
  },
});
