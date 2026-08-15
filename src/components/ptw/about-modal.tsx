import {
  Info,
  Download,
  ShieldCheck,
  Smartphone,
  Monitor,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  HardHat,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  const currentVersion = "v1.2.9";
  const githubReleaseUrl = "https://github.com/rafiyanhamid1989/Ptw-system-/releases/latest";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-sans dir-rtl text-right">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <HardHat className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold">
                  درباره سامانه PTW و به‌روزرسانی‌ها
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="border-primary/40 text-primary font-mono text-xs"
                >
                  {currentVersion}
                </Badge>
              </div>
              <DialogDescription className="mt-1 text-xs text-muted-foreground">
                سامانه هوشمند مدیریت مجوزهای کار (PTW) و قفل و برچسب (LOTO) واحد ایمنی و بهداشت
                حرفه‌ای
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* کارت لینک‌های دانلود مستقیم */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Download className="size-4 text-primary" />
                دریافت مستقیم نسخه‌های نصبی نرم‌افزار
              </div>
              <span className="text-xs text-muted-foreground font-semibold">
                اماده دانلود آفلاین
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              با هر بار به‌روزرسانی در مخزن گیتهاب، نسخه‌های نصبی اندروید و ویندوز به صورت کاملاً
              خودکار کامپایل شده و آماده دانلود می‌باشند.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href={githubReleaseUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 text-xs font-semibold text-foreground transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-emerald-600" />
                  <span>نسخه اندروید (.apk)</span>
                </div>
                <ExternalLink className="size-3.5 text-muted-foreground" />
              </a>

              <a
                href={githubReleaseUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 text-xs font-semibold text-foreground transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-2">
                  <Monitor className="size-4 text-blue-600" />
                  <span>نسخه ویندوز Tauri v2 & Electron</span>
                </div>
                <ExternalLink className="size-3.5 text-muted-foreground" />
              </a>
            </div>

            <div className="pt-2 text-center">
              <Button asChild size="sm" className="w-full gap-2">
                <a href={githubReleaseUrl} target="_blank" rel="noreferrer">
                  <Download className="size-4" />
                  مشاهده تمام فایل‌های خروجی در صفحه GitHub Releases
                </a>
              </Button>
            </div>
          </div>

          {/* گزارش تغییرات و تاریخچه به‌روزرسانی‌ها */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="size-4 text-amber-500" />
              توضیحات و گزارش تغییرات آخرین نسخه‌ها
            </h4>

            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    نسخه v1.2.9 — بهینه‌سازی زنجیره بیلد، مسیردهی و پایداری کامل
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">آخرین نسخه</span>
                </div>
                <p className="pt-1 text-muted-foreground leading-relaxed">
                  • تنظیم دقیق ترتیب اجرای اسکریپت‌های بیلد و تولید خروجی استاتیک.
                  <br />
                  • اصلاح مسیردهی داخلی و رفع کامل فریز در صفحات صدور مجوز و تنظیمات.
                  <br />• ایمن‌سازی کامل مبدل تاریخ و تقویم جلالی در ورودی‌های زمان.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    نسخه v1.2.8 — رفع مشکل فریز شدن صفحات صدور مجوز و تنظیمات
                  </span>
                </div>
                <p className="pt-1 text-muted-foreground leading-relaxed">
                  • رفع کامل خطای `(0, createRoot) is not a function` و تثبیت رندرینگ ری‌اکت در نسخه
                  استاتیک.
                  <br />
                  • اصلاح لودر روتر در حالت آفلاین برای انتقال و تغییر صفحات بدون فریز شدن برنامه.
                  <br />• بهبود پایداری کارکرد سامانه در تمامی بسترهای ویندوز و اندروید.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    نسخه v1.2.7 — رفع کامل مشکل صفحه سفید در Tauri v2 & ویندوز
                  </span>
                </div>
                <p className="pt-1 text-muted-foreground leading-relaxed">
                  • بهبود تشخیص پروتکل‌های محلی Tauri v2 (`tauri://` و `tauri.localhost`) در روتر
                  برنامه.
                  <br />
                  • اصلاح خطای کامپایل آیکون‌های ویندوز (RC2176 و DataView Offset) در فرآیند
                  آماده‌سازی توری.
                  <br />• افزودن لودر اولیه و صفحه‌بندی خطای هوشمند جهت جلوگیری از رندر صفحه سفید در
                  تمام بسترهای نصبی.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    نسخه v1.2.6 — افزودن Tauri v2 & گردآوری به‌روزرسانی‌ها
                  </span>
                </div>
                <p className="pt-1 text-muted-foreground leading-relaxed">
                  • اضافه شدن فریم‌ورک فوق‌العاده سبک Tauri v2 جهت اجرا پرسرعت دسکتاپ ویندوز.
                  <br />
                  • تجمیع تمامی بخش‌ها و اطلاعات مربوط به دانلود و به‌روزرسانی در پنجره یکپارچه
                  درباره نرم‌افزار.
                  <br />• ساخت خودکار و همزمان فایل‌های نصبی Windows (.exe & .msi) و Android (.apk).
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    نسخه v1.2.5 — حل مشکل صفحه سفید (White Screen)
                  </span>
                </div>
                <p className="pt-1 text-muted-foreground leading-relaxed">
                  • رفع مشکل عدم نمایش محتوا بعد از نصب در اپلیکیشن اندروید و ویندوز.
                  <br />• پیکربندی مسیریابی Hash Router و لودرهای محلی فایل‌های استاتیک جهت اجرای
                  ۱۰۰٪ آفلاین.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-blue-600" />
                    نسخه v1.2.0 — امضای دیجیتال و پلمپ امنیتی
                  </span>
                </div>
                <p className="pt-1 text-muted-foreground leading-relaxed">
                  • پشتیبانی از کد PIN، امضای دیجیتال لمسی و پلمپ امنیتی با هش SHA-256 جهت جلوگیری
                  از دستکاری مجوزهای صادره.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between border-t border-border pt-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            واحد ایمنی، بهداشت و محیط زیست (HSE)
          </div>
          <Button variant="outline" onClick={onClose} size="sm">
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
