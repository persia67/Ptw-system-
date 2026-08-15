import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  Upload,
  Download,
  RefreshCw,
  Link2,
  Unlink,
  FolderOpen,
  ShieldCheck,
  Info,
} from "lucide-react";
import { AboutModal } from "@/components/ptw/about-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { usePtwDb } from "@/lib/ptw/use-ptw";
import { PERMIT_TYPES } from "@/lib/ptw/defaults";
import { exportDb, importDbFromFile } from "@/lib/ptw/storage";
import {
  DEFAULT_SYNC_PREFS,
  forgetSharedFile,
  getSharedHandle,
  isSyncSupported,
  loadSyncPrefs,
  pickSharedFile,
  saveSyncPrefs,
  type SyncPrefs,
} from "@/lib/ptw/sync";
import { toJalaliDateTime } from "@/lib/ptw/date";
import { uid } from "@/lib/ptw/workflow";
import type { Settings, WorkflowStep, PermitTypeId, MessengerChannel } from "@/lib/ptw/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "تنظیمات سامانه مجوز کار | PTW" },
      {
        name: "description",
        content: "تنظیم نام شرکت، واحدها، مراحل گردش تایید، مدت اعتبار و پشتیبان‌گیری داده‌ها.",
      },
      { property: "og:title", content: "تنظیمات سامانه مجوز کار | PTW" },
      { property: "og:description", content: "پیکربندی گردش کار و مراحل امضای مجوزها." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { db, ready, updateSettings, replaceDb, sync, runSync } = usePtwDb();
  const [s, setS] = useState<Settings>(db.settings);
  const [newUnit, setNewUnit] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [prefs, setPrefs] = useState<SyncPrefs>(DEFAULT_SYNC_PREFS);
  const [supported, setSupported] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (ready && !initialized) {
      setS(db.settings);
      setInitialized(true);
    }
  }, [ready, initialized, db.settings]);

  useEffect(() => {
    setSupported(isSyncSupported());
    setPrefs(loadSyncPrefs());
    void getSharedHandle().then((h) => {
      if (h) setPrefs((p) => ({ ...p, fileName: h.name }));
    });
  }, []);

  const patchPrefs = (patch: Partial<SyncPrefs>) => {
    const next = { ...loadSyncPrefs(), ...patch };
    saveSyncPrefs(next);
    setPrefs(next);
  };

  const connect = async (create: boolean) => {
    try {
      const handle = await pickSharedFile(create);
      patchPrefs({ fileName: handle.name });
      await runSync(false);
      toast.success("فایل اشتراکی متصل شد و همگام‌سازی انجام گرفت");
    } catch (e) {
      const msg = (e as Error).message;
      if (!/abort/i.test(msg)) toast.error(msg || "اتصال به فایل اشتراکی ناموفق بود");
    }
  };

  const patchStep = (id: string, patch: Partial<WorkflowStep>) =>
    setS((v) => ({
      ...v,
      workflow: v.workflow.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));

  const move = (index: number, dir: -1 | 1) =>
    setS((v) => {
      const w = [...v.workflow];
      const j = index + dir;
      if (j < 0 || j >= w.length) return v;
      [w[index], w[j]] = [w[j], w[index]];
      return { ...v, workflow: w };
    });

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">تنظیمات سامانه</h1>
        <Button
          onClick={() => {
            updateSettings(s);
            toast.success("تنظیمات ذخیره شد");
          }}
        >
          <Save className="size-4" />
          ذخیره تنظیمات
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اطلاعات سازمان و کاربر جاری</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>نام شرکت</Label>
            <Input
              value={s.companyName}
              onChange={(e) => setS({ ...s, companyName: e.target.value })}
              maxLength={120}
            />
          </div>
          <div>
            <Label>نام کارخانه / سایت</Label>
            <Input
              value={s.plantName}
              onChange={(e) => setS({ ...s, plantName: e.target.value })}
              maxLength={120}
            />
          </div>
          <div>
            <Label>نام کاربر جاری (ثبت‌کننده رویدادها)</Label>
            <Input
              value={s.currentUser.name}
              onChange={(e) =>
                setS({ ...s, currentUser: { ...s.currentUser, name: e.target.value } })
              }
              maxLength={80}
            />
          </div>
          <div>
            <Label>سمت کاربر جاری</Label>
            <Input
              value={s.currentUser.position}
              onChange={(e) =>
                setS({ ...s, currentUser: { ...s.currentUser, position: e.target.value } })
              }
              maxLength={80}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">واحدها و خطوط تولید</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {s.units.map((u) => (
              <span
                key={u}
                className="flex items-center gap-2 rounded border border-border px-2 py-1 text-sm"
              >
                {u}
                <button
                  type="button"
                  onClick={() => setS({ ...s, units: s.units.filter((x) => x !== u) })}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="افزودن واحد جدید"
              maxLength={80}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!newUnit.trim()) return;
                setS({ ...s, units: [...s.units, newUnit.trim()] });
                setNewUnit("");
              }}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 text-primary" />
            فهرست مسئولین و مدیران دارای حق امضا (اطلاعات ورود، PIN و پیام‌رسان OTP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            برای هر یک از اعضای مجاز، نام کاربری، کلمه عبور، PIN اختصاصی و شماره تماس/آیدی پیام‌رسان
            (جهت ارسال کد یکبار مصرف OTP به ایتا، بله، واتساپ، تلگرام یا پیامک) را تنظیم فرمایید.
          </p>
          {(s.people || []).map((p, i) => (
            <div
              key={i}
              className="space-y-3 rounded-md border border-border bg-card p-3 text-sm shadow-sm"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs font-semibold">نام و نام خانوادگی *</Label>
                  <Input
                    value={p.name}
                    onChange={(e) => {
                      const next = [...(s.people || [])];
                      next[i].name = e.target.value;
                      setS({ ...s, people: next });
                    }}
                    maxLength={60}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">سمت سازمانی / مسئولیت *</Label>
                  <Input
                    value={p.position}
                    onChange={(e) => {
                      const next = [...(s.people || [])];
                      next[i].position = e.target.value;
                      setS({ ...s, people: next });
                    }}
                    maxLength={60}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">شماره همراه / آیدی جهت دریافت OTP</Label>
                  <Input
                    value={p.phone || p.messengerTarget || ""}
                    placeholder="09123456789"
                    onChange={(e) => {
                      const next = [...(s.people || [])];
                      next[i].phone = e.target.value;
                      next[i].messengerTarget = e.target.value;
                      setS({ ...s, people: next });
                    }}
                    maxLength={30}
                    className="font-mono dir-ltr text-right"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4 items-end">
                <div>
                  <Label className="text-xs font-semibold">نام کاربری ورود</Label>
                  <Input
                    value={p.username || ""}
                    placeholder="مثلا: hse_mgr"
                    onChange={(e) => {
                      const next = [...(s.people || [])];
                      next[i].username = e.target.value;
                      setS({ ...s, people: next });
                    }}
                    maxLength={40}
                    className="font-mono dir-ltr text-right"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">کلمه عبور ورود</Label>
                  <Input
                    type="password"
                    value={p.password || ""}
                    placeholder="پیش‌فرض: 123"
                    onChange={(e) => {
                      const next = [...(s.people || [])];
                      next[i].password = e.target.value;
                      setS({ ...s, people: next });
                    }}
                    maxLength={40}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">رمز امنیتی PIN (اختیاری)</Label>
                  <Input
                    type="password"
                    value={p.pin || ""}
                    placeholder="****"
                    onChange={(e) => {
                      const next = [...(s.people || [])];
                      next[i].pin = e.target.value;
                      setS({ ...s, people: next });
                    }}
                    maxLength={10}
                    className="font-mono text-center tracking-widest"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex-1">
                    <Label className="text-xs font-semibold">پیام‌رسان ترجیحی</Label>
                    <select
                      value={p.preferredMessenger || "eitaa"}
                      onChange={(e) => {
                        const next = [...(s.people || [])];
                        next[i].preferredMessenger = e.target.value as MessengerChannel;
                        setS({ ...s, people: next });
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="eitaa">ایتا (Eitaa)</option>
                      <option value="bale">بله (Bale)</option>
                      <option value="whatsapp">واتساپ (WhatsApp)</option>
                      <option value="telegram">تلگرام (Telegram)</option>
                      <option value="sms">پیامک (SMS)</option>
                    </select>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    type="button"
                    onClick={() => setS({ ...s, people: s.people.filter((_, idx) => idx !== i) })}
                    title="حذف مسئول"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setS({
                ...s,
                people: [
                  ...(s.people || []),
                  {
                    name: "مسئول جدید",
                    position: "کارشناس ایمنی",
                    phone: "09123456789",
                    username: "",
                    password: "123",
                    pin: "",
                    preferredMessenger: "eitaa",
                  },
                ],
              })
            }
          >
            <Plus className="size-4" />
            افزودن مدیر / مسئول مجاز
          </Button>
        </CardContent>
      </Card>

      {/* تنظیمات احراز هویت دو مرحله‌ای OTP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 text-emerald-600" />
            تنظیمات سامانه احراز هویت پیام‌رسانی (OTP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
            <div>
              <div className="text-sm font-bold">الزام ارسال کد تایید OTP هنگام ثبت امضا</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                در صورت فعال‌سازی، امضاکننده برای نهایی‌سازی امضای مجوز کار باید کد چندرقمی
                ارسال‌شده به پیام‌رسان (ایتا، بله، واتساپ، تلگرام) را وارد نماید.
              </div>
            </div>
            <Switch
              checked={s.otpConfig?.enabled ?? false}
              onCheckedChange={(checked) =>
                setS({
                  ...s,
                  otpConfig: {
                    ...(s.otpConfig || {
                      enabled: false,
                      defaultMessenger: "eitaa",
                      codeLength: 5,
                      expireSeconds: 120,
                    }),
                    enabled: checked,
                  },
                })
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs font-semibold">پیام‌رسان پیش‌فرض ارسال کد</Label>
              <select
                value={s.otpConfig?.defaultMessenger || "eitaa"}
                onChange={(e) =>
                  setS({
                    ...s,
                    otpConfig: {
                      ...(s.otpConfig || {
                        enabled: false,
                        defaultMessenger: "eitaa",
                        codeLength: 5,
                        expireSeconds: 120,
                      }),
                      defaultMessenger: e.target.value as MessengerChannel,
                    },
                  })
                }
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="eitaa">پیام‌رسان ایتا (Eitaa)</option>
                <option value="bale">پیام‌رسان بله (Bale)</option>
                <option value="whatsapp">واتساپ (WhatsApp)</option>
                <option value="telegram">تلگرام (Telegram)</option>
                <option value="sms">سامانه پیامکی SMS</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">تعداد ارقام کد OTP</Label>
              <select
                value={s.otpConfig?.codeLength || 5}
                onChange={(e) =>
                  setS({
                    ...s,
                    otpConfig: {
                      ...(s.otpConfig || {
                        enabled: false,
                        defaultMessenger: "eitaa",
                        codeLength: 5,
                        expireSeconds: 120,
                      }),
                      codeLength: Number(e.target.value),
                    },
                  })
                }
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-mono"
              >
                <option value={4}>۴ رقمی</option>
                <option value={5}>۵ رقمی (استاندارد)</option>
                <option value={6}>۶ رقمی (حداکثر امنیت)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">مدت زمان اعتبار کد (ثانیه)</Label>
              <Input
                type="number"
                value={s.otpConfig?.expireSeconds || 120}
                onChange={(e) =>
                  setS({
                    ...s,
                    otpConfig: {
                      ...(s.otpConfig || {
                        enabled: false,
                        defaultMessenger: "eitaa",
                        codeLength: 5,
                        expireSeconds: 120,
                      }),
                      expireSeconds: Number(e.target.value) || 120,
                    },
                  })
                }
                className="mt-1 font-mono"
                min={30}
                max={600}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">
              آدرس وب‌هوک ارسال خودکار (Webhook URL اختیاری)
            </Label>
            <Input
              value={s.otpConfig?.webhookUrl || ""}
              onChange={(e) =>
                setS({
                  ...s,
                  otpConfig: {
                    ...(s.otpConfig || {
                      enabled: false,
                      defaultMessenger: "eitaa",
                      codeLength: 5,
                      expireSeconds: 120,
                    }),
                    webhookUrl: e.target.value,
                  },
                })
              }
              placeholder="https://api.example.com/send-otp (جهت اتصال مستقیم به ربات ایتا/بله یا پنل SMS)"
              className="mt-1 font-mono text-xs dir-ltr text-right"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="size-5 text-primary" />
            تنظیمات اتصال به n8n و گردش کار خودکار (n8n Webhook Integration)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            با پیکربندی این بخش، تمام رویدادهای ثبت، تغییر وضعیت و امضای مجوزها متصاعدشده (Event:{" "}
            <code>PermitStatusChanged</code>) و به آدرس وب‌هوک n8n ارسال می‌شود تا اعلان‌ها و
            فرآیندهای تایید خودکار در پیام‌رسان‌ها / ایمیل انجام پذیرد.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold">
                آدرس وب‌هوک اصلی n8n (N8N_WEBHOOK_URL)
              </Label>
              <Input
                value={s.n8nWebhookUrl || ""}
                onChange={(e) => setS({ ...s, n8nWebhookUrl: e.target.value })}
                placeholder="https://n8n.your-company.com/webhook/ptw-permit-status-changed"
                className="mt-1 font-mono text-xs dir-ltr text-right"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">
                کلید یا توکن احراز هویت API n8n (N8N_API_KEY)
              </Label>
              <Input
                type="password"
                value={s.n8nApiKey || ""}
                onChange={(e) => setS({ ...s, n8nApiKey: e.target.value })}
                placeholder="ptw_n8n_secret_token_2026"
                className="mt-1 font-mono text-xs dir-ltr text-center"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مراحل گردش تایید و امضا</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {s.workflow.map((w, i) => (
            <div key={w.id} className="space-y-3 rounded-md border border-border p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">عنوان مرحله</Label>
                  <Input
                    value={w.title}
                    onChange={(e) => patchStep(w.id, { title: e.target.value })}
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label className="text-xs">سمت تاییدکننده</Label>
                  <Input
                    value={w.roleTitle}
                    onChange={(e) => patchStep(w.id, { roleTitle: e.target.value })}
                    maxLength={120}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5">
                  <Checkbox
                    checked={Boolean(w.onlyIfLoto)}
                    onCheckedChange={(v) => patchStep(w.id, { onlyIfLoto: Boolean(v) })}
                  />
                  فقط وقتی مجوز LOTO دارد
                </label>
                <span className="text-muted-foreground">فقط برای انواع:</span>
                {PERMIT_TYPES.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5">
                    <Checkbox
                      checked={w.onlyForTypes.includes(t.id)}
                      onCheckedChange={(v) =>
                        patchStep(w.id, {
                          onlyForTypes: v
                            ? [...w.onlyForTypes, t.id]
                            : w.onlyForTypes.filter((x) => x !== t.id),
                        })
                      }
                    />
                    {t.short}
                  </label>
                ))}
                <span className="text-muted-foreground">(خالی = همه انواع)</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => move(i, -1)}>
                  بالا
                </Button>
                <Button size="sm" variant="outline" onClick={() => move(i, 1)}>
                  پایین
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setS({ ...s, workflow: s.workflow.filter((x) => x.id !== w.id) })}
                >
                  <Trash2 className="size-4 text-destructive" />
                  حذف مرحله
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setS({
                ...s,
                workflow: [
                  ...s.workflow,
                  {
                    id: uid(),
                    title: "مرحله جدید",
                    roleTitle: "سمت تاییدکننده",
                    required: true,
                    onlyForTypes: [],
                  },
                ],
              })
            }
          >
            <Plus className="size-4" />
            افزودن مرحله
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مدت اعتبار پیش‌فرض (ساعت)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {PERMIT_TYPES.map((t) => (
            <div key={t.id}>
              <Label className="text-xs">{t.short}</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={s.defaultDurationHours[t.id as PermitTypeId]}
                onChange={(e) =>
                  setS({
                    ...s,
                    defaultDurationHours: {
                      ...s.defaultDurationHours,
                      [t.id]: Number(e.target.value) || 8,
                    },
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فایل اشتراکی پرمیت‌ها (کار هم‌زمان چند کاربر)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            یک فایل واحد روی درایو اشتراکی (مثلاً <span dir="ltr">\\server\HSE\PTW</span>) بسازید و
            آدرس‌دهی کنید؛ همه سیستم‌های تاییدکننده همان فایل را انتخاب می‌کنند. برنامه به‌صورت
            دوره‌ای اطلاعات را با آن فایل ادغام می‌کند، بنابراین چند نفر می‌توانند هم‌زمان روی
            پرمیت‌ها کار کنند و آخرین ویرایش هر پرمیت برای همه دیده می‌شود.
          </p>

          {!supported && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              مرورگر فعلی از اتصال مستقیم به فایل پشتیبانی نمی‌کند. لطفاً از Google Chrome یا
              Microsoft Edge روی ویندوز استفاده کنید؛ در غیر این صورت از پشتیبان‌گیری دستی پایین
              همین صفحه استفاده کنید.
            </p>
          )}

          <div className="rounded-md border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                وضعیت اتصال:{" "}
                {prefs.fileName ? (
                  <span className="font-semibold text-primary">متصل به «{prefs.fileName}»</span>
                ) : (
                  <span className="text-muted-foreground">متصل نیست</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {sync.lastSyncAt
                  ? `آخرین همگام‌سازی: ${toJalaliDateTime(sync.lastSyncAt)}`
                  : "هنوز همگام‌سازی نشده"}
              </span>
            </div>
            {sync.error && <p className="mt-2 text-xs text-destructive">خطا: {sync.error}</p>}
          </div>

          <div>
            <Label>مسیر فایل اشتراکی (یادداشت برای سایر کاربران)</Label>
            <Input
              dir="ltr"
              value={prefs.hintPath}
              placeholder="\\\\server\\HSE\\PTW\\ptw-shared.json"
              onChange={(e) => patchPrefs({ hintPath: e.target.value })}
              maxLength={260}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              این مسیر فقط برای راهنمایی کاربران است؛ برای اتصال واقعی، دکمه‌های زیر همان فایل را در
              درایو اشتراکی انتخاب می‌کنند.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!supported} onClick={() => connect(true)}>
              <Link2 className="size-4" />
              ساخت فایل اشتراکی جدید
            </Button>
            <Button variant="outline" disabled={!supported} onClick={() => connect(false)}>
              <FolderOpen className="size-4" />
              اتصال به فایل اشتراکی موجود
            </Button>
            <Button
              variant="outline"
              disabled={!prefs.fileName || sync.busy}
              onClick={async () => {
                await runSync(false);
                toast.success("همگام‌سازی انجام شد");
              }}
            >
              <RefreshCw className={`size-4 ${sync.busy ? "animate-spin" : ""}`} />
              همگام‌سازی فوری
            </Button>
            <Button
              variant="ghost"
              disabled={!prefs.fileName}
              onClick={async () => {
                await forgetSharedFile();
                patchPrefs({ fileName: null });
                toast.success("اتصال فایل اشتراکی قطع شد");
              }}
            >
              <Unlink className="size-4 text-destructive" />
              قطع اتصال
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={prefs.auto}
                onCheckedChange={(v) => patchPrefs({ auto: Boolean(v) })}
              />
              همگام‌سازی خودکار
            </label>
            <div className="flex items-center gap-2 text-sm">
              <Label className="text-xs">فاصله همگام‌سازی (ثانیه)</Label>
              <Input
                type="number"
                min={5}
                max={300}
                className="w-24"
                value={prefs.intervalSec}
                onChange={(e) =>
                  patchPrefs({ intervalSec: Math.max(5, Number(e.target.value) || 15) })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">پشتیبان‌گیری و انتقال بایگانی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            اطلاعات روی همین دستگاه ذخیره می‌شود. برای نگهداری در درایو اشتراکی واحد ایمنی، فایل
            پشتیبان را دریافت و روی درایو ذخیره کنید؛ روی هر دستگاه دیگر همان فایل را بارگذاری کنید.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportDb(db)}>
              <Download className="size-4" />
              دریافت فایل پشتیبان
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              بارگذاری فایل پشتیبان
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const next = await importDbFromFile(file);
                  replaceDb(next);
                  toast.success("بایگانی بازیابی شد");
                } catch (err) {
                  toast.error((err as Error).message);
                }
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Info className="size-4 text-primary" />
              درباره نرم‌افزار و به‌روزرسانی‌ها
            </span>
            <span className="text-xs font-mono font-semibold text-primary">v1.2.9</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            جهت مشاهده گزارش تغییرات آخرین نسخه‌ها، اطلاعات سیستم و لینک‌های مستقیم دانلود فایل نصبی
            اندروید (APK) و ویندوز (EXE/MSI)، روی دکمه زیر کلیک نمایید.
          </p>
          <Button onClick={() => setAboutOpen(true)} className="gap-2">
            <Info className="size-4" />
            مشاهده اطلاعات و به‌روزرسانی‌ها
          </Button>
        </CardContent>
      </Card>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
