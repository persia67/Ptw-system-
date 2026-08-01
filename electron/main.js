const { app, BrowserWindow } = require("electron");
const path = require("path");

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
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const isDev = process.env.NODE_ENV === "development";
  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    // Standard static build location
    const distPath = path.join(__dirname, "../.output/public/index.html");
    const fallbackPath = path.join(__dirname, "../dist/index.html");

    mainWindow.loadFile(distPath).catch(() => {
      mainWindow.loadFile(fallbackPath).catch((err) => {
        console.error("Failed to load local HTML entry:", err);
      });
    });
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
