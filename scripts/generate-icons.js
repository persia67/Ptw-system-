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

// 1. Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 2. Ensure assets/icon-master.png is a valid 1024x1024 RGBA PNG
function ensureMasterIcon() {
  if (fs.existsSync(masterIconPath)) {
    try {
      const buf = fs.readFileSync(masterIconPath);
      const png = PNG.sync.read(buf);
      if (png.width === 1024 && png.height === 1024) {
        console.log("✅ Verified assets/icon-master.png is 1024x1024 PNG.");
        return png;
      }
    } catch (e) {
      console.warn("Re-creating invalid assets/icon-master.png...", e.message);
    }
  }

  console.log("Generating assets/icon-master.png from source image...");
  const jpgPath = path.join(rootDir, "src", "assets", "images", "ptw_app_icon_1786173295045.jpg");
  let rawRgba, srcW, srcH;

  if (fs.existsSync(jpgPath)) {
    const jpgData = fs.readFileSync(jpgPath);
    const decoded = jpeg.decode(jpgData, { useTArray: true });
    rawRgba = decoded.data;
    srcW = decoded.width;
    srcH = decoded.height;
  } else if (fs.existsSync(path.join(iconsDir, "icon.png"))) {
    const pngData = fs.readFileSync(path.join(iconsDir, "icon.png"));
    const decoded = PNG.sync.read(pngData);
    rawRgba = decoded.data;
    srcW = decoded.width;
    srcH = decoded.height;
  } else {
    throw new Error("No source icon found to construct assets/icon-master.png!");
  }

  const masterPng = new PNG({ width: 1024, height: 1024 });
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const srcX = Math.floor((x / 1024) * srcW);
      const srcY = Math.floor((y / 1024) * srcH);
      const srcIdx = (srcW * srcY + srcX) << 2;
      const dstIdx = (1024 * y + x) << 2;

      masterPng.data[dstIdx] = rawRgba[srcIdx]; // R
      masterPng.data[dstIdx + 1] = rawRgba[srcIdx + 1]; // G
      masterPng.data[dstIdx + 2] = rawRgba[srcIdx + 2]; // B
      masterPng.data[dstIdx + 3] = 255; // A (Solid Alpha)
    }
  }

  const pngBuf = PNG.sync.write(masterPng);
  fs.writeFileSync(masterIconPath, pngBuf);
  console.log("✅ Created assets/icon-master.png (1024x1024, 32-bit RGBA).");
  return masterPng;
}

function resizePng(srcPng, dstW, dstH) {
  const dst = new PNG({ width: dstW, height: dstH });
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.floor((x / dstW) * srcPng.width);
      const srcY = Math.floor((y / dstH) * srcPng.height);
      const srcIdx = (srcPng.width * srcY + srcX) << 2;
      const dstIdx = (dstW * y + x) << 2;

      dst.data[dstIdx] = srcPng.data[srcIdx]; // R
      dst.data[dstIdx + 1] = srcPng.data[srcIdx + 1]; // G
      dst.data[dstIdx + 2] = srcPng.data[srcIdx + 2]; // B
      dst.data[dstIdx + 3] = srcPng.data[srcIdx + 3]; // A
    }
  }
  return dst;
}

async function generateAllIcons() {
  const masterPng = ensureMasterIcon();

  // 3. Generate individual PNG sizes
  const sizes = {
    16: resizePng(masterPng, 16, 16),
    24: resizePng(masterPng, 24, 24),
    32: resizePng(masterPng, 32, 32),
    48: resizePng(masterPng, 48, 48),
    64: resizePng(masterPng, 64, 64),
    128: resizePng(masterPng, 128, 128),
    256: resizePng(masterPng, 256, 256),
    512: resizePng(masterPng, 512, 512),
  };

  fs.writeFileSync(path.join(iconsDir, "32x32.png"), PNG.sync.write(sizes["32"]));
  fs.writeFileSync(path.join(iconsDir, "64x64.png"), PNG.sync.write(sizes["64"]));
  fs.writeFileSync(path.join(iconsDir, "128x128.png"), PNG.sync.write(sizes["128"]));
  fs.writeFileSync(path.join(iconsDir, "128x128@2x.png"), PNG.sync.write(sizes["256"]));
  fs.writeFileSync(path.join(iconsDir, "icon.png"), PNG.sync.write(sizes["512"]));

  const publicDir = path.join(rootDir, "public");
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, "app-icon.png"), PNG.sync.write(sizes["512"]));
    fs.writeFileSync(path.join(publicDir, "favicon.png"), PNG.sync.write(sizes["32"]));
  }

  // 4. Run Tauri CLI icon tool for multi-platform icons (ICNS, Android, iOS, Appx logos)
  try {
    console.log("🎨 Running @tauri-apps/cli icon ./assets/icon-master.png...");
    execSync("npx @tauri-apps/cli icon ./assets/icon-master.png", {
      stdio: "inherit",
      cwd: rootDir,
    });
  } catch (err) {
    console.warn("Notice: tauri icon generator message:", err.message);
  }

  // 5. Generate Windows RC-compliant & resedit-compatible icon.ico using png-to-ico
  // png-to-ico creates standard uncompressed 32bpp DIB bitmaps (DIB Header = 40 bytes)
  // for all sizes [256, 128, 64, 48, 32, 24, 16], resolving RC2176 and DataView Offset errors.
  const icoBuffers = [256, 128, 64, 48, 32, 24, 16].map((s) => PNG.sync.write(sizes[String(s)]));

  const icoBuf = await pngToIco(icoBuffers);
  fs.writeFileSync(targetIcoPath, icoBuf);
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(faviconPath, icoBuf);
  }
  console.log(
    "✅ Generated valid, RC2176-compliant icon.ico & favicon.ico:",
    icoBuf.length,
    "bytes",
  );

  // 6. Sync Android launcher icons if capacitor/tauri android structure exists
  const capacitorAndroidRes = path.join(rootDir, "android", "app", "src", "main", "res");
  const tauriAndroidIcons = path.join(iconsDir, "android");

  if (fs.existsSync(tauriAndroidIcons) && fs.existsSync(capacitorAndroidRes)) {
    try {
      fs.cpSync(tauriAndroidIcons, capacitorAndroidRes, { recursive: true });
      console.log("✅ Synced Android launcher icons to android/app/src/main/res");
    } catch (err) {
      console.warn("Could not sync android icons:", err);
    }
  }

  // 7. Verify tauri.conf.json bundle icons
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

  console.log("✅ Icon generation pipeline completed successfully!");
}

await generateAllIcons();
