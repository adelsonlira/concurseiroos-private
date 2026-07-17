export interface OnboardingContext {
  competitionSelected: boolean;
  examDateKnown: boolean;
  availabilityConfigured: boolean;
  hasMaterialLocator: boolean;
  hasQuestionSource: boolean;
  backupConfigured: boolean;
}

export interface OnboardingStep {
  id: string;
  label: string;
  status: "DONE" | "AUTO_DEFAULTED" | "REQUIRED";
  action: string;
  studentDecisionRequired: boolean;
}

export interface OnboardingPlan {
  readyToStudy: boolean;
  primaryInstruction: string;
  steps: OnboardingStep[];
}
