import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const isStaticOrAppEnv = (() => {
    if (typeof window === "undefined") return false;

    const protocol = window.location.protocol || "";
    const pathname = window.location.pathname || "";
    const win = window as unknown as {
      Capacitor?: unknown;
      capacitor?: unknown;
    };

    // Only force hash history when strictly running in offline file://, capacitor://, or Android asset protocols.
    // Web HTTP/HTTPS environments must use standard browser history for SSR hydration compatibility.
    return (
      protocol === "file:" ||
      protocol === "capacitor:" ||
      pathname.includes("android_asset") ||
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
    defaultPreload: "intent",
    defaultPreloadStaleTime: 1000 * 60 * 5,
  });

  return router;
};
