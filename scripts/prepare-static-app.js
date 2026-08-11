import fs from "node:fs";
import path from "node:path";
import "./prepare-tauri-icons.js";

function prepareStaticApp() {
  console.log("🛠️ Preparing static index.html and dist bundle for Electron & Android...");

  const publicDir = path.resolve(".output/public");
  const assetsDir = path.join(publicDir, "assets");
  const distDir = path.resolve("dist");

  if (!fs.existsSync(publicDir)) {
    console.error("❌ Error: .output/public directory does not exist. Run build first.");
    process.exit(1);
  }

  // Find index JS and CSS files in assets
  let indexJsFile = "";
  let stylesCssFile = "";

  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);

    // Look for index-*.js or the largest bundle file starting with index/entry
    const jsFiles = files.filter((f) => f.endsWith(".js"));
    const cssFiles = files.filter((f) => f.endsWith(".css"));

    indexJsFile = jsFiles.find((f) => f.startsWith("index-")) || jsFiles[0] || "";
    stylesCssFile = cssFiles.find((f) => f.startsWith("styles-")) || cssFiles[0] || "";
  }

  console.log(`📌 Detected JS entry asset: ${indexJsFile || "none"}`);
  console.log(`📌 Detected CSS asset: ${stylesCssFile || "none"}`);

  const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>سامانه مدیریت مجوز کار PTW و LOTO</title>
    <link rel="icon" href="./favicon.ico" />
    ${stylesCssFile ? `<link rel="stylesheet" href="./assets/${stylesCssFile}" />` : ""}
    <script>
      (function() {
        try {
          // Initialize hydration data for TanStack Start in static client app mode
          window.__TSTR_DATA__ = window.__TSTR_DATA__ || {
            manifest: { routes: {} },
            state: { dehydrated: { mutations: [], queries: [] } }
          };

          var ua = (window.navigator && window.navigator.userAgent) ? window.navigator.userAgent.toLowerCase() : '';
          var proto = window.location.protocol || '';
          var path = window.location.pathname || '';
          var host = window.location.hostname || '';
          var port = window.location.port || '';

          // Detect if running inside Tauri (Windows/Mac/Linux), Android APK, Capacitor, Electron, or static file/webview
          var isApp = proto === 'file:' ||
                      proto === 'capacitor:' ||
                      proto === 'tauri:' ||
                      host.indexOf('tauri.localhost') !== -1 ||
                      ua.indexOf('electron') !== -1 ||
                      ua.indexOf('tauri') !== -1 ||
                      path.indexOf('.html') !== -1 ||
                      path.indexOf('android_asset') !== -1 ||
                      Boolean(window.Capacitor) ||
                      Boolean(window.capacitor) ||
                      Boolean(window.__TAURI__) ||
                      Boolean(window.__TAURI_INTERNALS__);

          if (isApp && (!window.location.hash || window.location.hash === '#' || window.location.hash === '')) {
            window.location.hash = '#/';
          }
        } catch (e) {
          console.error('PTW App Init Error:', e);
        }

        // Fallback global error boundary for desktop app / webview debugging
        window.addEventListener('error', function(e) {
          console.error('PTW System Global Error:', e.error || e.message);
          var root = document.getElementById('root');
          if (root && (!root.children || root.children.length === 0 || root.querySelector('.ptw-app-loader'))) {
            root.innerHTML = '<div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; background: #0f172a; color: #f8fafc; font-family: sans-serif; direction: rtl; text-align: right;">' +
              '<div style="max-width: 480px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);">' +
              '<h2 style="color: #f43f5e; margin-top: 0; margin-bottom: 0.75rem; font-weight: 700; font-size: 1.125rem;">خطا در اجرای سامانه PTW</h2>' +
              '<p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.25rem; line-height: 1.5;">' + (e.message || 'مشکلی در بارگذاری نرم‌افزار رخ داده است.') + '</p>' +
              '<button onclick="window.location.reload()" style="padding: 0.5rem 1.25rem; background: #2563eb; color: white; border: none; border-radius: 0.375rem; font-weight: 600; cursor: pointer;">تلاش دوباره</button>' +
              '</div></div>';
          }
        });
      })();
    </script>
  </head>
  <body class="bg-background text-foreground antialiased">
    <div id="root">
      <div class="ptw-app-loader" style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; direction: rtl;">
        <div style="width: 44px; height: 44px; border: 4px solid #334155; border-top-color: #38bdf8; border-radius: 50%; animation: ptw-spin 0.8s linear infinite;"></div>
        <h2 style="margin-top: 1.25rem; font-size: 1rem; font-weight: 600; color: #cbd5e1;">در حال بارگذاری سامانه PTW...</h2>
        <style>@keyframes ptw-spin { to { transform: rotate(360deg); } }</style>
      </div>
    </div>
    ${indexJsFile ? `<script type="module" src="./assets/${indexJsFile}"></script>` : ""}
  </body>
</html>
`;

  // Write index.html to .output/public
  fs.writeFileSync(path.join(publicDir, "index.html"), htmlContent, "utf-8");
  console.log("✅ Written index.html to .output/public/index.html");

  // Sync everything from .output/public to dist for Electron & Capacitor
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.cpSync(publicDir, distDir, { recursive: true });
  console.log("✅ Synced .output/public to dist/");
}

prepareStaticApp();
