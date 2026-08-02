import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const isDesktopOrMobileApp =
    typeof window !== "undefined" &&
    (window.location.protocol === "file:" ||
      window.navigator.userAgent.includes("Electron") ||
      Boolean((window as { Capacitor?: unknown }).Capacitor));

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: isDesktopOrMobileApp ? createHashHistory() : undefined,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 1000 * 60 * 5,
  });

  return router;
};
