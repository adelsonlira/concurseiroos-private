import type { StrategicAction } from "../sde/prioritization/types";
import type { SDEApplicationResult } from "../../integrations/sde/types";

export interface WeeklyOutlookAction {
  actionId: string;
  tipo: StrategicAction["tipo"];
  reasonCode: StrategicAction["reasonCode"];
  disciplinaId: string;
  disciplinaNome: string;
  assuntoId: string;
  assuntoNome: string;
  subassuntoId?: string;
  subassuntoNome?: string;
  durationMinutes: number;
  diagnosticPurpose: boolean;
  reason: string;
}

export interface WeeklyOutlookDay {
  date: string;
  status: "REST_DAY" | "NO_TIME_AVAILABLE" | "INVALID_INPUT" | "PROVISIONAL";
  scheduledMinutes: number;
  remainingMinutes: number;
  primary: WeeklyOutlookAction | null;
  supporting: WeeklyOutlookAction[];
  notes: string[];
}

export interface WeeklyOutlook {
  referenceDate: string;
  endDate: string;
  days: WeeklyOutlookDay[];
  totalScheduledMinutes: number;
  totalRemainingMinutes: number;
  activeDays: number;
  caveats: string[];
}

export interface WeeklyOutlookInput {
  referenceDate: string;
  numberOfDays?: number;
  decisionForDate: (date: string) => SDEApplicationResult;
}
