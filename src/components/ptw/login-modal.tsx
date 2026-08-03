import { useState } from "react";
import { toast } from "sonner";
import {
  LogIn,
  UserCheck,
  KeyRound,
  ShieldAlert,
  User,
  Sparkles,
  CheckCircle2,
  Lock,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePtwDb } from "@/lib/ptw/use-ptw";
import type { Person } from "@/lib/ptw/types";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { db, updateSettings } = usePtwDb();
  const people = db.settings.people || [];

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) return toast.error("لطفا نام کاربری را وارد نمایید");

    // جستجوی کاربر در لیست اشخاص تعریف شده
    const matched = people.find(
      (p) =>
        (p.username && p.username.trim().toLowerCase() === username.trim().toLowerCase()) ||
        p.name.trim().toLowerCase() === username.trim().toLowerCase(),
    );

    if (matched) {
      if (matched.password && matched.password !== password) {
        return toast.error("کلمه عبور وارد شده نادرست است!");
      }
      applyUserSession(matched);
    } else {
      // اگر کاربر در لیست نبود ولی با نام وارد شد
      applyUserSession({
        name: username.trim(),
        position: "کاربر عمومی",
        username: username.trim(),
      });
    }
  };

  const applyUserSession = (person: Person) => {
    const nextCurrentUser = {
      name: person.name,
      position: person.position,
      username: person.username || person.name,
      phone: person.phone,
    };

    updateSettings({
      ...db.settings,
      currentUser: nextCurrentUser,
    });

    try {
      localStorage.setItem("ptw_user_session", JSON.stringify(nextCurrentUser));
    } catch {
      // ignore
    }

    toast.success(`با موفقیت به عنوان «${person.name}» (${person.position}) وارد شدید.`);
    setUsername("");
    setPassword("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md dir-rtl text-right">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2.5 text-primary">
              <LogIn className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                احراز هویت و ورود به حساب کاربری
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                ورود تخصصی مسئولین و مدیران بر اساس نقش سازمانی در سامانه PTW
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4 py-2">
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <User className="size-3.5 text-primary" />
                نام کاربری یا نام مسئول
              </Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثلاً: hse_user یا مهندس احمدی"
                className="mt-1 font-sans"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Lock className="size-3.5 text-primary" />
                کلمه عبور ورود
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="کلمه عبور (پیش‌فرض: 123)"
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-primary font-bold shadow gap-2">
            <LogIn className="size-4" />
            ورود به سیستم
          </Button>
        </form>

        {/* لیست میانبر مسئولین مجاز */}
        {people.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3.5 text-amber-500" />
              ورود سریع با نقش‌های تعریف‌شده در سیستم:
            </span>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {people.map((p, idx) => {
                const isCurrent = db.settings.currentUser.name === p.name;
                return (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => applyUserSession(p)}
                    className={`w-full flex items-center justify-between rounded-md border p-2 text-xs transition-all text-right ${
                      isCurrent
                        ? "border-primary bg-primary/10 font-bold"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck
                        className={`size-4 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <div>
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.position}</div>
                      </div>
                    </div>
                    {isCurrent ? (
                      <Badge variant="default" className="text-[10px]">
                        کاربر جاری
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {p.username || "کاربر"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between border-t pt-3">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldAlert className="size-3.5 text-emerald-600" />
            رمزهای عبور در تنظیمات قابل ویرایش است
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
