const path = require("path");
const { BrowserWindow } = require("electron");

let permissionWindow = null;

const createPermissionWindow = () => {
  if (permissionWindow && !permissionWindow.isDestroyed()) {
    permissionWindow.focus();
    return permissionWindow;
  }
  permissionWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 420,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#121826",
    webPreferences: {
      preload: path.join(__dirname, "../../preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  permissionWindow.setMenuBarVisibility(false);
  permissionWindow.loadFile(path.join(__dirname, "../../../renderer/permission.html"));
  permissionWindow.on("closed", () => {
    permissionWindow = null;
  });
  return permissionWindow;
};

const getPermissionWindow = () => {
  return permissionWindow && !permissionWindow.isDestroyed() ? permissionWindow : null;
};

module.exports = { createPermissionWindow, getPermissionWindow };
