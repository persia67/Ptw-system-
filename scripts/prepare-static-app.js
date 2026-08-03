import fs from "node:fs";
import path from "node:path";

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

          // Detect if running inside Android APK, Capacitor, Electron, or static file/webview
          var isApp = proto === 'file:' ||
                      proto === 'capacitor:' ||
                      ua.indexOf('electron') !== -1 ||
                      path.indexOf('.html') !== -1 ||
                      path.indexOf('android_asset') !== -1 ||
                      Boolean(window.Capacitor) ||
                      Boolean(window.capacitor);

          if (isApp && (!window.location.hash || window.location.hash === '#' || window.location.hash === '')) {
            window.location.hash = '#/';
          }
        } catch (e) {
          console.error('PTW App Init Error:', e);
        }

        // Fallback global error boundary for webview / electron debugging
        window.addEventListener('error', function(e) {
          console.error('PTW System Global Error:', e.error || e.message);
          var root = document.getElementById('root');
          if (root && (!root.children || root.children.length === 0)) {
            root.innerHTML = '<div style="padding: 2rem; text-align: center; font-family: sans-serif; direction: rtl; text-align: right;">' +
              '<h2 style="color: #e11d48; margin-bottom: 1rem; font-weight: bold;">خطا در اجرای برنامه در نسخه اندروید</h2>' +
              '<p style="color: #475569; font-size: 0.9rem;">' + (e.message || 'مشکلی در بارگذاری رخ داده است.') + '</p>' +
              '<button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">تلاش دوباره</button>' +
              '</div>';
          }
        });
      })();
    </script>
  </head>
  <body class="bg-background text-foreground antialiased">
    <div id="root"></div>
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
