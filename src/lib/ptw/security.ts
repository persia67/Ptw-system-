/**
 * توابع امنیتی تایید هویت، رمزنگاری و جلوگیری از جعل امضا
 */

export async function generateSignatureHash(
  permitId: string,
  stepId: string,
  signerName: string,
  position: string,
  decision: string,
  timestamp: string,
  signatureDataUrl?: string,
): Promise<string> {
  const payload = [
    permitId,
    stepId,
    signerName.trim(),
    position.trim(),
    decision,
    timestamp,
    signatureDataUrl || "no-canvas-sig",
  ].join("|");

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex.toUpperCase();
  } catch {
    // Fallback simple checksum if WebCrypto unavailable
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `SEC-${Math.abs(hash).toString(16).toUpperCase().padStart(12, "0")}`;
  }
}

export function generateDeviceToken(): string {
  const nav = typeof navigator !== "undefined" ? navigator.userAgent : "server";
  let hash = 0;
  for (let i = 0; i < nav.length; i++) {
    hash = (hash << 5) - hash + nav.charCodeAt(i);
    hash |= 0;
  }
  return `DEV-${Math.abs(hash).toString(36).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}
