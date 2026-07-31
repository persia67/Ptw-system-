import type { Permit, PermitEvent, WorkflowStep } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const evt = (
  kind: PermitEvent["kind"],
  actor: string,
  description: string,
): PermitEvent => ({
  id: uid(),
  at: new Date().toISOString(),
  kind,
  actor,
  description,
});

/** مراحل موثر برای این مجوز بر اساس نوع و وجود LOTO */
export function effectiveSteps(permit: Permit): WorkflowStep[] {
  return permit.workflow.filter((s) => {
    if (s.onlyIfLoto && !permit.hasLoto) return false;
    if (s.onlyForTypes.length > 0 && !s.onlyForTypes.includes(permit.type)) return false;
    return true;
  });
}

export function currentStep(permit: Permit): WorkflowStep | undefined {
  return effectiveSteps(permit)[permit.currentStepIndex];
}

export function progress(permit: Permit) {
  const steps = effectiveSteps(permit);
  const done = steps.filter((s) =>
    permit.signatures.some((sig) => sig.stepId === s.id && sig.decision === "approved"),
  ).length;
  return { done, total: steps.length, percent: steps.length ? (done / steps.length) * 100 : 0 };
}

export function openLotoLocks(permit: Permit) {
  return permit.lotoLocks.filter((l) => !l.released);
}

export function canClose(permit: Permit) {
  if (permit.status !== "active" && permit.status !== "suspended") return false;
  return openLotoLocks(permit).length === 0;
}

export function nextPermitNumber(existing: Permit[], jYear: number) {
  const prefix = `PTW-${jYear}-`;
  const max = existing
    .filter((p) => p.number.startsWith(prefix))
    .map((p) => Number(p.number.slice(prefix.length)) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}
