const { BrowserWindow, ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");
const { createPermissionWindow, getPermissionWindow } = require("../windows/permission-window");

const registerIpcHandlers = ({ lcuConnection }) => {
  ipcMain.handle("lcu:get-status", () => lcuConnection.getStatus());
  ipcMain.handle("lcu:connect", async () => {
    try {
      return await lcuConnection.connect();
    } catch (error) {
      return lcuConnection.getStatus();
    }
  });
  ipcMain.handle("lcu:disconnect", () => lcuConnection.disconnect());
  ipcMain.handle("lcu:reconnect", async () => {
    try {
      return await lcuConnection.reconnect();
    } catch (error) {
      return lcuConnection.getStatus();
    }
  });
  ipcMain.handle("lcu:set-lockfile-path", (_event, path) => {
    lcuConnection.setLockfilePath(path);
    return lcuConnection.getStatus();
  });
  ipcMain.handle("lcu:set-install-root", (_event, path) => {
    lcuConnection.setInstallRoot(path);
    lcuConnection.setLockfilePath(null);
    return lcuConnection.getStatus();
  });
  ipcMain.handle("lcu:diagnose", () => lcuConnection.discover());
  ipcMain.handle("lcu:get-current-summoner", async () => {
    try {
      return await lcuConnection.getCurrentSummoner();
    } catch (error) {
      return null;
    }
  });
  ipcMain.handle("lcu:get-profile-icon-url", (_event, profileIconId) => {
    return lcuConnection.getProfileIconUrl(profileIconId);
  });
  ipcMain.handle("lcu:get-profile-icon", async (_event, profileIconId) => {
    try {
      return await lcuConnection.getProfileIcon(profileIconId);
    } catch (error) {
      return null;
    }
  });
  ipcMain.handle("lcu:get-champions", () => lcuConnection.getChampions());
  ipcMain.handle("lcu:get-champion-icon", async (_event, squarePortraitPath) => {
    try {
      return await lcuConnection.getChampionIcon(squarePortraitPath);
    } catch (error) {
      return null;
    }
  });
  ipcMain.handle("lcu:get-champion-mastery", async () => {
    try {
      return await lcuConnection.getChampionMastery();
    } catch (error) {
      return [];
    }
  });
  ipcMain.handle("lcu:get-owned-champions", async () => {
    try {
      return await lcuConnection.getOwnedChampions();
    } catch (error) {
      return [];
    }
  });
  ipcMain.handle("lcu:get-profile-icon-cdn", async (_event, profileIconId) => {
    try {
      return await lcuConnection.getProfileIconCdn(profileIconId);
    } catch (error) {
      return null;
    }
  });
  ipcMain.handle("lcu:get-ranked-stats", async () => {
    try {
      return await lcuConnection.getRankedStats();
    } catch (error) {
      return null;
    }
  });
  ipcMain.handle("lcu:get-bans", async () => {
    try {
      return await lcuConnection.getBans();
    } catch (error) {
      return null;
    }
  });

  ipcMain.handle("window:minimize", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.minimize();
  });

  ipcMain.handle("window:toggle-maximize", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.handle("window:close", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.close();
  });

  ipcMain.handle("window:is-maximized", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMaximized() : false;
  });

  ipcMain.handle("window:set-always-on-top", (event, flag) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return false;
    try {
      window.setAlwaysOnTop(!!flag, "normal");
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("window:is-always-on-top", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isAlwaysOnTop() : false;
  });

  // Permission Explorer
  ipcMain.handle("permission:open-window", () => {
    try {
      createPermissionWindow();
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("auth:rules:broadcast", (_event, rules) => {
    try {
      const win = getPermissionWindow();
      if (win) {
        win.webContents.send("auth:rules:update", Array.isArray(rules) ? rules : []);
      }
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("hero:get", () => {
    const userDir = path.join(app.getPath("userData"), "config");
    const userPath = path.join(userDir, "hero.json");
    const cwdPath = path.join(process.cwd(), "config", "hero.json");
    try {
      if (fs.existsSync(userPath)) {
        const content = fs.readFileSync(userPath, "utf8");
        return JSON.parse(content);
      }
      if (fs.existsSync(cwdPath)) {
        const content = fs.readFileSync(cwdPath, "utf8");
        const data = JSON.parse(content);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        fs.writeFileSync(userPath, JSON.stringify(data, null, 2), "utf8");
        return data;
      }
    } catch (error) {
      return null;
    }
    return null;
  });

  ipcMain.handle("hero:save", (_event, payload) => {
    const configDir = path.join(app.getPath("userData"), "config");
    const configPath = path.join(configDir, "hero.json");
    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(payload, null, 2), "utf8");
      return true;
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle("system:get", () => {
    const userDir = path.join(app.getPath("userData"), "config");
    const userPath = path.join(userDir, "system_config.json");
    const cwdPath = path.join(process.cwd(), "config", "system_config.json");
    try {
      if (fs.existsSync(userPath)) {
        const content = fs.readFileSync(userPath, "utf8");
        return JSON.parse(content);
      }
      if (fs.existsSync(cwdPath)) {
        const content = fs.readFileSync(cwdPath, "utf8");
        const data = JSON.parse(content);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        fs.writeFileSync(userPath, JSON.stringify(data, null, 2), "utf8");
        return data;
      }
    } catch (error) {
      return null;
    }
    return null;
  });

  ipcMain.handle("system:save", (_event, payload) => {
    const configDir = path.join(app.getPath("userData"), "config");
    const configPath = path.join(configDir, "system_config.json");
    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(payload, null, 2), "utf8");
      return true;
    } catch (error) {
      return false;
    }
  });
};

module.exports = { registerIpcHandlers };
