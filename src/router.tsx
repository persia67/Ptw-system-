import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const isStaticOrAppEnv = (() => {
    if (typeof window === "undefined") return false;

    const protocol = window.location.protocol || "";
    const pathname = window.location.pathname || "";
    const hostname = window.location.hostname || "";
    const userAgent = navigator && navigator.userAgent ? navigator.userAgent.toLowerCase() : "";
    const win = window as unknown as {
      Capacitor?: unknown;
      capacitor?: unknown;
      __TAURI__?: unknown;
      __TAURI_INTERNALS__?: unknown;
    };

    // Force hash history when running in Tauri (Windows/Mac/Linux), Electron, Capacitor,
    // Android WebViews, or offline file:// protocols.
    return (
      protocol === "file:" ||
      protocol === "capacitor:" ||
      protocol === "tauri:" ||
      hostname.includes("tauri.localhost") ||
      userAgent.includes("tauri") ||
      userAgent.includes("electron") ||
      pathname.includes("android_asset") ||
      pathname.endsWith(".html") ||
      Boolean(win.__TAURI__) ||
      Boolean(win.__TAURI_INTERNALS__) ||
      (Boolean(win.Capacitor) && protocol !== "http:" && protocol !== "https:")
    );
  })();

  if (isStaticOrAppEnv && typeof window !== "undefined") {
    if (!window.location.hash || window.location.hash === "#" || window.location.hash === "") {
      window.location.hash = "#/";
    }
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: isStaticOrAppEnv ? createHashHistory() : undefined,
    scrollRestoration: true,
    defaultPreload: isStaticOrAppEnv ? false : "intent",
    defaultPreloadStaleTime: 1000 * 60 * 5,
  });

  return router;
};
