import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, ZoomIn, Feather } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type InkColor = "navy" | "blue" | "black" | "emerald";

interface SignaturePreviewProps {
  dataUrl?: string;
  signerName?: string;
  role?: string;
  date?: string;
  inkColor?: InkColor;
  showSeal?: boolean;
  showBaseline?: boolean;
  interactive?: boolean;
  className?: string;
  heightClass?: string;
  compact?: boolean;
}

const INK_CONFIG: Record<
  InkColor,
  {
    title: string;
    matrix: string;
    glow: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  navy: {
    title: "سرمه‌ای (خودنویس)",
    matrix: `
      0 0 0 0 0.08
      0 0 0 0 0.20
      0 0 0 0 0.55
      0 0 0 1 0`,
    glow: "rgba(15, 43, 92, 0.15)",
    badgeBg: "bg-blue-950/10 dark:bg-blue-900/30",
    badgeText: "text-blue-900 dark:text-blue-300",
  },
  blue: {
    title: "آبی کلاسیک (خودکار)",
    matrix: `
      0 0 0 0 0.10
      0 0 0 0 0.35
      0 0 0 0 0.85
      0 0 0 1 0`,
    glow: "rgba(29, 78, 216, 0.15)",
    badgeBg: "bg-blue-600/10",
    badgeText: "text-blue-700 dark:text-blue-400",
  },
  black: {
    title: "مشکی روان‌نویس",
    matrix: `
      0 0 0 0 0.12
      0 0 0 0 0.15
      0 0 0 0 0.22
      0 0 0 1 0`,
    glow: "rgba(30, 41, 59, 0.15)",
    badgeBg: "bg-slate-800/10 dark:bg-slate-700/30",
    badgeText: "text-slate-800 dark:text-slate-200",
  },
  emerald: {
    title: "سبز رسمی",
    matrix: `
      0 0 0 0 0.02
      0 0 0 0 0.38
      0 0 0 0 0.28
      0 0 0 1 0`,
    glow: "rgba(6, 95, 70, 0.15)",
    badgeBg: "bg-emerald-800/10 dark:bg-emerald-900/30",
    badgeText: "text-emerald-800 dark:text-emerald-300",
  },
};

export function SignaturePreview({
  dataUrl,
  signerName,
  role,
  date,
  inkColor = "navy",
  showSeal = true,
  showBaseline = true,
  interactive = true,
  className = "",
  heightClass = "h-14",
  compact = false,
}: SignaturePreviewProps) {
  const [openDetail, setOpenDetail] = useState(false);
  const filterId = `ink-filter-${inkColor}`;
  const ink = INK_CONFIG[inkColor] || INK_CONFIG.navy;

  if (!dataUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded border border-dashed border-muted-foreground/30 p-2 text-center text-xs text-muted-foreground ${className}`}
      >
        <Feather className="size-4 opacity-40 mb-1" />
        <span>امضا ثبت نشده</span>
      </div>
    );
  }

  return (
    <>
      {/* Hidden SVG Filter Definition for authentic fountain pen ink recoloring & smoothness */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={ink.matrix} />
            <feGaussianBlur stdDeviation="0.25" result="blur" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div
        onClick={() => interactive && setOpenDetail(true)}
        className={`group relative flex flex-col items-center justify-center overflow-hidden rounded-md border border-border/60 bg-white/80 p-1.5 transition-all hover:border-primary/50 dark:bg-slate-900/80 ${
          interactive ? "cursor-pointer hover:shadow-sm" : ""
        } ${className}`}
      >
        {/* Subtle handwritten background grid/line */}
        {showBaseline && (
          <div className="pointer-events-none absolute inset-x-2 bottom-3 border-b border-dashed border-slate-300/60 dark:border-slate-700/60" />
        )}

        {/* Digital Verification Stamp Background Seal */}
        {showSeal && (
          <div className="pointer-events-none absolute right-1 top-1 flex items-center gap-0.5 opacity-80">
            <ShieldCheck className="size-3.5 text-blue-600/70 dark:text-blue-400/70" />
          </div>
        )}

        {/* Handwritten Signature Canvas Image with Organic Ink Filter & Slight Natural Tilt */}
        <div className="relative flex w-full items-center justify-center">
          <img
            src={dataUrl}
            alt={signerName ? `امضای ${signerName}` : "امضا"}
            style={{
              filter: `url(#${filterId}) drop-shadow(0px 1px 1px ${ink.glow})`,
              transform: "rotate(-1.2deg)",
            }}
            className={`${heightClass} max-w-full object-contain transition-transform group-hover:scale-[1.03]`}
          />
        </div>

        {/* Subtitle / Signer Metadata */}
        {!compact && (signerName || role || date) && (
          <div className="mt-1 flex w-full items-center justify-between gap-1 text-[10px] text-muted-foreground border-t border-slate-100 dark:border-slate-800 pt-1">
            <div className="truncate font-medium text-foreground/80">
              {signerName} {role ? `(${role})` : ""}
            </div>
            {date && <div className="shrink-0 text-[9px] opacity-70">{date}</div>}
          </div>
        )}

        {/* Zoom Overlay on Hover */}
        {interactive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white/5">
            <ZoomIn className="size-4 text-primary opacity-80" />
          </div>
        )}
      </div>

      {/* Interactive Detail Modal for inspectable handwritten digital signature */}
      {interactive && (
        <Dialog open={openDetail} onOpenChange={setOpenDetail}>
          <DialogContent className="sm:max-w-md dir-rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-5 text-blue-600" />
                مشخصات امضای دیجیتال تاییدشده
              </DialogTitle>
              <DialogDescription>
                اطلاعات امنیتی و نمای واقعی امضای ثبت‌شده در سیستم
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Realistic Paper Container */}
              <div className="relative flex flex-col items-center justify-center rounded-lg border border-amber-200/60 bg-[#faf8f5] p-6 shadow-inner dark:border-slate-700 dark:bg-slate-950">
                <div className="absolute top-2 left-2">
                  <Badge variant="outline" className={`text-xs ${ink.badgeBg} ${ink.badgeText}`}>
                    {ink.title}
                  </Badge>
                </div>

                {/* Baseline Guide Line */}
                <div className="pointer-events-none absolute inset-x-8 bottom-10 border-b border-dashed border-blue-300/60 dark:border-blue-700/60" />

                <img
                  src={dataUrl}
                  alt="پیش‌نمایش امضا"
                  style={{
                    filter: `url(#${filterId}) drop-shadow(0px 2px 4px ${ink.glow})`,
                    transform: "rotate(-1.5deg)",
                  }}
                  className="h-28 max-w-full object-contain my-2"
                />

                <div className="mt-2 text-center text-xs text-muted-foreground font-mono">
                  [تاییدیه اصالت دیجیتال سیستم پرمیت PTW]
                </div>
              </div>

              {/* Metadata Details */}
              <div className="grid grid-cols-2 gap-2 text-xs rounded-md bg-muted/40 p-3">
                <div>
                  <span className="text-muted-foreground">نام امضاکننده:</span>
                  <p className="font-bold text-foreground">{signerName || "نامشخص"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">سمت / مرحله:</span>
                  <p className="font-medium text-foreground">{role || "مجوز کار"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">زمان ثبت امضا:</span>
                  <p className="font-medium text-foreground">{date || "ثبت‌شده در سیستم"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">وضعیت تاییدیه:</span>
                  <p className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    معتبر و تاییدشده
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
