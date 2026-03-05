const { app, Menu } = require("electron");
const { createMainWindow } = require("./modules/windows/main-window");
const { registerIpcHandlers } = require("./modules/ipc/handlers");
const { LcuConnection } = require("./modules/lcu/lcu-connection");
const { ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let champWindow = null;
let authOverlayWindow = null;
const lcuConnection = new LcuConnection();

const wireStatusUpdates = () => {
  lcuConnection.on("status", (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("lcu:status", status);
    }
  });
};

const openChampWindow = () => {
  if (champWindow && !champWindow.isDestroyed()) return;
  champWindow = new BrowserWindow({
    width: 820,
    height: 720,
    minWidth: 700,
    minHeight: 600,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#121826",
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  champWindow.setMenuBarVisibility(false);
  champWindow.loadFile(path.join(__dirname, "../renderer/champ.html"));
  champWindow.on("closed", () => {
    champWindow = null;
  });
};

const closeChampWindow = () => {
  if (champWindow && !champWindow.isDestroyed()) {
    champWindow.close();
    champWindow = null;
  }
};

const wireChampSelectMonitor = () => {
  let lastPhase = null;
  let sessionTimer = null;

  const ensureSessionTimer = () => {
    if (sessionTimer) return;
    sessionTimer = setInterval(async () => {
      const session = await lcuConnection.getChampSelectSession();
      if (session && champWindow && !champWindow.isDestroyed()) {
        champWindow.webContents.send("champ-select:update", session);
      }
    }, 1200);
  };

  const stopSessionTimer = () => {
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
  };

  setInterval(async () => {
    const phase = await lcuConnection.getGameflowPhase();
    if (phase !== lastPhase) {
      lastPhase = phase;
      if (phase === "ChampSelect") {
        openChampWindow();
        ensureSessionTimer();
      } else {
        stopSessionTimer();
        // 小窗口不自动关闭，保持打开状态以便随时查看与操作
      }
    } else if (phase === "ChampSelect") {
      ensureSessionTimer();
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("gameflow:phase", phase);
    }
  }, 1500);
};

const registerAppEvents = () => {
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (!mainWindow) {
      mainWindow = createMainWindow();
    }
  });
};

const boot = async () => {
  // 移除默认菜单栏
  Menu.setApplicationMenu(null);
  
  try {
    const userDir = path.join(app.getPath("userData"), "config");
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    const pairs = [
      { from: path.join(process.cwd(), "config", "hero.json"), to: path.join(userDir, "hero.json") },
      { from: path.join(process.cwd(), "config", "system_config.json"), to: path.join(userDir, "system_config.json") },
      { from: path.join(process.cwd(), "config", "lcu.json"), to: path.join(userDir, "lcu.json") }
    ];
    pairs.forEach(({ from, to }) => {
      try {
        if (fs.existsSync(from) && !fs.existsSync(to)) {
          const content = fs.readFileSync(from, "utf8");
          fs.writeFileSync(to, content, "utf8");
          try { fs.unlinkSync(from); } catch {}
        }
      } catch {}
    });
  } catch {}
  
  mainWindow = createMainWindow();
  registerIpcHandlers({ lcuConnection });
  wireStatusUpdates();
  wireChampSelectMonitor();
  lcuConnection.connect().catch(() => {});
};

const openAuthOverlayWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (authOverlayWindow && !authOverlayWindow.isDestroyed()) return;
  const bounds = mainWindow.getBounds();
  authOverlayWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  authOverlayWindow.setMenuBarVisibility(false);
  authOverlayWindow.setIgnoreMouseEvents(true, { forward: true });
  authOverlayWindow.loadFile(path.join(__dirname, "../renderer/auth.html"));
  const syncOverlayBounds = () => {
    if (!authOverlayWindow || authOverlayWindow.isDestroyed()) return;
    const b = mainWindow.getBounds();
    authOverlayWindow.setBounds({ x: b.x, y: b.y, width: b.width, height: b.height });
  };
  mainWindow.on("move", syncOverlayBounds);
  mainWindow.on("resize", syncOverlayBounds);
  authOverlayWindow.on("closed", () => {
    authOverlayWindow = null;
  });
};

const closeAuthOverlayWindow = () => {
  if (authOverlayWindow && !authOverlayWindow.isDestroyed()) {
    authOverlayWindow.close();
    authOverlayWindow = null;
  }
};

// IPC for auth explorer overlay
ipcMain.handle("auth-explorer:open", () => {
  openAuthOverlayWindow();
  return true;
});
ipcMain.handle("auth-explorer:close", () => {
  closeAuthOverlayWindow();
  return true;
});
ipcMain.on("auth-explorer:hover", (_event, payload) => {
  if (authOverlayWindow && !authOverlayWindow.isDestroyed()) {
    authOverlayWindow.webContents.send("auth-explorer:hover", payload);
  }
});
ipcMain.on("auth-explorer:clear", () => {
  if (authOverlayWindow && !authOverlayWindow.isDestroyed()) {
    authOverlayWindow.webContents.send("auth-explorer:clear");
  }
});

registerAppEvents();

app.whenReady().then(boot);
