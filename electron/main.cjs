const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

let localServer = null;

function startStaticServer(publicDir) {
  return new Promise((resolve, reject) => {
    const mimeTypes = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript",
      ".mjs": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".woff2": "font/woff2",
      ".woff": "font/woff",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject",
    };

    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(req.url.split("?")[0]);
      if (reqPath === "/") reqPath = "/index.html";

      let filePath = path.join(publicDir, reqPath);

      // Prevent directory traversal
      if (!filePath.startsWith(publicDir)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // SPA fallback to index.html
          filePath = path.join(publicDir, "index.html");
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";

        fs.readFile(filePath, (readErr, content) => {
          if (readErr) {
            res.statusCode = 404;
            res.end("Not Found");
          } else {
            res.writeHead(200, {
              "Content-Type": contentType,
              "Cache-Control": "no-cache",
            });
            res.end(content);
          }
        });
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      console.log(`Local Electron server running on http://127.0.0.1:${port}`);
      resolve({ server, port });
    });

    server.on("error", (err) => {
      console.error("Local server error:", err);
      reject(err);
    });
  });
}

async function createWindow() {
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
    return;
  }

  // Find candidate static public directories
  const dirCandidates = [
    path.join(__dirname, "../dist"),
    path.join(__dirname, "../.output/public"),
    path.join(app.getAppPath(), "dist"),
    path.join(app.getAppPath(), ".output/public"),
  ];

  const publicDir = dirCandidates.find((d) => fs.existsSync(path.join(d, "index.html")));

  if (publicDir) {
    try {
      const { server, port } = await startStaticServer(publicDir);
      localServer = server;
      await mainWindow.loadURL(`http://127.0.0.1:${port}`);
      return;
    } catch (err) {
      console.error("Failed to load via local HTTP server, falling back to loadFile:", err);
    }

    // Fallback if HTTP server fails
    const target = path.join(publicDir, "index.html");
    mainWindow.loadFile(target).catch((err) => {
      console.error("Failed to load local HTML entry:", err);
    });
  } else {
    console.error(
      "No valid public directory with index.html found. Tried candidates:",
      dirCandidates,
    );
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (localServer) {
    localServer.close();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
