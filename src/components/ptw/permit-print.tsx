import { toJalaliDateTime, toJalali, fa } from "@/lib/ptw/date";
import { permitTypeTitle, STATUS_LABEL } from "@/lib/ptw/defaults";
import { effectiveSteps } from "@/lib/ptw/workflow";
import type { Permit, Settings } from "@/lib/ptw/types";

const Cell = ({ label, value }: { label: string; value?: string }) => (
  <div className="border border-black/60 p-1.5">
    <div className="text-[8pt] text-black/60">{label}</div>
    <div className="text-[9.5pt] font-medium">{value || "—"}</div>
  </div>
);

const yesNo = (v: "yes" | "no" | "na" | null) =>
  v === "yes" ? "بله" : v === "no" ? "خیر" : v === "na" ? "ن.م" : "—";

export function PermitPrintSheet({ permit, settings }: { permit: Permit; settings: Settings }) {
  const steps = effectiveSteps(permit);

  return (
    <div className="print-sheet mx-auto max-w-[210mm] bg-white p-6 text-black shadow-sm">
      <div className="flex items-start justify-between border-b-2 border-black pb-2">
        <div>
          <div className="text-[13pt] font-bold">{settings.companyName}</div>
          <div className="text-[9pt]">{settings.plantName} — واحد ایمنی و بهداشت حرفه‌ای</div>
        </div>
        <div className="text-center">
          <div className="text-[12pt] font-bold">مجوز کار (Permit To Work)</div>
          <div className="text-[9pt]">{permitTypeTitle(permit.type, permit.customTypeTitle)}</div>
        </div>
        <div className="text-left text-[9pt]">
          <div>
            شماره: <span className="font-bold">{permit.number}</span>
          </div>
          <div>تاریخ صدور: {toJalali(permit.createdAt)}</div>
          <div>وضعیت: {STATUS_LABEL[permit.status]}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-0">
        <Cell label="واحد / خط تولید" value={permit.unit} />
        <Cell label="محل دقیق کار" value={permit.location} />
        <Cell label="پیمانکار / واحد مجری" value={permit.contractor} />
        <Cell label="سرپرست کار" value={permit.supervisorName} />
        <div className="col-span-4">
          <Cell label="شرح کامل کار" value={permit.description} />
        </div>
        <div className="col-span-2">
          <Cell label="اسامی نفرات مجری" value={permit.workers} />
        </div>
        <Cell label="شروع اعتبار" value={toJalaliDateTime(permit.startAt)} />
        <Cell label="پایان اعتبار" value={toJalaliDateTime(permit.endAt)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="bg-black/85 px-2 py-1 text-[9pt] font-bold text-white">
            خطرات شناسایی‌شده
          </div>
          <table className="w-full border-collapse text-[8.5pt]">
            <tbody>
              {permit.hazards.map((h) => (
                <tr key={h.id}>
                  <td className="border border-black/50 p-1">{h.label}</td>
                  <td className="w-12 border border-black/50 p-1 text-center">{yesNo(h.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="bg-black/85 px-2 py-1 text-[9pt] font-bold text-white">
            اقدامات کنترلی الزامی
          </div>
          <table className="w-full border-collapse text-[8.5pt]">
            <tbody>
              {permit.controls.map((c) => (
                <tr key={c.id}>
                  <td className="border border-black/50 p-1">{c.label}</td>
                  <td className="w-12 border border-black/50 p-1 text-center">{yesNo(c.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3">
        <div className="bg-black/85 px-2 py-1 text-[9pt] font-bold text-white">
          تجهیزات حفاظت فردی الزامی
        </div>
        <div className="border border-black/50 p-1.5 text-[9pt]">
          {permit.ppe.length ? permit.ppe.join(" • ") : "—"}
        </div>
      </div>

      {permit.gasReadings.length > 0 && (
        <div className="mt-3">
          <div className="bg-black/85 px-2 py-1 text-[9pt] font-bold text-white">نتایج گازسنجی</div>
          <table className="w-full border-collapse text-[8.5pt]">
            <thead>
              <tr>
                {["LEL %", "O₂ %", "H₂S ppm", "CO ppm", "زمان سنجش", "سنجش توسط"].map((h) => (
                  <th key={h} className="border border-black/50 p-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permit.gasReadings.map((g) => (
                <tr key={g.id} className="text-center">
                  <td className="border border-black/50 p-1">{g.lel || "—"}</td>
                  <td className="border border-black/50 p-1">{g.o2 || "—"}</td>
                  <td className="border border-black/50 p-1">{g.h2s || "—"}</td>
                  <td className="border border-black/50 p-1">{g.co || "—"}</td>
                  <td className="border border-black/50 p-1">
                    {g.measuredAt ? toJalaliDateTime(g.measuredAt) : "—"}
                  </td>
                  <td className="border border-black/50 p-1">{g.by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {permit.hasLoto && (
        <div className="mt-3">
          <div className="bg-black/85 px-2 py-1 text-[9pt] font-bold text-white">
            قفل و برچسب (LOTO)
          </div>
          <table className="w-full border-collapse text-[8.5pt]">
            <thead>
              <tr>
                {[
                  "تجهیز",
                  "تابلو/شیر",
                  "منابع انرژی",
                  "روش ایزوله",
                  "ش. قفل",
                  "ش. برچسب",
                  "قفل‌گذار",
                  "انرژی صفر",
                  "وضعیت",
                ].map((h) => (
                  <th key={h} className="border border-black/50 p-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permit.lotoLocks.map((l) => (
                <tr key={l.id} className="text-center">
                  <td className="border border-black/50 p-1">{l.equipment}</td>
                  <td className="border border-black/50 p-1">{l.panelOrValve}</td>
                  <td className="border border-black/50 p-1">{l.energySources.join("، ")}</td>
                  <td className="border border-black/50 p-1">{l.isolationMethod}</td>
                  <td className="border border-black/50 p-1">{l.lockNumber}</td>
                  <td className="border border-black/50 p-1">{l.tagNumber}</td>
                  <td className="border border-black/50 p-1">{l.appliedBy}</td>
                  <td className="border border-black/50 p-1">
                    {l.zeroEnergyVerified ? "تایید شد" : "تایید نشده"}
                  </td>
                  <td className="border border-black/50 p-1">
                    {l.released ? `باز شد ${toJalaliDateTime(l.releasedAt)}` : "قفل فعال"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(permit.specialConditions || permit.notes) && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Cell label="شرایط خاص" value={permit.specialConditions} />
          <Cell label="ملاحظات" value={permit.notes} />
        </div>
      )}

      <div className="mt-3">
        <div className="bg-black/85 px-2 py-1 text-[9pt] font-bold text-white">
          زنجیره تاییدها و امضاها
        </div>
        <table className="w-full border-collapse text-[8.5pt]">
          <thead>
            <tr>
              {["مرحله", "سمت", "نام و نام خانوادگی", "تاریخ و ساعت", "نتیجه", "امضا"].map((h) => (
                <th key={h} className="border border-black/50 p-1">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => {
              const sig = permit.signatures.find((x) => x.stepId === s.id);
              return (
                <tr key={s.id}>
                  <td className="border border-black/50 p-1">
                    {fa(i + 1)}. {s.title}
                  </td>
                  <td className="border border-black/50 p-1">{s.roleTitle}</td>
                  <td className="border border-black/50 p-1">{sig?.name ?? ""}</td>
                  <td className="border border-black/50 p-1 text-center">
                    {sig ? toJalaliDateTime(sig.at) : ""}
                  </td>
                  <td className="border border-black/50 p-1 text-center">
                    {sig ? (sig.decision === "approved" ? "تایید" : "رد") : ""}
                  </td>
                  <td className="h-12 w-24 border border-black/50 p-1 text-center">
                    {sig?.signatureDataUrl ? (
                      <img
                        src={sig.signatureDataUrl}
                        alt="امضا"
                        className="mx-auto h-10 object-contain"
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {permit.extensions.length > 0 && (
        <div className="mt-3">
          <div className="bg-black/85 px-2 py-1 text-[9pt] font-bold text-white">تمدیدها</div>
          <table className="w-full border-collapse text-[8.5pt]">
            <tbody>
              {permit.extensions.map((e) => (
                <tr key={e.id}>
                  <td className="border border-black/50 p-1">
                    تمدید تا {toJalaliDateTime(e.newEndAt)}
                  </td>
                  <td className="border border-black/50 p-1">دلیل: {e.reason}</td>
                  <td className="border border-black/50 p-1">تایید: {e.approvedBy}</td>
                  <td className="border border-black/50 p-1">{toJalaliDateTime(e.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {permit.cancellation && (
        <div className="mt-3 border-2 border-black p-2 text-[9pt]">
          <span className="font-bold">این مجوز باطل شده است.</span> دلیل:{" "}
          {permit.cancellation.reason} — توسط {permit.cancellation.by} در{" "}
          {toJalaliDateTime(permit.cancellation.at)}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-0">
        <Cell
          label="تحویل محل کار پس از اتمام"
          value={permit.closure ? (permit.closure.siteHandedOver ? "انجام شد" : "خیر") : "—"}
        />
        <Cell
          label="پاکسازی و جمع‌آوری ابزار"
          value={permit.closure ? (permit.closure.areaClean ? "انجام شد" : "خیر") : "—"}
        />
        <Cell
          label="بستن مجوز"
          value={
            permit.closure ? `${permit.closure.by} — ${toJalaliDateTime(permit.closure.at)}` : "—"
          }
        />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-black/40 pt-2 text-[8pt] text-black/70">
        <span>کد یکتای مجوز: {permit.number}</span>
        <span>این فرم بدون امضای واحد HSE و مدیریت فاقد اعتبار است.</span>
      </div>
    </div>
  );
}
