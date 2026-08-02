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
