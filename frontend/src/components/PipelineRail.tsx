import { JobStatus } from "../types";

const STAGES: { key: JobStatus; label: string }[] = [
  { key: "NOT_STARTED", label: "Queued" },
  { key: "PROCESSING", label: "Launched" },
  { key: "FORM_FILLED", label: "Filled" },
  { key: "READY_FOR_SUBMISSION", label: "Reviewed" },
  { key: "SCREENSHOT_CAPTURED", label: "Verified" },
];

const STAGE_ORDER: JobStatus[] = STAGES.map((s) => s.key);

/**
 * Renders the job's real status enum as a horizontal pipeline rail — a
 * segmented track that fills up to the job's current stage. A failure
 * branches the rail off in signal-red at the stage it stalled on, instead
 * of pretending progress that didn't happen. This is the one place the
 * dashboard visualizes the automation's actual state machine, not just a
 * decorative progress bar.
 */
export default function PipelineRail({ status }: { status: JobStatus }) {
  const isFailed = status === "FAILED";
  // For a failed job we don't know which stage it stalled at from the enum
  // alone (that's carried in the failure reason text), so render the rail
  // as "attempted, then broke" rather than guessing a specific stage.
  const currentIndex = isFailed ? 0 : STAGE_ORDER.indexOf(status);

  return (
    <div className="flex items-center gap-1" aria-label={`Pipeline stage: ${status}`}>
      {STAGES.map((stage, i) => {
        const reached = !isFailed && i <= currentIndex;
        const isFailedSegment = isFailed && i === 0;
        return (
          <div
            key={stage.key}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              isFailedSegment
                ? "bg-signal"
                : reached
                ? "bg-indigo"
                : "bg-hairline"
            }`}
            title={stage.label}
          />
        );
      })}
    </div>
  );
}
