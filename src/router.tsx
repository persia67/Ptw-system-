import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const isStaticOrAppEnv = (() => {
    if (typeof window === "undefined") return false;

    const protocol = window.location.protocol;
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const ua = window.navigator?.userAgent?.toLowerCase() || "";
    const win = window as unknown as {
      Capacitor?: unknown;
      capacitor?: unknown;
    };

    return (
      protocol === "file:" ||
      protocol === "capacitor:" ||
      ua.includes("electron") ||
      pathname.includes("android_asset") ||
      hash.startsWith("#/") ||
      Boolean(win.Capacitor) ||
      Boolean(win.capacitor)
    );
  })();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: isStaticOrAppEnv ? createHashHistory() : undefined,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 1000 * 60 * 5,
  });

  return router;
};
