import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  HardHat,
  LayoutDashboard,
  FilePlus2,
  Archive,
  Lock,
  Settings2,
  Download,
  ShieldCheck,
} from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { PtwProvider } from "@/lib/ptw/use-ptw";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">۴۰۴</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">صفحه پیدا نشد</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          صفحه‌ای که دنبال آن هستید وجود ندارد یا جابجا شده است.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            بازگشت به داشبورد
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          این صفحه بارگذاری نشد
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          مشکلی پیش آمد. می‌توانید دوباره تلاش کنید یا به داشبورد برگردید.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            تلاش دوباره
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            داشبورد
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "سامانه مجوز کار (PTW) | ایمنی و بهداشت حرفه‌ای" },
      {
        name: "description",
        content:
          "صدور، تایید چندمرحله‌ای، تمدید، ابطال، LOTO، بایگانی و چاپ مجوزهای کار در کارخانه.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://cdn.jsdelivr.net" },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        <div id="root">{children}</div>
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "داشبورد", icon: LayoutDashboard },
  { to: "/permits/new", label: "صدور مجوز", icon: FilePlus2 },
  { to: "/loto", label: "قفل و برچسب", icon: Lock },
  { to: "/archive", label: "بایگانی", icon: Archive },
  { to: "/settings", label: "تنظیمات", icon: Settings2 },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <PtwProvider>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background">
          <header className="no-print sticky top-0 z-40 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/" className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
                    <HardHat className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold leading-tight">
                        سامانه مجوز کار — PTW
                      </span>
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground border border-primary/30">
                        v1.2.4
                      </span>
                    </div>
                    <span className="block text-xs text-sidebar-foreground/70">
                      واحد ایمنی و بهداشت حرفه‌ای (ویندوز + اندروید)
                    </span>
                  </div>
                </Link>

                <a
                  href="https://github.com/rafiyanhamid1989/Ptw-system-/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent/20 border border-accent/40 px-2.5 py-1 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-accent/30"
                  title="دانلود نسخه‌های ویندوز (.exe) و اندروید (.apk) از گیتهاب"
                >
                  <Download className="size-3.5 text-accent" />
                  <span>دانلود نسخه v1.2.4 (ویندوز و اندروید)</span>
                </a>
              </div>
              <nav className="flex flex-wrap items-center gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    preload="intent"
                    activeOptions={{ exact: item.to === "/" }}
                    className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{
                      className:
                        "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                    }}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="h-1 ptw-hatch opacity-80" />
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6">
            <Outlet />
          </main>
        </div>
        <Toaster position="top-center" dir="rtl" richColors />
      </QueryClientProvider>
    </PtwProvider>
  );
}
