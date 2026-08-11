import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import pngToIcoModule from "png-to-ico";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const pngToIco = pngToIcoModule.default || pngToIcoModule;

const rootDir = process.cwd();
const assetsDir = path.join(rootDir, "assets");
const masterIconPath = path.join(assetsDir, "icon-master.png");
const iconsDir = path.join(rootDir, "src-tauri", "icons");
const targetIcoPath = path.join(iconsDir, "icon.ico");
const faviconPath = path.join(rootDir, "public", "favicon.ico");

// 1. Ensure assets directory & assets/icon-master.png exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

if (!fs.existsSync(masterIconPath)) {
  console.log("Creating assets/icon-master.png from source image...");
  const jpgPath = path.join(rootDir, "src", "assets", "images", "ptw_app_icon_1786173295045.jpg");
  if (fs.existsSync(jpgPath)) {
    const jpgData = fs.readFileSync(jpgPath);
    const rawJpg = jpeg.decode(jpgData, { useTArray: true });
    const dstW = 1024;
    const dstH = 1024;
    const png = new PNG({ width: dstW, height: dstH });
    for (let y = 0; y < dstH; y++) {
      for (let x = 0; x < dstW; x++) {
        const srcX = Math.floor((x / dstW) * rawJpg.width);
        const srcY = Math.floor((y / dstH) * rawJpg.height);
        const srcIdx = (rawJpg.width * srcY + srcX) << 2;
        const dstIdx = (dstW * y + x) << 2;

        png.data[dstIdx] = rawJpg.data[srcIdx]; // R
        png.data[dstIdx + 1] = rawJpg.data[srcIdx + 1]; // G
        png.data[dstIdx + 2] = rawJpg.data[srcIdx + 2]; // B
        png.data[dstIdx + 3] = rawJpg.data[srcIdx + 3]; // A
      }
    }
    fs.writeFileSync(masterIconPath, PNG.sync.write(png));
  } else if (fs.existsSync(path.join(iconsDir, "icon.png"))) {
    fs.copyFileSync(path.join(iconsDir, "icon.png"), masterIconPath);
  }
}

// 2. Run Tauri CLI icon generator to create all multi-platform PNG assets
console.log("🎨 Generating multi-platform Tauri icons from assets/icon-master.png...");
try {
  execSync("npx @tauri-apps/cli icon ./assets/icon-master.png", {
    stdio: "inherit",
    cwd: rootDir,
  });
} catch (err) {
  console.warn("Notice: tauri icon command exit message:", err.message);
}

// 3. Fix Windows RC.exe compatibility for icon.ico
// Tauri CLI icon tool embeds PNG chunks in icon.ico which causes MSVC RC.EXE error RC2176 (old DIB).
// We replace icon.ico with standard 32bpp uncompressed DIB bitmaps using png-to-ico.
try {
  const icoBuf = await pngToIco(masterIconPath);
  fs.writeFileSync(targetIcoPath, icoBuf);
  fs.writeFileSync(faviconPath, icoBuf);
  console.log("✅ Created RC.EXE-compliant icon.ico & favicon.ico:", icoBuf.length, "bytes");
} catch (err) {
  console.error("Error generating RC-compliant ICO:", err);
}

// 4. Sync Android icons if Android target project exists
const capacitorAndroidRes = path.join(rootDir, "android", "app", "src", "main", "res");
const tauriAndroidIcons = path.join(iconsDir, "android");

if (fs.existsSync(tauriAndroidIcons) && fs.existsSync(capacitorAndroidRes)) {
  try {
    fs.cpSync(tauriAndroidIcons, capacitorAndroidRes, { recursive: true });
    console.log("✅ Synced Android app launcher icons to android/app/src/main/res");
  } catch (err) {
    console.warn("Could not sync android icons:", err);
  }
}

// 5. Verify tauri.conf.json bundle.icon files exist
const tauriConfPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
  if (tauriConf.bundle && Array.isArray(tauriConf.bundle.icon)) {
    const missing = tauriConf.bundle.icon.filter(
      (relPath) => !fs.existsSync(path.join(rootDir, "src-tauri", relPath)),
    );
    if (missing.length > 0) {
      console.warn("⚠️ Warning: Some bundle icons in tauri.conf.json are missing:", missing);
    } else {
      console.log("✅ All bundle icons referenced in tauri.conf.json exist.");
    }
  }
}

console.log("✅ Tauri icon pipeline complete!");
