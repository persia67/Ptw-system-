export type PermitTypeId =
  "hot" | "height" | "confined" | "cold" | "excavation" | "electrical" | "custom";

export type PermitStatus = "draft" | "pending" | "active" | "suspended" | "cancelled" | "closed";

export type SignatureDecision = "approved" | "rejected";

export interface StepSignature {
  stepId: string;
  decision: SignatureDecision;
  name: string;
  position: string;
  comment?: string;
  signatureDataUrl?: string;
  at: string; // ISO
}

export interface WorkflowStep {
  id: string;
  title: string;
  roleTitle: string;
  required: boolean;
  /** فقط برای این انواع مجوز اعمال شود؛ خالی یعنی همه */
  onlyForTypes: PermitTypeId[];
  /** فقط وقتی مجوز دارای LOTO است */
  onlyIfLoto?: boolean;
}

export interface ChecklistAnswer {
  id: string;
  label: string;
  value: "yes" | "no" | "na" | null;
}

export interface GasReading {
  id: string;
  lel: string;
  o2: string;
  h2s: string;
  co: string;
  measuredAt: string;
  by: string;
}

export interface LotoLock {
  id: string;
  equipment: string;
  panelOrValve: string;
  energySources: string[];
  isolationMethod: string;
  lockNumber: string;
  tagNumber: string;
  appliedBy: string;
  appliedAt: string;
  zeroEnergyVerified: boolean;
  zeroEnergyBy?: string;
  released: boolean;
  releasedBy?: string;
  releasedAt?: string;
  releaseNote?: string;
  hseReleaseBy?: string;
}

export interface PermitEvent {
  id: string;
  at: string;
  kind:
    | "created"
    | "submitted"
    | "approved"
    | "rejected"
    | "issued"
    | "extended"
    | "suspended"
    | "resumed"
    | "cancelled"
    | "closed"
    | "loto_applied"
    | "loto_released"
    | "note";
  actor: string;
  description: string;
}

export interface Extension {
  id: string;
  newEndAt: string;
  reason: string;
  requestedBy: string;
  approvedBy: string;
  at: string;
}

export interface Permit {
  id: string;
  number: string;
  type: PermitTypeId;
  customTypeTitle?: string;
  status: PermitStatus;

  unit: string;
  location: string;
  description: string;
  contractor: string;
  workers: string;
  supervisorName: string;

  startAt: string;
  endAt: string;

  hazards: ChecklistAnswer[];
  controls: ChecklistAnswer[];
  ppe: string[];
  gasReadings: GasReading[];
  specialConditions: string;
  notes: string;

  hasLoto: boolean;
  lotoLocks: LotoLock[];

  workflow: WorkflowStep[];
  signatures: StepSignature[];
  currentStepIndex: number;

  extensions: Extension[];
  suspension?: { reason: string; by: string; at: string };
  cancellation?: { reason: string; by: string; at: string };
  closure?: {
    by: string;
    at: string;
    siteHandedOver: boolean;
    areaClean: boolean;
    note: string;
  };

  events: PermitEvent[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  companyName: string;
  plantName: string;
  units: string[];
  people: { name: string; position: string }[];
  workflow: WorkflowStep[];
  defaultDurationHours: Record<PermitTypeId, number>;
  currentUser: { name: string; position: string };
}

export interface PtwDatabase {
  version: number;
  permits: Permit[];
  settings: Settings;
  /** زمان آخرین تغییر تنظیمات — برای ادغام چندکاربره */
  settingsUpdatedAt?: string;
}
