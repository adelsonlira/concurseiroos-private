/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WeeklyAvailabilityDay {
  /** 0 = Sunday, 1 = Monday, ..., 6 = Saturday. */
  dayOfWeek: number;
  enabled: boolean;
  totalMinutes: number;
}

export interface AvailabilityOverride {
  /** Calendar date in YYYY-MM-DD. */
  date: string;
  totalMinutes: number;
  reason?: string;
}

export interface StudyAvailabilityConfig {
  /** IANA time zone used only to label the user's study day. */
  timeZone: string;
  /** Whether the available window already includes planner breaks. */
  includesBreaks: boolean;
  weekly: WeeklyAvailabilityDay[];
  overrides: AvailabilityOverride[];
}

export interface CompletedStudyTime {
  id: string;
  /** Calendar date in the same local study calendar, YYYY-MM-DD. */
  date: string;
  minutes: number;
  countsAgainstAvailability: boolean;
}

export interface DailyAvailabilityResult {
  date: string;
  scheduledMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  includesBreaks: boolean;
  source: "WEEKLY_SCHEDULE" | "DATE_OVERRIDE";
  overrideReason: string | null;
}
