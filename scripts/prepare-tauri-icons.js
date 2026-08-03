import fs from "fs";
import path from "path";

const iconsDir = path.join(process.cwd(), "src-tauri", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Minimal 1x1 valid PNG buffer in base64
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const pngBuffer = Buffer.from(pngBase64, "base64");

const files = ["32x32.png", "128x128.png", "128x128@2x.png", "icon.icns"];

files.forEach((file) => {
  const filePath = path.join(iconsDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, pngBuffer);
  }
});

// Copy favicon.ico if exists to icon.ico
const faviconPath = path.join(process.cwd(), "public", "favicon.ico");
const targetIcoPath = path.join(iconsDir, "icon.ico");
if (fs.existsSync(faviconPath)) {
  fs.copyFileSync(faviconPath, targetIcoPath);
} else if (!fs.existsSync(targetIcoPath)) {
  fs.writeFileSync(targetIcoPath, pngBuffer);
}

console.log("✅ Prepared Tauri v2 icon assets in src-tauri/icons");
