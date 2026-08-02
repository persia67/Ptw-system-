const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "سامانه مجوز کار (PTW) - واحد ایمنی و بهداشت حرفه‌ای",
    icon: path.join(__dirname, "../public/favicon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const isDev = process.env.NODE_ENV === "development";
  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    const candidates = [
      path.join(__dirname, "../dist/index.html"),
      path.join(__dirname, "../.output/public/index.html"),
      path.join(app.getAppPath(), "dist/index.html"),
      path.join(app.getAppPath(), ".output/public/index.html"),
    ];

    const target = candidates.find((p) => fs.existsSync(p));

    if (target) {
      mainWindow.loadFile(target).catch((err) => {
        console.error("Failed to load local HTML entry:", err);
      });
    } else {
      console.error("No valid index.html found. Tried candidates:", candidates);
    }
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
