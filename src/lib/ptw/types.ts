export type PermitTypeId =
  "hot" | "height" | "confined" | "cold" | "excavation" | "electrical" | "custom";

export type PermitStatus =
  | "draft"
  | "pending_supervisor"
  | "pending_hse"
  | "pending_area_owner"
  | "approved"
  | "rejected"
  | "expired"
  | "pending"
  | "active"
  | "suspended"
  | "cancelled"
  | "closed";

export type SignatureDecision = "approved" | "rejected";

export interface PermitApproval {
  id: string;
  permit_id: string;
  user_id?: string;
  signer_name: string;
  role: string;
  status: "approved" | "rejected" | "pending";
  comment?: string;
  signed_at: string;
  token?: string;
  verification_hash?: string;
  otp_verified?: boolean;
}

export type MessengerChannel = "eitaa" | "bale" | "whatsapp" | "telegram" | "sms" | "simulator";

export interface Person {
  id?: string;
  name: string;
  position: string;
  pin?: string;
  username?: string;
  password?: string;
  phone?: string;
  messengerType?: MessengerChannel;
  messengerTarget?: string; // شناسه یا شماره در پیام‌رسان
  savedSignatureUrl?: string; // امضای ذخیره‌شده دیجیتالی
}

export interface OtpConfig {
  enabled: boolean;
  digits: 4 | 6;
  expirySeconds: number;
  defaultChannel: MessengerChannel;
  webhookUrl?: string;
  customMessageTemplate?: string;
}

export interface AuthConfig {
  requireLogin: boolean;
  autoPrefillSignature: boolean;
}

export interface StepSignature {
  stepId: string;
  decision: SignatureDecision;
  name: string;
  position: string;
  comment?: string;
  signatureDataUrl?: string;
  at: string; // ISO
  verificationHash?: string; // SHA-256 cryptographic digest
  verifiedPin?: boolean; // آیا PIN تایید شده است؟
  verifiedOtp?: boolean; // آیا کد احراز هویت OTP پیام‌رسان تایید شده است؟
  otpChannel?: MessengerChannel; // پیام‌رسانی که کد به آن ارسال شد
  deviceSignatureToken?: string; // کد امنیتی دستگاه/مرورگر
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
  approvals?: PermitApproval[];
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
  people: Person[];
  workflow: WorkflowStep[];
  defaultDurationHours: Record<PermitTypeId, number>;
  currentUser: { name: string; position: string; username?: string; phone?: string };
  otpConfig?: OtpConfig;
  authConfig?: AuthConfig;
  n8nWebhookUrl?: string;
  n8nApiKey?: string;
}

export interface PtwDatabase {
  version: number;
  permits: Permit[];
  settings: Settings;
  /** زمان آخرین تغییر تنظیمات — برای ادغام چندکاربره */
  settingsUpdatedAt?: string;
}
