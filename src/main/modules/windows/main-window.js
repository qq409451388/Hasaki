const path = require("path");
const { BrowserWindow } = require("electron");

const createMainWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true, // 隐藏菜单栏
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#121826",
    webPreferences: {
      preload: path.join(__dirname, "../../preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 移除菜单栏
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window:maximize", true);
  });

  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window:maximize", false);
  });

  mainWindow.loadFile(path.join(__dirname, "../../../renderer/index.html"));

  return mainWindow;
};

module.exports = { createMainWindow };
