import fs from "fs";
import path from "path";

const iconsDir = path.join(process.cwd(), "src-tauri", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const faviconPath = path.join(process.cwd(), "public", "favicon.ico");
const targetIcoPath = path.join(iconsDir, "icon.ico");

// Sync favicon.ico between public and src-tauri/icons
if (fs.existsSync(targetIcoPath) && !fs.existsSync(faviconPath)) {
  fs.copyFileSync(targetIcoPath, faviconPath);
} else if (fs.existsSync(faviconPath) && !fs.existsSync(targetIcoPath)) {
  fs.copyFileSync(faviconPath, targetIcoPath);
}

// Sync Android icons if Android project structure exists
const capacitorAndroidRes = path.join(process.cwd(), "android", "app", "src", "main", "res");
const tauriAndroidIcons = path.join(iconsDir, "android");

if (fs.existsSync(tauriAndroidIcons) && fs.existsSync(capacitorAndroidRes)) {
  try {
    fs.cpSync(tauriAndroidIcons, capacitorAndroidRes, { recursive: true });
    console.log("✅ Synced Android app launcher icons to android/app/src/main/res");
  } catch (err) {
    console.warn("Could not sync android icons:", err);
  }
}

console.log("✅ Prepared Tauri v2 icon assets in src-tauri/icons");
