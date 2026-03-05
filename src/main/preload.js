const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lcuApi", {
  getStatus: () => ipcRenderer.invoke("lcu:get-status"),
  connect: () => ipcRenderer.invoke("lcu:connect"),
  disconnect: () => ipcRenderer.invoke("lcu:disconnect"),
  reconnect: () => ipcRenderer.invoke("lcu:reconnect"),
  setLockfilePath: (path) => ipcRenderer.invoke("lcu:set-lockfile-path", path),
  setInstallRoot: (path) => ipcRenderer.invoke("lcu:set-install-root", path),
  diagnose: () => ipcRenderer.invoke("lcu:diagnose"),
  onStatus: (handler) => {
    const listener = (_event, status) => handler(status);
    ipcRenderer.on("lcu:status", listener);
    return () => ipcRenderer.removeListener("lcu:status", listener);
  },
  onChampSelectUpdate: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("champ-select:update", listener);
    return () => ipcRenderer.removeListener("champ-select:update", listener);
  },
  onGameflowPhase: (handler) => {
    const listener = (_event, phase) => handler(phase);
    ipcRenderer.on("gameflow:phase", listener);
    return () => ipcRenderer.removeListener("gameflow:phase", listener);
  },
  getCurrentSummoner: () => ipcRenderer.invoke("lcu:get-current-summoner"),
  getProfileIconUrl: (profileIconId) => ipcRenderer.invoke("lcu:get-profile-icon-url", profileIconId),
  getProfileIcon: (profileIconId) => ipcRenderer.invoke("lcu:get-profile-icon", profileIconId),
  getChampions: () => ipcRenderer.invoke("lcu:get-champions"),
  getChampionIcon: (squarePortraitPath) => ipcRenderer.invoke("lcu:get-champion-icon", squarePortraitPath),
  getChampionMastery: () => ipcRenderer.invoke("lcu:get-champion-mastery"),
  getOwnedChampions: () => ipcRenderer.invoke("lcu:get-owned-champions"),
  getProfileIconCdn: (profileIconId) => ipcRenderer.invoke("lcu:get-profile-icon-cdn", profileIconId),
  getRankedStats: () => ipcRenderer.invoke("lcu:get-ranked-stats"),
  getBans: () => ipcRenderer.invoke("lcu:get-bans")
});

contextBridge.exposeInMainWorld("appWindow", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke("window:set-always-on-top", flag),
  isAlwaysOnTop: () => ipcRenderer.invoke("window:is-always-on-top"),
  onMaximizeChange: (handler) => {
    const listener = (_event, isMaximized) => handler(isMaximized);
    ipcRenderer.on("window:maximize", listener);
    return () => ipcRenderer.removeListener("window:maximize", listener);
  }
});

contextBridge.exposeInMainWorld("heroConfig", {
  get: () => ipcRenderer.invoke("hero:get"),
  save: (payload) => ipcRenderer.invoke("hero:save", payload)
});

contextBridge.exposeInMainWorld("systemConfig", {
  get: () => ipcRenderer.invoke("system:get"),
  save: (payload) => ipcRenderer.invoke("system:save", payload)
});

contextBridge.exposeInMainWorld("permissionExplorer", {
  open: () => ipcRenderer.invoke("permission:open-window"),
  onRulesUpdate: (handler) => {
    const listener = (_event, rules) => handler(rules);
    ipcRenderer.on("auth:rules:update", listener);
    return () => ipcRenderer.removeListener("auth:rules:update", listener);
  },
  broadcastRules: (rules) => ipcRenderer.invoke("auth:rules:broadcast", rules)
});

contextBridge.exposeInMainWorld("authExplorer", {
  open: () => ipcRenderer.invoke("auth-explorer:open"),
  close: () => ipcRenderer.invoke("auth-explorer:close"),
  hover: (payload) => ipcRenderer.send("auth-explorer:hover", payload),
  clear: () => ipcRenderer.send("auth-explorer:clear")
});

contextBridge.exposeInMainWorld("overlay", {
  onHover: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("auth-explorer:hover", listener);
    return () => ipcRenderer.removeListener("auth-explorer:hover", listener);
  },
  onClear: (handler) => {
    const listener = () => handler();
    ipcRenderer.on("auth-explorer:clear", listener);
    return () => ipcRenderer.removeListener("auth-explorer:clear", listener);
  }
});
