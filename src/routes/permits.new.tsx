import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePtwDb } from "@/lib/ptw/use-ptw";
import {
  PERMIT_TYPES,
  HAZARDS_BY_TYPE,
  CONTROLS_BY_TYPE,
  PPE_OPTIONS,
  ENERGY_SOURCES,
  buildChecklist,
} from "@/lib/ptw/defaults";
import { JalaliDateTimeInput } from "@/components/ptw/jalali-datetime-input";
import { fromLocalInput, toLocalInput, jalaliYear } from "@/lib/ptw/date";
import { evt, nextPermitNumber, uid } from "@/lib/ptw/workflow";
import type { ChecklistAnswer, GasReading, LotoLock, Permit, PermitTypeId } from "@/lib/ptw/types";

export const Route = createFileRoute("/permits/new")({
  head: () => ({
    meta: [
      { title: "صدور مجوز کار جدید | سامانه PTW" },
      {
        name: "description",
        content:
          "ثبت مجوز کار گرم، ارتفاع، فضای بسته، حفاری، برق و LOTO همراه با چک‌لیست خطرات و اقدامات کنترلی.",
      },
      { property: "og:title", content: "صدور مجوز کار جدید | سامانه PTW" },
      {
        property: "og:description",
        content: "فرم صدور مجوز کار با چک‌لیست خطرات، گازسنجی و قفل و برچسب.",
      },
    ],
  }),
  component: NewPermit,
});

const TriState = ({
  item,
  onChange,
}: {
  item: ChecklistAnswer;
  onChange: (v: ChecklistAnswer["value"]) => void;
}) => (
  <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
    <span className="text-sm">{item.label}</span>
    <div className="flex shrink-0 gap-1">
      {(
        [
          ["yes", "بله"],
          ["no", "خیر"],
          ["na", "ن.م"],
        ] as const
      ).map(([v, label]) => (
        <Button
          key={v}
          type="button"
          size="sm"
          variant={item.value === v ? "default" : "outline"}
          className="h-7 px-2 text-xs"
          onClick={() => onChange(item.value === v ? null : v)}
        >
          {label}
        </Button>
      ))}
    </div>
  </div>
);

function NewPermit() {
  const { db, ready, upsertPermit } = usePtwDb();
  const navigate = useNavigate();

  const [type, setType] = useState<PermitTypeId>("hot");
  const [customTypeTitle, setCustomTypeTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [contractor, setContractor] = useState("");
  const [workers, setWorkers] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [startAt, setStartAt] = useState(toLocalInput(new Date().toISOString()));
  const [endAt, setEndAt] = useState("");
  const [hazards, setHazards] = useState<ChecklistAnswer[]>([]);
  const [controls, setControls] = useState<ChecklistAnswer[]>([]);
  const [extraHazard, setExtraHazard] = useState("");
  const [extraControl, setExtraControl] = useState("");
  const [ppe, setPpe] = useState<string[]>([]);
  const [gasReadings, setGasReadings] = useState<GasReading[]>([]);
  const [specialConditions, setSpecialConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [hasLoto, setHasLoto] = useState(false);
  const [locks, setLocks] = useState<LotoLock[]>([]);

  useEffect(() => {
    setHazards(buildChecklist(HAZARDS_BY_TYPE[type]));
    setControls(buildChecklist(CONTROLS_BY_TYPE[type]));
    setHasLoto(type === "electrical" || type === "confined");
  }, [type]);

  useEffect(() => {
    if (!ready || !startAt) return;
    const hours = db.settings.defaultDurationHours[type] ?? 8;
    const end = new Date(new Date(startAt).getTime() + hours * 36e5);
    setEndAt(toLocalInput(end.toISOString()));
  }, [type, startAt, ready, db.settings.defaultDurationHours]);

  const number = useMemo(() => nextPermitNumber(db.permits, jalaliYear()), [db.permits]);

  const addLock = () =>
    setLocks((l) => [
      ...l,
      {
        id: uid(),
        equipment: "",
        panelOrValve: "",
        energySources: [],
        isolationMethod: "",
        lockNumber: "",
        tagNumber: "",
        appliedBy: "",
        appliedAt: new Date().toISOString(),
        zeroEnergyVerified: false,
        released: false,
      },
    ]);

  const patchLock = (id: string, patch: Partial<LotoLock>) =>
    setLocks((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addGas = () =>
    setGasReadings((g) => [
      ...g,
      {
        id: uid(),
        lel: "",
        o2: "",
        h2s: "",
        co: "",
        measuredAt: new Date().toISOString(),
        by: "",
      },
    ]);

  const validate = () => {
    if (type === "custom" && !customTypeTitle.trim()) return "عنوان نوع مجوز را وارد کنید";
    if (!unit) return "واحد یا خط تولید را انتخاب کنید";
    if (!location.trim()) return "محل دقیق کار را وارد کنید";
    if (description.trim().length < 5) return "شرح کار را کامل‌تر بنویسید";
    if (!supervisorName.trim()) return "نام سرپرست کار را وارد کنید";
    if (!workers.trim()) return "اسامی نفرات مجری را وارد کنید";
    if (!startAt || !endAt) return "بازه زمانی اعتبار مجوز را مشخص کنید";
    if (new Date(endAt) <= new Date(startAt)) return "پایان اعتبار باید بعد از شروع باشد";
    if (hasLoto && locks.length === 0) return "حداقل یک قفل LOTO ثبت کنید";
    return null;
  };

  const build = (status: Permit["status"]): Permit => {
    const now = new Date().toISOString();
    const actor = db.settings.currentUser.name || "کاربر سامانه";
    return {
      id: uid(),
      number,
      type,
      customTypeTitle: type === "custom" ? customTypeTitle : undefined,
      status,
      unit,
      location,
      description,
      contractor,
      workers,
      supervisorName,
      startAt: fromLocalInput(startAt),
      endAt: fromLocalInput(endAt),
      hazards,
      controls,
      ppe,
      gasReadings,
      specialConditions,
      notes,
      hasLoto,
      lotoLocks: hasLoto ? locks : [],
      workflow: db.settings.workflow,
      signatures: [],
      currentStepIndex: 0,
      extensions: [],
      events: [
        evt("created", actor, `مجوز ${number} ایجاد شد`),
        ...(status === "pending"
          ? [evt("submitted", actor, "مجوز برای طی مراحل تایید ارسال شد")]
          : []),
      ],
      createdBy: actor,
      createdAt: now,
      updatedAt: now,
    };
  };

  const submit = (status: Permit["status"]) => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    const permit = build(status);
    upsertPermit(permit);
    toast.success(status === "draft" ? "پیش‌نویس ذخیره شد" : "مجوز ثبت و وارد چرخه تایید شد");
    navigate({ to: "/permits/$permitId", params: { permitId: permit.id } });
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">صدور مجوز کار جدید</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            شماره مجوز: <span className="font-mono font-bold">{number}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => submit("draft")}>
            <Save className="size-4" />
            ذخیره پیش‌نویس
          </Button>
          <Button onClick={() => submit("pending")}>
            <Send className="size-4" />
            ارسال برای تایید
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">۱. نوع مجوز</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
            {PERMIT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`rounded-md border p-3 text-center text-sm transition-colors ${
                  type === t.id
                    ? "border-accent bg-accent/20 font-bold text-accent-foreground"
                    : "border-border bg-card hover:border-accent/60"
                }`}
              >
                {t.short}
              </button>
            ))}
          </div>
          {type === "custom" && (
            <div>
              <Label htmlFor="customType">عنوان مجوز (دستی)</Label>
              <Input
                id="customType"
                value={customTypeTitle}
                onChange={(e) => setCustomTypeTitle(e.target.value)}
                placeholder="مثلاً: کار با مواد شیمیایی اسیدشویی"
                maxLength={120}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">۲. اطلاعات کار</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>واحد / خط تولید</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {db.settings.units.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="location">محل دقیق کار</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="مثلاً: پل عبور بالای کوره، ضلع شرقی"
              maxLength={160}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">شرح کامل کار</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="شرح دقیق فعالیت، تجهیزات مورد استفاده و روش اجرا"
            />
          </div>
          <div>
            <Label htmlFor="contractor">پیمانکار / واحد مجری</Label>
            <Input
              id="contractor"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              maxLength={120}
            />
          </div>
          <div>
            <Label htmlFor="supervisor">سرپرست کار</Label>
            <Input
              id="supervisor"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="workers">اسامی نفرات مجری (با ویرگول جدا کنید)</Label>
            <Textarea
              id="workers"
              value={workers}
              onChange={(e) => setWorkers(e.target.value)}
              rows={2}
              maxLength={600}
            />
          </div>
          <div>
            <Label>شروع اعتبار (تاریخ جلالی)</Label>
            <JalaliDateTimeInput value={startAt} onChange={setStartAt} />
          </div>
          <div>
            <Label>پایان اعتبار (تاریخ جلالی)</Label>
            <JalaliDateTimeInput value={endAt} onChange={setEndAt} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">۳. خطرات شناسایی‌شده</CardTitle>
          </CardHeader>
          <CardContent>
            {hazards.map((h) => (
              <TriState
                key={h.id}
                item={h}
                onChange={(v) =>
                  setHazards((hs) => hs.map((x) => (x.id === h.id ? { ...x, value: v } : x)))
                }
              />
            ))}
            <div className="mt-3 flex gap-2">
              <Input
                value={extraHazard}
                onChange={(e) => setExtraHazard(e.target.value)}
                placeholder="افزودن خطر دیگر"
                maxLength={160}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!extraHazard.trim()) return;
                  setHazards((hs) => [
                    ...hs,
                    { id: uid(), label: extraHazard.trim(), value: "yes" },
                  ]);
                  setExtraHazard("");
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">۴. اقدامات کنترلی</CardTitle>
          </CardHeader>
          <CardContent>
            {controls.map((c) => (
              <TriState
                key={c.id}
                item={c}
                onChange={(v) =>
                  setControls((cs) => cs.map((x) => (x.id === c.id ? { ...x, value: v } : x)))
                }
              />
            ))}
            <div className="mt-3 flex gap-2">
              <Input
                value={extraControl}
                onChange={(e) => setExtraControl(e.target.value)}
                placeholder="افزودن اقدام کنترلی"
                maxLength={160}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!extraControl.trim()) return;
                  setControls((cs) => [
                    ...cs,
                    { id: uid(), label: extraControl.trim(), value: "yes" },
                  ]);
                  setExtraControl("");
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">۵. تجهیزات حفاظت فردی</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {PPE_OPTIONS.map((item) => (
            <label
              key={item}
              className="flex cursor-pointer items-center gap-2 rounded border border-border p-2 text-sm"
            >
              <Checkbox
                checked={ppe.includes(item)}
                onCheckedChange={(v) =>
                  setPpe((p) => (v ? [...p, item] : p.filter((x) => x !== item)))
                }
              />
              {item}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">۶. گازسنجی</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addGas}>
            <Plus className="size-4" />
            افزودن سنجش
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {gasReadings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              برای کار گرم و فضای بسته ثبت حداقل یک سنجش الزامی است.
            </p>
          )}
          {gasReadings.map((g) => (
            <div key={g.id} className="grid gap-2 rounded border border-border p-3 md:grid-cols-6">
              {(
                [
                  ["lel", "LEL %"],
                  ["o2", "O₂ %"],
                  ["h2s", "H₂S ppm"],
                  ["co", "CO ppm"],
                ] as const
              ).map(([k, label]) => (
                <div key={k}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={g[k]}
                    onChange={(e) =>
                      setGasReadings((gs) =>
                        gs.map((x) => (x.id === g.id ? { ...x, [k]: e.target.value } : x)),
                      )
                    }
                    inputMode="decimal"
                    maxLength={10}
                  />
                </div>
              ))}
              <div>
                <Label className="text-xs">سنجش توسط</Label>
                <Input
                  value={g.by}
                  onChange={(e) =>
                    setGasReadings((gs) =>
                      gs.map((x) => (x.id === g.id ? { ...x, by: e.target.value } : x)),
                    )
                  }
                  maxLength={80}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setGasReadings((gs) => gs.filter((x) => x.id !== g.id))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">۷. قفل و برچسب (LOTO)</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="loto" className="text-sm font-normal">
              این کار نیاز به LOTO دارد
            </Label>
            <Switch id="loto" checked={hasLoto} onCheckedChange={setHasLoto} />
          </div>
        </CardHeader>
        {hasLoto && (
          <CardContent className="space-y-3">
            {locks.map((l, i) => (
              <div key={l.id} className="space-y-3 rounded border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">قفل شماره {i + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocks((ls) => ls.filter((x) => x.id !== l.id))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label className="text-xs">تجهیز</Label>
                    <Input
                      value={l.equipment}
                      onChange={(e) => patchLock(l.id, { equipment: e.target.value })}
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">شماره تابلو / کلید / شیر</Label>
                    <Input
                      value={l.panelOrValve}
                      onChange={(e) => patchLock(l.id, { panelOrValve: e.target.value })}
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">روش ایزوله</Label>
                    <Input
                      value={l.isolationMethod}
                      onChange={(e) => patchLock(l.id, { isolationMethod: e.target.value })}
                      maxLength={160}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">شماره قفل</Label>
                    <Input
                      value={l.lockNumber}
                      onChange={(e) => patchLock(l.id, { lockNumber: e.target.value })}
                      maxLength={40}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">شماره برچسب</Label>
                    <Input
                      value={l.tagNumber}
                      onChange={(e) => patchLock(l.id, { tagNumber: e.target.value })}
                      maxLength={40}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">قفل‌گذار</Label>
                    <Input
                      value={l.appliedBy}
                      onChange={(e) => patchLock(l.id, { appliedBy: e.target.value })}
                      maxLength={80}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">منابع انرژی</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ENERGY_SOURCES.map((s) => (
                      <label
                        key={s}
                        className="flex cursor-pointer items-center gap-1.5 rounded border border-border px-2 py-1 text-xs"
                      >
                        <Checkbox
                          checked={l.energySources.includes(s)}
                          onCheckedChange={(v) =>
                            patchLock(l.id, {
                              energySources: v
                                ? [...l.energySources, s]
                                : l.energySources.filter((x) => x !== s),
                            })
                          }
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={l.zeroEnergyVerified}
                    onCheckedChange={(v) => patchLock(l.id, { zeroEnergyVerified: Boolean(v) })}
                  />
                  تست انرژی صفر انجام و تایید شد
                </label>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addLock}>
              <Plus className="size-4" />
              افزودن قفل
            </Button>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">۸. شرایط خاص و ملاحظات</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="special">شرایط خاص</Label>
            <Textarea
              id="special"
              rows={3}
              value={specialConditions}
              onChange={(e) => setSpecialConditions(e.target.value)}
              maxLength={800}
              placeholder="مثلاً: کار در شیفت شب، همزمانی با توقف خط، شرایط جوی، حضور همزمان چند پیمانکار"
            />
          </div>
          <div>
            <Label htmlFor="notes">ملاحظات و دستورالعمل‌های تکمیلی</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={800}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => submit("draft")}>
          <Save className="size-4" />
          ذخیره پیش‌نویس
        </Button>
        <Button onClick={() => submit("pending")}>
          <Send className="size-4" />
          ارسال برای تایید
        </Button>
      </div>
    </div>
  );
}
