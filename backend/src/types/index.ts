export enum JobStatus {
  NOT_STARTED = "NOT_STARTED",
  PROCESSING = "PROCESSING",
  FORM_FILLED = "FORM_FILLED",
  READY_FOR_SUBMISSION = "READY_FOR_SUBMISSION",
  SCREENSHOT_CAPTURED = "SCREENSHOT_CAPTURED",
  FAILED = "FAILED",
}

export interface CandidateProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  education?: string;
  experience?: string;
  skills?: string[];
  resumePath: string;
  coverLetter?: string;
  // Fallback answers used for free-text questions the automation cannot
  // otherwise map with confidence (best-effort only, never guesses on
  // sensitive/legal questions such as EEO/demographic data).
  defaultAnswers?: Record<string, string>;
}

export interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  content?: string;
  updated_at: string;
  departments?: { name: string }[];
}

export interface AutomationResult {
  status: JobStatus;
  screenshotPath?: string;
  failureReason?: string;
}
