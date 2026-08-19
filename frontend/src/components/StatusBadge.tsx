import { JobStatus } from "../types";

const STYLES: Record<JobStatus, string> = {
  NOT_STARTED: "bg-hairline/40 text-slate",
  PROCESSING: "bg-amber-light text-amber",
  FORM_FILLED: "bg-indigo-light text-indigo",
  READY_FOR_SUBMISSION: "bg-amber-light text-amber",
  SCREENSHOT_CAPTURED: "bg-teal-light text-teal",
  FAILED: "bg-signal-light text-signal",
};

const DOT_STYLES: Record<JobStatus, string> = {
  NOT_STARTED: "bg-slate",
  PROCESSING: "bg-amber animate-pulse",
  FORM_FILLED: "bg-indigo",
  READY_FOR_SUBMISSION: "bg-amber",
  SCREENSHOT_CAPTURED: "bg-teal",
  FAILED: "bg-signal",
};

const LABELS: Record<JobStatus, string> = {
  NOT_STARTED: "not_started",
  PROCESSING: "processing",
  FORM_FILLED: "form_filled",
  READY_FOR_SUBMISSION: "ready_for_submission",
  SCREENSHOT_CAPTURED: "verified",
  FAILED: "failed",
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11px] tracking-tight ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[status]}`} />
      {LABELS[status]}
    </span>
  );
}
