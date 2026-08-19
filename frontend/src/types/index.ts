export type JobStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "FORM_FILLED"
  | "READY_FOR_SUBMISSION"
  | "SCREENSHOT_CAPTURED"
  | "FAILED";

export interface Job {
  id: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  jobUrl: string;
  applicationUrl: string;
  source: string;
  status: JobStatus;
  failureReason: string | null;
  screenshotPath: string | null;
  createdAt: string;
  updatedAt: string;
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
}
