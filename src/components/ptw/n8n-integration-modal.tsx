import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Workflow,
  Copy,
  Download,
  Send,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Smartphone,
  Cpu,
  Layers,
  FileCode2,
  Globe,
  Radio,
  KeyRound,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Settings } from "@/lib/ptw/types";
import {
  exportN8nWorkflowJsonString,
  downloadN8nWorkflowFile,
  deployWorkflowToN8nApi,
  generateDynamicN8nWorkflow,
} from "@/lib/ptw/n8n-generator";
import { testSmsIrConnection } from "@/lib/ptw/sms-ir";
import { pingN8nWebhook } from "@/lib/ptw/n8n";

interface N8nIntegrationModalProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
}

export function N8nIntegrationModal({
  open,
  onClose,
  settings,
  onUpdateSettings,
}: N8nIntegrationModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("template");
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    success: boolean;
    message: string;
    id?: string;
  } | null>(null);

  // وضعیت‌های تست sms.ir
  const [testMobile, setTestMobile] = useState("09121112233");
  const [testingSms, setTestingSms] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // وضعیت تست وب‌هوک n8n
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const workflowJsonStr = useMemo(() => {
    return exportN8nWorkflowJsonString(settings);
  }, [settings]);

  const workflowObj = useMemo(() => {
    return generateDynamicN8nWorkflow(settings);
  }, [settings]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(workflowJsonStr);
      setCopied(true);
      toast.success(
        "قالب ورک‌فلو n8n با موفقیت در حافظه کپی شد! می‌توانید آن را در n8n پیست کنید.",
      );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("خطا در کپی تمپلیت. لطفاً متن را دستی کپی کنید.");
    }
  };

  const handleDownload = () => {
    downloadN8nWorkflowFile(settings);
    toast.success(
      "فایل قالب n8n دانلود شد. در n8n از منوی Workflow > Import from file استفاده کنید.",
    );
  };

  const handleDeployToN8n = async () => {
    if (!settings.n8nInstanceUrl || !settings.n8nApiKey) {
      toast.error("لطفاً ابتدا در تب «تنظیمات سرور n8n»، آدرس سرور و کلید API را وارد نمایید.");
      setActiveTab("connection");
      return;
    }

    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await deployWorkflowToN8nApi(
        settings.n8nInstanceUrl,
        settings.n8nApiKey,
        settings,
      );
      setDeployResult({
        success: res.success,
        message: res.message,
        id: res.workflowId,
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در برقراری ارتباط با n8n";
      setDeployResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setDeploying(false);
    }
  };

  const handleTestSms = async () => {
    if (!settings.smsIr?.apiKey) {
      toast.error("لطفاً ابتدا کلید API سامانه sms.ir را وارد کنید.");
      return;
    }
    setTestingSms(true);
    setSmsTestResult(null);
    try {
      const res = await testSmsIrConnection(settings.smsIr, testMobile);
      setSmsTestResult({
        success: res.success,
        message: res.message,
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطای ناشناخته در ارسال پیامک";
      setSmsTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTestingSms(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!settings.n8nWebhookUrl) {
      toast.error("آدرس وب‌هوک n8n وارد نشده است.");
      return;
    }
    setTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await pingN8nWebhook(settings.n8nWebhookUrl, settings.n8nApiKey);
      setWebhookTestResult({
        success: res.success,
        message: res.message,
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "عدم امکان ارسال پینگ به وب‌هوک";
      setWebhookTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTestingWebhook(false);
    }
  };

  const stepsCount = settings.workflow?.length || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6" dir="rtl">
        <DialogHeader className="space-y-2 border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Workflow className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  اتصال خودکار به n8n و اطلاع‌رسانی پیامکی sms.ir
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  ساخت قالب اختصاصی n8n متناسب با مراحل تعریف‌شده پرمیت + ارسال پیامک به مسئولین با
                  sms.ir
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1 bg-primary/5 text-primary border-primary/20"
              >
                <Layers className="size-3.5" />
                {stepsCount} مرحله تایید فعال
              </Badge>
              {settings.smsIr?.enabled ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  sms.ir فعال
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground">
                  sms.ir غیرفعال
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="template" className="gap-1.5 text-xs">
              <Cpu className="size-4 text-primary" />
              تمپلیت اختصاصی n8n
            </TabsTrigger>
            <TabsTrigger value="sms_ir" className="gap-1.5 text-xs">
              <Smartphone className="size-4 text-blue-500" />
              تنظیمات پیامک sms.ir
            </TabsTrigger>
            <TabsTrigger value="connection" className="gap-1.5 text-xs">
              <Globe className="size-4 text-emerald-500" />
              سرور n8n و تست وب‌هوک
            </TabsTrigger>
          </TabsList>

          {/* ===================== TAB 1: TEMPLATE GENERATOR ===================== */}
          <TabsContent value="template" className="space-y-4 pt-1">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-xs leading-relaxed text-foreground space-y-2">
              <div className="flex items-center gap-2 font-bold text-primary text-sm">
                <Zap className="size-4" />
                تولید هوشمند تمپلیت n8n متناسب با ساختار کارخانه شما
              </div>
              <p>
                این تمپلیت به طور خودکار بر اساس <strong>{stepsCount} مرحله تایید</strong> تعریف‌شده
                در تنظیمات («{settings.workflow?.map((s) => s.roleTitle).join(" ⬅ ")}»)، کاربران،
                شرایط LOTO و کلیدهای سامانه <strong>sms.ir</strong> شخصی‌سازی شده است. با وارد کردن
                این تمپلیت در n8n، تمام گره‌های دریافت وب‌هوک، مسیریابی و ارسال پیامک فوری بدون نیاز
                به کدنویسی آماده اجرا خواهند بود.
              </p>
            </div>

            {/* کارت‌های خلاصه ویژگی‌های تمپلیت */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-border">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <Layers className="size-4" />
                    مراحل گردش کار
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    {stepsCount} مرحله امضا + انشعاب‌های صدور نهایی و رد پرمیت در Switch
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <Smartphone className="size-4" />
                    ارسال با sms.ir
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    گره‌های پیش‌پیکربندی‌شده HTTP Request با API رسمی sms.ir (Verify & Bulk)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" />
                    تایید ۱-کلیکه تعاملی
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    گره‌های Webhook و صفحه پاسخ HTML برای امضای سریع با لینک پیامک
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* دکمه‌های اقدام اصلی */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Button onClick={handleCopyJson} size="lg" className="gap-2 flex-1 min-w-[200px]">
                {copied ? (
                  <Check className="size-4 text-emerald-400" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "تمپلیت کپی شد!" : "کپی کد تمپلیت n8n (JSON)"}
              </Button>

              <Button
                onClick={handleDownload}
                variant="outline"
                size="lg"
                className="gap-2 flex-1 min-w-[180px]"
              >
                <Download className="size-4 text-primary" />
                دانلود فایل تمپلیت (.json)
              </Button>

              <Button
                onClick={handleDeployToN8n}
                disabled={deploying}
                variant="secondary"
                size="lg"
                className="gap-2"
              >
                <Send className="size-4 text-emerald-500" />
                {deploying ? "در حال ایجاد در n8n..." : "ایجاد خودکار در n8n با API"}
              </Button>
            </div>

            {deployResult && (
              <div
                className={`rounded-md p-3 text-xs flex items-center gap-2 ${
                  deployResult.success
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    : "bg-destructive/10 text-destructive border border-destructive/30"
                }`}
              >
                {deployResult.success ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{deployResult.message}</span>
              </div>
            )}

            {/* کادر پیش‌نمایش کد JSON */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold">
                  <FileCode2 className="size-3.5" />
                  پیش‌نمایش ساختار گره‌های n8n ({workflowObj.nodes.length} گره):
                </span>
                <span className="font-mono text-[11px]">Workflow Version: v1 (Active)</span>
              </div>
              <div className="relative">
                <textarea
                  readOnly
                  value={workflowJsonStr}
                  rows={8}
                  className="w-full rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground/80 focus:outline-none"
                  dir="ltr"
                />
              </div>
            </div>
          </TabsContent>

          {/* ===================== TAB 2: SMS.IR CONFIGURATION ===================== */}
          <TabsContent value="sms_ir" className="space-y-4 pt-1">
            <div className="flex items-center justify-between rounded-lg border border-border p-3.5 bg-card">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Smartphone className="size-4 text-blue-500" />
                  فعال‌سازی ارسال خودکار پیامک با سامانه sms.ir
                </Label>
                <p className="text-xs text-muted-foreground">
                  ارسال آنی پیامک نوبت امضا، صدور نهایی و کد OTP به تلفن همراه مسئولین از طریق
                  وب‌سرویس sms.ir
                </p>
              </div>
              <Switch
                checked={Boolean(settings.smsIr?.enabled)}
                onCheckedChange={(v) =>
                  onUpdateSettings({
                    ...settings,
                    smsIr: {
                      ...(settings.smsIr || {
                        enabled: false,
                        apiKey: "",
                        lineNumber: "",
                        sendMode: "verify_pattern",
                        templateId: "",
                        parameterNameOtp: "CODE",
                        parameterNamePermit: "NUMBER",
                        parameterNameSigner: "NAME",
                        parameterNameRole: "ROLE",
                        parameterNameLink: "LINK",
                      }),
                      enabled: v,
                    },
                  })
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  کلید API سامانه sms.ir (x-api-key) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  value={settings.smsIr?.apiKey || ""}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      smsIr: {
                        ...(settings.smsIr || {
                          enabled: true,
                          apiKey: "",
                          lineNumber: "",
                          sendMode: "verify_pattern",
                          templateId: "",
                        }),
                        apiKey: e.target.value,
                      },
                    })
                  }
                  placeholder="کلید API دریافت شده از پنل sms.ir"
                  className="font-mono text-xs dir-ltr text-center"
                />
                <p className="text-[11px] text-muted-foreground">
                  از منوی «برنامه‌نویسان / کلیدهای API» در پنل sms.ir قابل دریافت است.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">شیوه ارسال پیامک</Label>
                <select
                  value={settings.smsIr?.sendMode || "verify_pattern"}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      smsIr: {
                        ...(settings.smsIr || { enabled: true, apiKey: "" }),
                        sendMode: e.target.value as "verify_pattern" | "bulk_text",
                      },
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="verify_pattern">
                    الگوی سریع (Fast Pattern / Verify) — سرعت ۱ ثانیه‌ای و بدون مسدودی بلک‌لیست
                  </option>
                  <option value="bulk_text">خط اختصاصی / متن آزاد (Bulk / Live)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  پیشنهاد: حالت «الگوی سریع» برای خطوط مسدود بلک‌لیست تبلیغاتی به طور ۱۰۰٪ تحویل
                  می‌شود.
                </p>
              </div>
            </div>

            {settings.smsIr?.sendMode === "verify_pattern" ? (
              <div className="rounded-lg border border-border p-3.5 bg-muted/20 space-y-3">
                <div className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  تنظیمات شناسه قالب و متغیرهای الگو (Template Parameters)
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      شناسه قالب در sms.ir (Template ID) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={settings.smsIr?.templateId || ""}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          smsIr: {
                            ...(settings.smsIr || {
                              enabled: true,
                              apiKey: "",
                              sendMode: "verify_pattern",
                            }),
                            templateId: e.target.value,
                          },
                        })
                      }
                      placeholder="مثال: 100254"
                      className="font-mono text-xs dir-ltr text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">نام متغیر نام مخاطب در الگو</Label>
                    <Input
                      value={settings.smsIr?.parameterNameSigner || "NAME"}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          smsIr: {
                            ...(settings.smsIr || {
                              enabled: true,
                              apiKey: "",
                              sendMode: "verify_pattern",
                            }),
                            parameterNameSigner: e.target.value,
                          },
                        })
                      }
                      placeholder="NAME"
                      className="font-mono text-xs dir-ltr text-center"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div>
                    <Label className="text-[11px]">متغیر شماره پرمیت</Label>
                    <Input
                      value={settings.smsIr?.parameterNamePermit || "NUMBER"}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          smsIr: {
                            ...(settings.smsIr || {
                              enabled: true,
                              apiKey: "",
                              sendMode: "verify_pattern",
                            }),
                            parameterNamePermit: e.target.value,
                          },
                        })
                      }
                      placeholder="NUMBER"
                      className="font-mono text-xs dir-ltr text-center mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">متغیر نقش / سمت</Label>
                    <Input
                      value={settings.smsIr?.parameterNameRole || "ROLE"}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          smsIr: {
                            ...(settings.smsIr || {
                              enabled: true,
                              apiKey: "",
                              sendMode: "verify_pattern",
                            }),
                            parameterNameRole: e.target.value,
                          },
                        })
                      }
                      placeholder="ROLE"
                      className="font-mono text-xs dir-ltr text-center mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">متغیر لینک تایید یا کد</Label>
                    <Input
                      value={settings.smsIr?.parameterNameLink || "LINK"}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          smsIr: {
                            ...(settings.smsIr || {
                              enabled: true,
                              apiKey: "",
                              sendMode: "verify_pattern",
                            }),
                            parameterNameLink: e.target.value,
                          },
                        })
                      }
                      placeholder="LINK یا CODE"
                      className="font-mono text-xs dir-ltr text-center mt-1"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">شماره خط فرستنده اختصاصی (اختیاری)</Label>
                <Input
                  value={settings.smsIr?.lineNumber || ""}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      smsIr: {
                        ...(settings.smsIr || { enabled: true, apiKey: "", sendMode: "bulk_text" }),
                        lineNumber: e.target.value,
                      },
                    })
                  }
                  placeholder="30007732 یا شماره اختصاصی خط شما"
                  className="font-mono text-xs dir-ltr text-center"
                />
              </div>
            )}

            {/* کادر آزمایش زنده ارسال پیامک */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Radio className="size-4 animate-pulse" />
                آزمایش زنده ارسال پیامک با سرور sms.ir
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={testMobile}
                  onChange={(e) => setTestMobile(e.target.value)}
                  placeholder="09121234567"
                  className="font-mono text-xs dir-ltr text-center max-w-[200px]"
                />
                <Button
                  onClick={handleTestSms}
                  disabled={testingSms || !settings.smsIr?.apiKey}
                  size="sm"
                  className="gap-1.5"
                >
                  <Send className="size-3.5" />
                  {testingSms ? "در حال ارسال تست..." : "ارسال پیامک آزمایشی به شماره بالا"}
                </Button>
              </div>

              {smsTestResult && (
                <div
                  className={`rounded-md p-2.5 text-xs flex items-center gap-2 ${
                    smsTestResult.success
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {smsTestResult.success ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0" />
                  )}
                  <span>{smsTestResult.message}</span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===================== TAB 3: N8N CONNECTION & WEBHOOK TEST ===================== */}
          <TabsContent value="connection" className="space-y-4 pt-1">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  آدرس وب‌هوک شنونده رویدادهای n8n (Webhook URL)
                </Label>
                <Input
                  value={settings.n8nWebhookUrl || ""}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      n8nWebhookUrl: e.target.value,
                    })
                  }
                  placeholder="https://n8n.your-company.com/webhook/ptw-permit-status-changed"
                  className="font-mono text-xs dir-ltr text-right"
                />
                <p className="text-[11px] text-muted-foreground">
                  آدرس تولیدشده در گره اول تمپلیت n8n (Webhook Trigger) را در این فیلد قرار دهید.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    آدرس سرور اصلی n8n (Instance URL جهت ایجاد خودکار)
                  </Label>
                  <Input
                    value={settings.n8nInstanceUrl || ""}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        n8nInstanceUrl: e.target.value,
                      })
                    }
                    placeholder="https://n8n.your-company.com"
                    className="font-mono text-xs dir-ltr text-right"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    کلید دسترسی API سرور n8n (N8N_API_KEY)
                  </Label>
                  <Input
                    type="password"
                    value={settings.n8nApiKey || ""}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        n8nApiKey: e.target.value,
                      })
                    }
                    placeholder="ptw_secret_token یا n8n_api_..."
                    className="font-mono text-xs dir-ltr text-center"
                  />
                </div>
              </div>

              {/* کادر تست وب‌هوک */}
              <div className="rounded-lg border border-border p-3.5 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Radio className="size-4 text-primary animate-pulse" />
                    راستی‌آزمایی و ارسال پینگ تستی به وب‌هوک n8n
                  </span>
                  <Button
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !settings.n8nWebhookUrl}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Send className="size-3.5" />
                    {testingWebhook ? "در حال ارسال..." : "ارسال پیام پینگ آزمایشی"}
                  </Button>
                </div>

                {webhookTestResult && (
                  <div
                    className={`rounded-md p-2.5 text-xs flex items-center gap-2 ${
                      webhookTestResult.success
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {webhookTestResult.success ? (
                      <CheckCircle2 className="size-4 shrink-0" />
                    ) : (
                      <AlertCircle className="size-4 shrink-0" />
                    )}
                    <span>{webhookTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* راهنمای گام به گام */}
              <div className="rounded-lg border border-border p-3.5 bg-card space-y-2 text-xs leading-relaxed text-muted-foreground">
                <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <KeyRound className="size-4 text-amber-500" />
                  راهنمای سریع فعال‌سازی در ۳ مرحله:
                </div>
                <ol className="list-decimal list-inside space-y-1 pr-1">
                  <li>
                    در تب اول، دکمه <strong>«کپی کد تمپلیت n8n»</strong> یا{" "}
                    <strong>«دانلود فایل»</strong> را بزنید.
                  </li>
                  <li>
                    در نرم‌افزار n8n، ورک‌فلو جدیدی باز کرده و آن را پیست کنید (یا از منو Import
                    from File بزنید).
                  </li>
                  <li>
                    روی گره Webhook در n8n دوبار کلیک کرده، آدرس Production Webhook URL را کپی و در
                    فیلد بالای این تب قرار دهید و ورک‌فلو را در n8n <strong>Active</strong> نمایید.
                  </li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
